import { publishDomainEvent, publishNotification } from "../kafka/producer.js";

/** Requires a logged-in user (`context.user` from JWT); throws otherwise. */
const assertAuthenticated = (context) => {
  if (!context?.user) throw new Error("Not authenticated");
};

/** Ensures the operation targets the same `userId` as the JWT (no cross-user join/leave on GraphQL). */
const assertSelf = (context, userId) => {
  assertAuthenticated(context);
  if (context.user.id !== userId) throw new Error("Not authorized");
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
  const hasCreator = session.participants.some((p) => p.userId === session.creatorId);
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
  const participants = [...session.participants].sort((a, b) => {
    if (a.userId === session.creatorId) return -1;
    if (b.userId === session.creatorId) return 1;
    return 0;
  });
  return { ...session, participants };
};

const resolvers = {
  Query: {
    /** Returns one session if the caller is host or participant; normalizes creator-as-participant. */
    session: async (_, { id }, context) => {
      const { prisma } = context;
      assertAuthenticated(context);
      const session = await prisma.studySession.findUnique({
        where: { id },
        include: { participants: true },
      });
      if (!session) return null;
      const isCreator = session.creatorId === context.user.id;
      const isParticipant = session.participants.some((p) => p.userId === context.user.id);
      if (!isCreator && !isParticipant) throw new Error("Not authorized");
      const normalized = await ensureCreatorIsParticipant(prisma, session);
      return withParticipantsCreatorFirst(normalized);
    },
    /** All sessions the current user created or joined, ordered by start time. */
    sessions: async (_, __, context) => {
      const { prisma } = context;
      assertAuthenticated(context);
      // Return only sessions related to the caller (creator or participant)
      const list = await prisma.studySession.findMany({
        where: {
          OR: [
            { creatorId: context.user.id },
            { participants: { some: { userId: context.user.id } } },
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
      const created = await prisma.studySession.findMany({
        where: { creatorId: userId },
        include: { participants: true },
      });
      const joinedIds = await prisma.sessionParticipant
        .findMany({
          where: { userId },
          select: { sessionId: true },
        })
        .then((rows) => rows.map((row) => row.sessionId));

      const joined = await prisma.studySession.findMany({
        where: { id: { in: joinedIds }, creatorId: { not: userId } },
        include: { participants: true },
      });

      const combined = [...created, ...joined];
      const out = [];
      for (const s of combined) {
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
            create: [{ userId: input.creatorId }],
          },
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
      });

      await publishNotification({
        recipient: session.creatorId,
        subject: "Study session created",
        message: `Your session "${session.topic}" was created successfully.`,
      });

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
      if (existing.creatorId !== context.user.id) {
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

      if (sessionForJoin.creatorId === userId) {
        throw new Error("You are already in this session as the creator.");
      }

      const existing = await prisma.sessionParticipant.findUnique({
        where: { sessionId_userId: { sessionId, userId } },
      });
      if (existing) {
        return withParticipantsCreatorFirst(sessionForJoin);
      }
      await prisma.sessionParticipant.create({ data: { sessionId, userId } });
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
      if (session.creatorId !== userId) throw new Error("Only creator can cancel the session");

      const joinerIds = session.participants.map((p) => p.userId).filter((uid) => uid !== session.creatorId);

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

      for (const recipient of joinerIds) {
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
