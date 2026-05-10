import { publishDomainEvent, publishNotification, publishBuddyRequestEvent } from "../kafka/producer.js";

/** Clamps the raw heuristic sum to an integer percentage in 0–100 for display and thresholds. */
const normalizeScore = (raw) => Math.max(0, Math.min(100, Math.round(raw)));

/**
 * Core matching logic: scores two `UserProfile` rows from shared courses/topics/availability and study prefs;
 * returns a capped score plus human-readable `reasons` for the UI or evaluation demo.
 */
const computeCompatibility = (a, b) => {
  let score = 0;
  const reasons = [];

  const sharedCourses = a.courses.filter((c) => b.courses.includes(c));
  if (sharedCourses.length > 0) {
    score += sharedCourses.length * 8;
    reasons.push(`Shared course(s): ${sharedCourses.join(", ")}`);
  }

  const sharedTopics = a.topics.filter((t) => b.topics.includes(t));
  if (sharedTopics.length > 0) {
    score += sharedTopics.length * 5;
    reasons.push(`Shared topic(s): ${sharedTopics.join(", ")}`);
  }

  const sharedAvailability = a.availability.filter((u) => b.availability.includes(u));
  if (sharedAvailability.length > 0) {
    score += sharedAvailability.length * 4;
    reasons.push(`Overlapping availability: ${sharedAvailability.join(", ")}`);
  }

  if (a.studyPace && b.studyPace && a.studyPace === b.studyPace) {
    score += 12;
    reasons.push(`Same study pace: ${a.studyPace}`);
  }

  if (a.studyMode && b.studyMode && a.studyMode === b.studyMode) {
    score += 12;
    reasons.push(`Same study mode: ${a.studyMode}`);
  }

  if (a.studyStyle && b.studyStyle && a.studyStyle === b.studyStyle) {
    score += 7;
    reasons.push(`Same study style: ${a.studyStyle}`);
  }

  if (a.preferredGroupSize != null && b.preferredGroupSize != null) {
    const diff = Math.abs(a.preferredGroupSize - b.preferredGroupSize);
    const groupScore = Math.max(0, 6 - diff);
    score += groupScore;
    reasons.push(`Group size compatibility (difference ${diff})`);
  }

  return {
    compatibilityScore: normalizeScore(score),
    reasons: reasons.length > 0 ? reasons : ["No strong overlap yet; ask for basic info"],
  };
};

/**
 * After Kafka-driven profile changes: recomputes best match for `userId`, emits `MatchIdentified` on `matching-events`,
 * and requests an in-app notification (not used on pure GraphQL reads of `recommendMatches`).
 */
export async function publishTopMatchAfterDataChange(prisma, userId) {
  const source = await prisma.userProfile.findUnique({ where: { userId } });
  if (!source) return;

  const allProfiles = await prisma.userProfile.findMany({
    where: { userId: { not: userId } },
  });
  if (allProfiles.length === 0) return;

  const scored = allProfiles
    .map((profile) => {
      const { compatibilityScore, reasons } = computeCompatibility(source, profile);
      return { profile, compatibilityScore, reasons };
    })
    .sort((a, b) => b.compatibilityScore - a.compatibilityScore);

  const best = scored[0];
  await publishDomainEvent("matching-events", "MatchIdentified", {
    userId,
    matchedUserId: best.profile.userId,
    compatibilityScore: best.compatibilityScore,
    reasons: best.reasons,
  });
  await publishNotification({
    recipient: userId,
    subject: "New study buddy match found",
    message: `Top match: ${best.profile.name} (score ${best.compatibilityScore}).`,
  });
}

/** Minimum `computeCompatibility` score required to send a buddy request; overridable via `BUDDY_REQUEST_MIN_COMPATIBILITY_SCORE`. */
const minBuddyRequestCompatibility = () => {
  const raw = process.env.BUDDY_REQUEST_MIN_COMPATIBILITY_SCORE;
  if (raw === undefined || raw === "") return 40;
  const n = Number(raw);
  return Number.isFinite(n) ? n : 40;
};

/** Ensures the resolver was called with a valid JWT (`context.user`); throws if missing. */
const assertAuthenticated = (context) => {
  if (!context?.user) throw new Error("Not authenticated");
};

