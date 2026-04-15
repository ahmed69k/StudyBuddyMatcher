import { publishDomainEvent, publishNotification, publishBuddyRequestEvent } from "../kafka/producer.js";

const normalizeScore = (raw) => Math.max(0, Math.min(100, Math.round(raw)));

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

const minBuddyRequestCompatibility = () => {
  const raw = process.env.BUDDY_REQUEST_MIN_COMPATIBILITY_SCORE;
  if (raw === undefined || raw === "") return 40;
  const n = Number(raw);
  return Number.isFinite(n) ? n : 40;
};

const assertAuthenticated = (context) => {
  if (!context?.user) throw new Error("Not authenticated");
};

const assertSelf = (context, userId) => {
  assertAuthenticated(context);
  if (context.user.id !== userId) throw new Error("Not authorized");
};

const toIso = (d) => (d instanceof Date ? d.toISOString() : String(d));

const mapBuddyRequest = (row) => ({
  ...row,
  createdAt: toIso(row.createdAt),
  updatedAt: toIso(row.updatedAt),
});

const resolvers = {
  Query: {
    userProfile: async (_, { userId }, context) => {
      const { prisma } = context;
      assertSelf(context, userId);
      return prisma.userProfile.findUnique({ where: { userId } });
    },
    userProfiles: async (_, __, context) => {
      const { prisma } = context;
      assertAuthenticated(context);
      const profile = await prisma.userProfile.findUnique({ where: { userId: context.user.id } });
      return profile ? [profile] : [];
    },
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

      if (top.length > 0) {
        const best = top[0];
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

      return top;
    },
    buddyRequest: async (_, { id }, context) => {
      const { prisma } = context;
      assertAuthenticated(context);
      const row = await prisma.buddyRequest.findUnique({ where: { id } });
      if (!row) return null;
      const uid = context.user.id;
      if (row.requesterId !== uid && row.receiverId !== uid) {
        throw new Error("Not authorized");
      }
      return mapBuddyRequest(row);
    },
    myIncomingBuddyRequests: async (_, { status }, context) => {
      const { prisma } = context;
      assertAuthenticated(context);
      const where = { receiverId: context.user.id };
      if (status) where.status = status;
      const rows = await prisma.buddyRequest.findMany({
        where,
        orderBy: { createdAt: "desc" },
      });
      return rows.map(mapBuddyRequest);
    },
    myOutgoingBuddyRequests: async (_, { status }, context) => {
      const { prisma } = context;
      assertAuthenticated(context);
      const where = { requesterId: context.user.id };
      if (status) where.status = status;
      const rows = await prisma.buddyRequest.findMany({
        where,
        orderBy: { createdAt: "desc" },
      });
      return rows.map(mapBuddyRequest);
    },
  },
  Mutation: {
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
    deleteUserProfile: async (_, { userId }, context) => {
      const { prisma } = context;
      assertSelf(context, userId);
      const deleted = await prisma.userProfile.deleteMany({ where: { userId } });
      return deleted.count > 0;
    },
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

      const pendingSameDirection = await prisma.buddyRequest.findFirst({
        where: {
          requesterId,
          receiverId,
          status: "PENDING",
        },
      });
      if (pendingSameDirection) {
        throw new Error("You already have a pending request to this user");
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
        message: `User ${requesterId} sent you a study buddy request.`,
      });

      return mapBuddyRequest(created);
    },
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

      if (nextStatus === "ACCEPTED") {
        await publishNotification({
          recipient: updated.requesterId,
          subject: "Buddy request accepted",
          message: `User ${updated.receiverId} accepted your study buddy request.`,
        });
      } else {
        await publishNotification({
          recipient: updated.requesterId,
          subject: "Buddy request declined",
          message: `User ${updated.receiverId} declined your study buddy request.`,
        });
      }

      return mapBuddyRequest(updated);
    },
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

      await publishNotification({
        recipient: updated.receiverId,
        subject: "Buddy request withdrawn",
        message: `User ${updated.requesterId} cancelled their study buddy request.`,
      });

      return mapBuddyRequest(updated);
    },
  },
};

export default resolvers;
