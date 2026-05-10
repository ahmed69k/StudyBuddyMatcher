import { publishDomainEvent, publishNotification } from "../kafka/producer.js";

/** GraphQL exposes dates as `String!`; coerce Prisma `Date` so stitched gateway + browsers always get ISO-8601. */
const toIsoString = (value) => {
  if (value == null) return value;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "number" && Number.isFinite(value)) {
    return new Date(value).toISOString();
  }
  return typeof value === "string" ? value : String(value);
};

/** Requires a logged-in user (`context.user` from JWT); throws otherwise. */
const assertAuthenticated = (context) => {
  if (!context?.user) throw new Error("Not authenticated");
};

/** Ensures the caller’s JWT identity matches `userId` so users cannot read or change another account’s data. */
const assertSelf = (context, userId) => {
  assertAuthenticated(context);
  if (String(context.user.id) !== String(userId)) throw new Error("Not authorized");
};

/** Maps partial `UpdateSessionInput` to a Prisma `data` object; only set fields are updated. */
const buildSessionUpdateData = (input) => {
  const data = {};
  if (input.topic !== undefined && input.topic !== null) data.topic = input.topic;
  if (input.description !== undefined) data.description = input.description;
  if (input.dateTime !== undefined && input.dateTime !== null) data.dateTime = new Date(input.dateTime);
  if (input.duration !== undefined && input.duration !== null) data.duration = input.duration;
  if (input.sessionType !== undefined && input.sessionType !== null) data.sessionType = input.sessionType;
  if (input.contactInfo !== undefined) data.contactInfo = input.contactInfo;
  return data;
};

/**
 * If legacy data has no `SessionParticipant` for the host, creates it so participant lists are always consistent.
 */
const ensureCreatorIsParticipant = async (prisma, session) => {
  if (!session) return session;
  const cid = String(session.creatorId);
  const hasCreator = session.participants.some((p) => String(p.userId) === cid);
  if (hasCreator) return session;
  await prisma.sessionParticipant.create({
    data: { sessionId: session.id, userId: session.creatorId },
  });
  return prisma.studySession.findUnique({
    where: { id: session.id },
    include: { participants: true },
  });
};

/** Puts the session host first in the `participants` array for stable UI ordering. */
const withParticipantsCreatorFirst = (session) => {
  if (!session?.participants?.length) return session;
  const cid = String(session.creatorId);
  const participants = [...session.participants].sort((a, b) => {
    if (String(a.userId) === cid) return -1;
    if (String(b.userId) === cid) return 1;
    return 0;
  });
  return { ...session, participants };
};