/** Ensures the caller’s JWT identity matches `userId` so users cannot read or change another account’s data. */
const assertSelf = (context, userId) => {
  assertAuthenticated(context);
  if (context.user.id !== userId) throw new Error("Not authorized");
};

/** Serializes Prisma `Date` fields to ISO strings for GraphQL `String` response fields. */
const toIso = (d) => (d instanceof Date ? d.toISOString() : String(d));

/** Maps a `buddyRequest` DB row to the GraphQL type (string dates, same field names). */
const mapBuddyRequest = (row) => ({
  ...row,
  createdAt: toIso(row.createdAt),
  updatedAt: toIso(row.updatedAt),
});

/** Display name from matching `UserProfile` for notifications (not raw `userId`). */
const profileDisplayName = (profile) => {
  if (!profile) return "Someone";
  const n = profile.name != null ? String(profile.name).trim() : "";
  return n || "Someone";
};

/**
 * Batch-loads display names so list queries return complete rows in one subgraph round-trip
 * (avoids stitched-gateway quirks with nested non-null field resolution).
 */
const enrichBuddyRequestsWithDisplayNames = async (prisma, rows) => {
  const mapped = rows.map(mapBuddyRequest);
  const ids = [...new Set(mapped.flatMap((r) => [r.requesterId, r.receiverId]))];
  if (ids.length === 0) return mapped;
  const profiles = await prisma.userProfile.findMany({
    where: { userId: { in: ids } },
    select: { userId: true, name: true },
  });
  const nameByUserId = new Map(profiles.map((p) => [p.userId, profileDisplayName(p)]));
  return mapped.map((r) => ({
    ...r,
    requesterName: nameByUserId.get(r.requesterId) ?? "Someone",
    receiverName: nameByUserId.get(r.receiverId) ?? "Someone",
  }));
};

