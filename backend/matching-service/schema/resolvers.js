import { publishDomainEvent, publishNotification } from "../kafka/producer.js";

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

const assertAuthenticated = (context) => {
  if (!context?.user) throw new Error("Not authenticated");
};

const assertSelf = (context, userId) => {
  assertAuthenticated(context);
  if (context.user.id !== userId) throw new Error("Not authorized");
};

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
      // Return only caller's cached profile to avoid leaking other users' data.
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
        // Domain event (for future consumers, even if none exist today)
        await publishDomainEvent("matching-events", "MatchIdentified", {
          userId,
          matchedUserId: best.profile.userId,
          compatibilityScore: best.compatibilityScore,
          reasons: best.reasons,
        });
        // Align with existing notification-service consumer (flat message)
        await publishNotification({
          recipient: userId,
          subject: "New study buddy match found",
          message: `Top match: ${best.profile.name} (score ${best.compatibilityScore}).`,
        });
      }

      return top;
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
  },
};

export default resolvers;