const resolvers = {
  StudySession: {
    dateTime: (parent) => toIsoString(parent.dateTime),
    createdAt: (parent) => toIsoString(parent.createdAt),
    updatedAt: (parent) => toIsoString(parent.updatedAt),
    contactInfo: (parent, _, context) => {
      if (!context?.user) return null;
      const uid = String(context.user.id);
      const isHost = String(parent.creatorId) === uid;
      const joined = parent.participants?.some((p) => String(p.userId) === uid);
      if (!isHost && !joined) return null;
      return parent.contactInfo ?? null;
    },
    viewerIsHost: (parent, _, context) => {
      assertAuthenticated(context);
      return String(parent.creatorId) === String(context.user.id);
    },
    viewerHasJoined: (parent, _, context) => {
      assertAuthenticated(context);
      const uid = String(context.user.id);
      return parent.participants?.some((p) => String(p.userId) === uid) ?? false;
    },
    viewerInvitePending: async (parent, _, context) => {
      assertAuthenticated(context);
      const uid = String(context.user.id);
      if (String(parent.creatorId) === uid) return false;
      if (parent.participants?.some((p) => String(p.userId) === uid)) return false;
      const row = await context.prisma.studySessionInvite.findUnique({
        where: { sessionId_inviteeUserId: { sessionId: parent.id, inviteeUserId: uid } },
      });
      return !!row;
    },
  },
  SessionParticipant: {
    joinedAt: (parent) => toIsoString(parent.joinedAt),
  },
  Query: {
    /** Returns one session if the caller is host or participant; normalizes creator-as-participant. */
    session: async (_, { id }, context) => {
      const { prisma } = context;
      assertAuthenticated(context);
      const uid = String(context.user.id);
      const session = await prisma.studySession.findUnique({
        where: { id },
        include: { participants: true },
      });
      if (!session) return null;
      const isCreator = String(session.creatorId) === uid;
      const isParticipant = session.participants.some((p) => String(p.userId) === uid);
      const pendingInvite = await prisma.studySessionInvite.findUnique({
        where: { sessionId_inviteeUserId: { sessionId: id, inviteeUserId: uid } },
      });
      if (!isCreator && !isParticipant && !pendingInvite) throw new Error("Not authorized");
      const normalized = await ensureCreatorIsParticipant(prisma, session);
      return withParticipantsCreatorFirst(normalized);
    },
    /** All sessions the current user created or joined, ordered by start time. */
    sessions: async (_, __, context) => {
      const { prisma } = context;
      assertAuthenticated(context);
      const uid = String(context.user.id);
      const list = await prisma.studySession.findMany({
        where: {
          OR: [
            { creatorId: uid },
            { participants: { some: { userId: uid } } },
            { invites: { some: { inviteeUserId: uid } } },
          ],
        },
        include: { participants: true },
        orderBy: { dateTime: "asc" },
      });
      const out = [];
      for (const s of list) {
        const normalized = await ensureCreatorIsParticipant(prisma, s);
        out.push(withParticipantsCreatorFirst(normalized));
      }
      return out;
    },
    /**
     * Splits “my created” vs “my joined (other people’s)” sessions for dashboard-style UIs; `userId` must be the caller.
     */
    sessionsByUser: async (_, { userId }, context) => {
      const { prisma } = context;
      assertSelf(context, userId);
      const uid = String(userId);
      const created = await prisma.studySession.findMany({
        where: { creatorId: uid },
        include: { participants: true },
      });
      const joinedIds = await prisma.sessionParticipant
        .findMany({
          where: { userId: uid },
          select: { sessionId: true },
        })
        .then((rows) => rows.map((row) => row.sessionId));

      const joined = await prisma.studySession.findMany({
        where: { id: { in: joinedIds }, creatorId: { not: uid } },
        include: { participants: true },
      });

      const invited = await prisma.studySession.findMany({
        where: {
          invites: { some: { inviteeUserId: uid } },
          creatorId: { not: uid },
        },
        include: { participants: true },
      });

      const combined = [...created, ...joined, ...invited];
      const byId = new Map();
      for (const s of combined) {
        byId.set(s.id, s);
      }
      const deduped = [...byId.values()].sort(
        (a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime(),
      );
      const out = [];
      for (const s of deduped) {
        const normalized = await ensureCreatorIsParticipant(prisma, s);
        out.push(withParticipantsCreatorFirst(normalized));
      }
      return out;
    },
  },
  Mutation: {
    /**
     * Persists a new `StudySession`, adds the creator as first participant, emits `StudySessionCreated` + notification.
     */
    createSession: async (_, { input }, context) => {
      const { prisma } = context;
      assertSelf(context, input.creatorId);
      const rawInvites = input.inviteParticipantUserIds ?? [];
      const inviteSet = new Set();
      for (const id of rawInvites) {
        const uid = id != null ? String(id).trim() : "";
        if (uid && uid !== input.creatorId) inviteSet.add(uid);
      }
      const participantCreates = [{ userId: input.creatorId }];

      const session = await prisma.studySession.create({
        data: {
          topic: input.topic,
          description: input.description,
          dateTime: new Date(input.dateTime),
          duration: input.duration,
          sessionType: input.sessionType,
          creatorId: input.creatorId,
          contactInfo: input.contactInfo,
          participants: {
            create: participantCreates,
          },
          ...(inviteSet.size > 0
            ? {
                invites: {
                  create: [...inviteSet].map((inviteeUserId) => ({ inviteeUserId })),
                },
              }
            : {}),
        },
        include: { participants: true },
      });

      await publishDomainEvent("study-session-events", "StudySessionCreated", {
        sessionId: session.id,
        creatorId: session.creatorId,
        topic: session.topic,
        dateTime: session.dateTime,
        duration: session.duration,
        sessionType: session.sessionType,
        participantUserIds: session.participants.map((p) => p.userId),
        invitedUserIds: [...inviteSet],
      });

      await publishNotification({
        recipient: session.creatorId,
        subject: "Study session created",
        message: `Your session "${session.topic}" was created successfully.`,
      });

      const when = session.dateTime.toISOString?.() ?? String(session.dateTime);
      for (const uid of inviteSet) {
        await publishNotification({
          recipient: uid,
          subject: "Study session invite",
          message: `You’re invited to "${session.topic}" by a study buddy. Opens: ${when}. Open Sessions to join.`,
        });
      }

      return withParticipantsCreatorFirst(session);
    },
    /**
     * Host-only PATCH update; resetting `dateTime` clears reminder state so reminders can fire again for the new time.
     */
    updateSession: async (_, { sessionId, input }, context) => {
      const { prisma } = context;
      assertAuthenticated(context);

      const updateData = buildSessionUpdateData(input);
      if (Object.keys(updateData).length === 0) {
        throw new Error("At least one field must be provided to update the session");
      }
      if (updateData.dateTime !== undefined) {
        updateData.upcomingReminderSentAt = null;
      }

      const existing = await prisma.studySession.findUnique({
        where: { id: sessionId },
        include: { participants: true },
      });
      if (!existing) throw new Error("Session not found");
      if (String(existing.creatorId) !== String(context.user.id)) {
        throw new Error("Only the session creator can update the session");
      }

      const session = await prisma.studySession.update({
        where: { id: sessionId },
        data: updateData,
        include: { participants: true },
      });

      await publishDomainEvent("study-session-events", "StudySessionUpdated", {
        sessionId: session.id,
        creatorId: session.creatorId,
        topic: session.topic,
        dateTime: session.dateTime,
        duration: session.duration,
        sessionType: session.sessionType,
      });

      const when = session.dateTime.toISOString?.() ?? String(session.dateTime);
      const joinerIds = session.participants
        .map((p) => p.userId)
        .filter((uid) => uid !== session.creatorId);

      for (const recipient of joinerIds) {
        await publishNotification({
          recipient,
          subject: "Study session updated",
          message: `The session "${session.topic}" was updated by the host. New time: ${when}.`,
        });
      }

      const normalizedUpdate = await ensureCreatorIsParticipant(prisma, session);
      return withParticipantsCreatorFirst(normalizedUpdate);
    },
    /** Adds a participant row if absent; notifies host via Kafka (`StudySessionJoined`). */
    joinSession: async (_, { sessionId, userId }, context) => {
      const { prisma } = context;
      assertSelf(context, userId);

      let sessionForJoin = await prisma.studySession.findUnique({
        where: { id: sessionId },
        include: { participants: true },
      });
      if (!sessionForJoin) throw new Error("Session not found");
      sessionForJoin = await ensureCreatorIsParticipant(prisma, sessionForJoin);
      if (!sessionForJoin) throw new Error("Session not found");

      if (String(sessionForJoin.creatorId) === String(userId)) {
        throw new Error("You are already in this session as the creator.");
      }

      const existing = await prisma.sessionParticipant.findUnique({
        where: { sessionId_userId: { sessionId, userId } },
      });
      if (existing) {
        await prisma.studySessionInvite.deleteMany({
          where: { sessionId, inviteeUserId: userId },
        });
        return withParticipantsCreatorFirst(sessionForJoin);
      }

      const invite = await prisma.studySessionInvite.findUnique({
        where: { sessionId_inviteeUserId: { sessionId, inviteeUserId: userId } },
      });
      if (!invite) {
        throw new Error("You need an invite from the host to join this session.");
      }

      await prisma.sessionParticipant.create({ data: { sessionId, userId } });
      await prisma.studySessionInvite.deleteMany({
        where: { sessionId, inviteeUserId: userId },
      });
      const session = await prisma.studySession.findUnique({ where: { id: sessionId }, include: { participants: true } });
      if (!session) throw new Error("Session not found");

      await publishDomainEvent("study-session-events", "StudySessionJoined", {
        sessionId,
        userId,
        creatorId: session.creatorId,
        topic: session.topic,
      });

      await publishNotification({
        recipient: session.creatorId,
        subject: "Someone joined your session",
        message: `User ${userId} joined your session "${session.topic}".`,
      });

      const normalizedJoined = await ensureCreatorIsParticipant(prisma, session);
      return withParticipantsCreatorFirst(normalizedJoined);
    },
    /** Removes participant; notifies host unless the leaver was the creator (still listed as host via ensure helper). */
    leaveSession: async (_, { sessionId, userId }, context) => {
      const { prisma } = context;
      assertSelf(context, userId);

      const beforeLeave = await prisma.studySession.findUnique({
        where: { id: sessionId },
        include: { participants: true },
      });
      if (!beforeLeave) throw new Error("Session not found");

      await prisma.sessionParticipant.deleteMany({ where: { sessionId, userId } });

      if (userId !== beforeLeave.creatorId) {
        await prisma.studySessionInvite.upsert({
          where: {
            sessionId_inviteeUserId: { sessionId, inviteeUserId: userId },
          },
          create: { sessionId, inviteeUserId: userId },
          update: {},
        });
      }

      let session = await prisma.studySession.findUnique({ where: { id: sessionId }, include: { participants: true } });

      await publishDomainEvent("study-session-events", "StudySessionLeft", {
        sessionId,
        userId,
        creatorId: session?.creatorId ?? null,
      });

      if (userId !== beforeLeave.creatorId) {
        await publishNotification({
          recipient: beforeLeave.creatorId,
          subject: "Someone left your session",
          message: `User ${userId} left your session "${beforeLeave.topic}".`,
        });
      }

      session = await ensureCreatorIsParticipant(prisma, session);
      return withParticipantsCreatorFirst(session);
    },
    /** Host deletes the session and all participants; fans out cancellation notifications to joiners. */
    cancelSession: async (_, { sessionId, userId }, context) => {
      const { prisma } = context;
      assertSelf(context, userId);
      const session = await prisma.studySession.findUnique({
        where: { id: sessionId },
        include: { participants: true },
      });
      if (!session) throw new Error("Session not found");
      if (String(session.creatorId) !== String(userId)) throw new Error("Only creator can cancel the session");

      const joinerIds = session.participants
        .map((p) => p.userId)
        .filter((uid) => String(uid) !== String(session.creatorId));

      const pendingInvites = await prisma.studySessionInvite.findMany({
        where: { sessionId },
        select: { inviteeUserId: true },
      });
      const inviteeIds = pendingInvites.map((r) => r.inviteeUserId);
      const notifyOthers = new Set([...joinerIds, ...inviteeIds]);

      await prisma.sessionParticipant.deleteMany({ where: { sessionId } });
      await prisma.studySession.delete({ where: { id: sessionId } });

      await publishDomainEvent("study-session-events", "StudySessionCancelled", {
        sessionId,
        creatorId: userId,
        topic: session.topic,
      });

      await publishNotification({
        recipient: userId,
        subject: "Study session cancelled",
        message: `Your session "${session.topic}" was cancelled.`,
      });

      for (const recipient of notifyOthers) {
        await publishNotification({
          recipient,
          subject: "Study session cancelled",
          message: `The session "${session.topic}" was cancelled by the host.`,
        });
      }

      return true;
    },
  },
};

export default resolvers;