const resolvers = {
  BuddyRequest: {
    requesterName: async (parent, _, context) => {
      if (typeof parent.requesterName === "string") return parent.requesterName;
      const { prisma } = context;
      assertAuthenticated(context);
      const uid = context.user.id;
      if (parent.requesterId !== uid && parent.receiverId !== uid) {
        throw new Error("Not authorized");
      }
      const profile = await prisma.userProfile.findUnique({
        where: { userId: parent.requesterId },
      });
      return profileDisplayName(profile);
    },
    receiverName: async (parent, _, context) => {
      if (typeof parent.receiverName === "string") return parent.receiverName;
      const { prisma } = context;
      assertAuthenticated(context);
      const uid = context.user.id;
      if (parent.requesterId !== uid && parent.receiverId !== uid) {
        throw new Error("Not authorized");
      }
      const profile = await prisma.userProfile.findUnique({
        where: { userId: parent.receiverId },
      });
      return profileDisplayName(profile);
    },
  },
  Query: {
    /** Returns one `UserProfile` row for the given id; caller must be that user. */
    userProfile: async (_, { userId }, context) => {
      const { prisma } = context;
      assertSelf(context, userId);
      return prisma.userProfile.findUnique({ where: { userId } });
    },
    /** Lists profiles visible to the caller — currently only the authenticated user’s own profile (0 or 1 row). */
    userProfiles: async (_, __, context) => {
      const { prisma } = context;
      assertAuthenticated(context);
      const profile = await prisma.userProfile.findUnique({ where: { userId: context.user.id } });
      return profile ? [profile] : [];
    },
    /**
     * Ranks every other stored profile by `computeCompatibility`, returns top `maxResults` with scores and reasons (read-only; no Kafka).
     */
    recommendMatches: async (_, { userId, maxResults = 10 }, context) => {
      const { prisma } = context;
      assertSelf(context, userId);
      const source = await prisma.userProfile.findUnique({ where: { userId } });
      if (!source) throw new Error(`No user profile found for userId ${userId}`);

      const allProfiles = await prisma.userProfile.findMany({ where: { userId: { not: userId } } });
      const scored = allProfiles
        .map((profile) => {
          const { compatibilityScore, reasons } = computeCompatibility(source, profile);
          return { profile, compatibilityScore, reasons };
        })
        .sort((a, b) => b.compatibilityScore - a.compatibilityScore);

      const top = scored.slice(0, maxResults);
      // Reads only: Kafka MatchIdentified + notifications run from kafka/consumer.js after data changes.
      return top;
    },
    /** Fetches one buddy request if the caller is requester or receiver (privacy). */
    buddyRequest: async (_, { id }, context) => {
      const { prisma } = context;
      assertAuthenticated(context);
      const row = await prisma.buddyRequest.findUnique({ where: { id } });
      if (!row) return null;
      const uid = context.user.id;
      if (row.requesterId !== uid && row.receiverId !== uid) {
        throw new Error("Not authorized");
      }
      const [enriched] = await enrichBuddyRequestsWithDisplayNames(prisma, [row]);
      return enriched;
    },
    /** Buddy requests where the current user is the receiver; optional filter by status. */
    myIncomingBuddyRequests: async (_, { status }, context) => {
      const { prisma } = context;
      assertAuthenticated(context);
      const where = { receiverId: context.user.id };
      if (status) where.status = status;
      const rows = await prisma.buddyRequest.findMany({
        where,
        orderBy: { createdAt: "desc" },
      });
      return enrichBuddyRequestsWithDisplayNames(prisma, rows);
    },
    /** Buddy requests sent by the current user; optional filter by status. */
    myOutgoingBuddyRequests: async (_, { status }, context) => {
      const { prisma } = context;
      assertAuthenticated(context);
      const where = { requesterId: context.user.id };
      if (status) where.status = status;
      const rows = await prisma.buddyRequest.findMany({
        where,
        orderBy: { createdAt: "desc" },
      });
      return enrichBuddyRequestsWithDisplayNames(prisma, rows);
    },
  },
  Mutation: {
    /**
     * Create/update the matching-service copy of a user’s profile with PATCH semantics (omitted fields keep DB values).
     */
    upsertUserProfile: async (_, { profile }, context) => {
      const { prisma } = context;
      const { userId, name, email, courses = [], topics = [], studyPace, studyMode, preferredGroupSize, studyStyle, availability = [] } = profile;
      assertSelf(context, userId);
      const upserted = await prisma.userProfile.upsert({
        where: { userId },
        create: {
          userId,
          name,
          email,
          courses,
          topics,
          studyPace,
          studyMode,
          preferredGroupSize,
          studyStyle,
          availability,
        },
        update: {
          name,
          email,
          courses,
          topics,
          studyPace,
          studyMode,
          preferredGroupSize,
          studyStyle,
          availability,
        },
      });
      return upserted;
    },
    /** Removes the caller’s `UserProfile` row from the matching database. */
    deleteUserProfile: async (_, { userId }, context) => {
      const { prisma } = context;
      assertSelf(context, userId);
      const deleted = await prisma.userProfile.deleteMany({ where: { userId } });
      return deleted.count > 0;
    },
    /**
     * Creates a PENDING buddy request if compatibility ≥ minimum, prevents duplicate pendings,
     * then publishes Kafka buddy-request + notification events.
     */
    sendBuddyRequest: async (_, { input }, context) => {
      const { prisma } = context;
      assertAuthenticated(context);
      const requesterId = context.user.id;
      const { receiverId, message } = input;

      if (receiverId === requesterId) {
        throw new Error("Cannot send a buddy request to yourself");
      }

      const requesterProfile = await prisma.userProfile.findUnique({ where: { userId: requesterId } });
      const receiverProfile = await prisma.userProfile.findUnique({ where: { userId: receiverId } });
      if (!requesterProfile || !receiverProfile) {
        throw new Error("Both users need a stored profile before sending a buddy request");
      }

      const minScore = minBuddyRequestCompatibility();
      if (minScore > 0) {
        const { compatibilityScore } = computeCompatibility(requesterProfile, receiverProfile);
        if (compatibilityScore < minScore) {
          throw new Error(
            `Match compatibility (${compatibilityScore}) is below the minimum (${minScore}) required to send a buddy request. Try BUDDY_REQUEST_MIN_COMPATIBILITY_SCORE=0 to disable this check in development.`
          );
        }
      }

      const alreadyBuddies = await prisma.buddyRequest.findFirst({
        where: {
          status: "ACCEPTED",
          OR: [
            { requesterId, receiverId },
            { requesterId: receiverId, receiverId: requesterId },
          ],
        },
      });
      if (alreadyBuddies) {
        throw new Error("You are already study buddies with this user.");
      }

      const pendingBetweenPair = await prisma.buddyRequest.findFirst({
        where: {
          status: "PENDING",
          OR: [
            { requesterId, receiverId },
            { requesterId: receiverId, receiverId: requesterId },
          ],
        },
      });
      if (pendingBetweenPair) {
        throw new Error("A pending buddy request already exists between you and this user.");
      }

      const created = await prisma.buddyRequest.create({
        data: {
          requesterId,
          receiverId,
          message: message ?? null,
        },
      });

      await publishBuddyRequestEvent("BuddyRequestCreated", {
        id: created.id,
        requesterId,
        receiverId,
        status: created.status,
      });

      await publishNotification({
        recipient: receiverId,
        subject: "New buddy request",
        message: `${profileDisplayName(requesterProfile)} sent you a study buddy request.`,
      });

      return mapBuddyRequest(created);
    },
    /** Receiver accepts or declines; updates status and notifies the requester via Kafka. */
    respondToBuddyRequest: async (_, { requestId, decision }, context) => {
      const { prisma } = context;
      assertAuthenticated(context);
      const uid = context.user.id;
      const row = await prisma.buddyRequest.findUnique({ where: { id: requestId } });
      if (!row) throw new Error("Buddy request not found");
      if (row.receiverId !== uid) throw new Error("Only the receiver can respond");
      if (row.status !== "PENDING") throw new Error("This request is no longer pending");

      const nextStatus = decision === "ACCEPT" ? "ACCEPTED" : "DECLINED";
      const updated = await prisma.buddyRequest.update({
        where: { id: requestId },
        data: { status: nextStatus },
      });

      const eventName =
        nextStatus === "ACCEPTED" ? "BuddyRequestAccepted" : "BuddyRequestDeclined";
      await publishBuddyRequestEvent(eventName, {
        id: updated.id,
        requesterId: updated.requesterId,
        receiverId: updated.receiverId,
        status: updated.status,
      });

      const receiverProfileForNote = await prisma.userProfile.findUnique({
        where: { userId: updated.receiverId },
      });
      const receiverLabel = profileDisplayName(receiverProfileForNote);

      if (nextStatus === "ACCEPTED") {
        await publishNotification({
          recipient: updated.requesterId,
          subject: "Buddy request accepted",
          message: `${receiverLabel} accepted your study buddy request.`,
        });
      } else {
        await publishNotification({
          recipient: updated.requesterId,
          subject: "Buddy request declined",
          message: `${receiverLabel} declined your study buddy request.`,
        });
      }

      return mapBuddyRequest(updated);
    },
    /** Requester sets status to CANCELLED on a still-PENDING request and notifies the receiver. */
    cancelBuddyRequest: async (_, { requestId }, context) => {
      const { prisma } = context;
      assertAuthenticated(context);
      const uid = context.user.id;
      const row = await prisma.buddyRequest.findUnique({ where: { id: requestId } });
      if (!row) throw new Error("Buddy request not found");
      if (row.requesterId !== uid) throw new Error("Only the requester can cancel");
      if (row.status !== "PENDING") throw new Error("Only pending requests can be cancelled");

      const updated = await prisma.buddyRequest.update({
        where: { id: requestId },
        data: { status: "CANCELLED" },
      });

      await publishBuddyRequestEvent("BuddyRequestCancelled", {
        id: updated.id,
        requesterId: updated.requesterId,
        receiverId: updated.receiverId,
        status: updated.status,
      });

      const requesterProfileForNote = await prisma.userProfile.findUnique({
        where: { userId: updated.requesterId },
      });

      await publishNotification({
        recipient: updated.receiverId,
        subject: "Buddy request withdrawn",
        message: `${profileDisplayName(requesterProfileForNote)} cancelled their study buddy request.`,
      });

      return mapBuddyRequest(updated);
    },
  },
};

export default resolvers;
