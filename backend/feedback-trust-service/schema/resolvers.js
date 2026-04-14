import { recomputeTrustScore } from "../utils/recomputeTrustScore.js";

const assertAuthenticated = (context) => {
  if (!context?.user) throw new Error("Not authenticated");
};

const toIsoString = (value) => {
  if (!value) return value;
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
};

const mapFeedback = (feedback) => ({
  ...feedback,
  createdAt: toIsoString(feedback.createdAt),
  updatedAt: toIsoString(feedback.updatedAt),
});

const mapTrustProfile = (profile) =>
  profile
    ? {
        ...profile,
        updatedAt: toIsoString(profile.updatedAt),
      }
    : null;

const assertRating = (fieldName, value) => {
  if (!Number.isInteger(value) || value < 1 || value > 5) {
    throw new Error(`${fieldName} must be an integer between 1 and 5`);
  }
};

const getSessionEnd = (sessionSnapshot) =>
  new Date(new Date(sessionSnapshot.dateTime).getTime() + sessionSnapshot.duration * 60 * 1000);

const resolvers = {
  Query: {
    healthCheck: () => "feedback-trust-service is running",
    trustProfile: async (_, { userId }, context) => {
      const { prisma } = context;
      const profile = await prisma.trustProfile.findUnique({
        where: { userId },
      });
      return mapTrustProfile(profile);
    },
    myTrustProfile: async (_, __, context) => {
      assertAuthenticated(context);
      const { prisma, user } = context;
      const profile = await prisma.trustProfile.findUnique({
        where: { userId: user.id },
      });
      return mapTrustProfile(profile);
    },
    myReceivedFeedback: async (_, __, context) => {
      assertAuthenticated(context);
      const { prisma, user } = context;
      const feedbackEntries = await prisma.feedback.findMany({
        where: { revieweeId: user.id },
        orderBy: { createdAt: "desc" },
      });
      return feedbackEntries.map(mapFeedback);
    },
    sessionFeedback: async (_, { sessionId }, context) => {
      assertAuthenticated(context);
      const { prisma } = context;
      const feedbackEntries = await prisma.feedback.findMany({
        where: { sessionId },
        orderBy: { createdAt: "desc" },
      });
      return feedbackEntries.map(mapFeedback);
    },
  },
  Mutation: {
    submitFeedback: async (_, { input }, context) => {
      assertAuthenticated(context);

      const { prisma, user } = context;
      const {
        sessionId,
        revieweeId,
        overallRating,
        punctuality,
        helpfulness,
        communication,
        noShow = false,
        comment,
      } = input;

      if (user.id === revieweeId) {
        throw new Error("You cannot submit feedback for yourself");
      }

      assertRating("overallRating", overallRating);
      assertRating("punctuality", punctuality);
      assertRating("helpfulness", helpfulness);
      assertRating("communication", communication);

      const sessionSnapshot = await prisma.sessionSnapshot.findUnique({
        where: { id: sessionId },
      });

      if (!sessionSnapshot) {
        throw new Error("Session snapshot not found");
      }

      if (sessionSnapshot.cancelled) {
        throw new Error("Feedback cannot be submitted for a cancelled session");
      }

      const sessionEnd = getSessionEnd(sessionSnapshot);
      if (sessionEnd >= new Date()) {
        throw new Error("Feedback can only be submitted after the session ends");
      }

      if (!sessionSnapshot.participantIds.includes(user.id)) {
        throw new Error("Only session participants can submit feedback");
      }

      if (!sessionSnapshot.participantIds.includes(revieweeId)) {
        throw new Error("You can only review another participant in the same session");
      }

      const existingFeedback = await prisma.feedback.findUnique({
        where: {
          sessionId_reviewerId_revieweeId: {
            sessionId,
            reviewerId: user.id,
            revieweeId,
          },
        },
      });

      if (existingFeedback) {
        throw new Error("You have already submitted feedback for this participant in this session");
      }

      const createdFeedback = await prisma.feedback.create({
        data: {
          sessionId,
          reviewerId: user.id,
          revieweeId,
          overallRating,
          punctuality,
          helpfulness,
          communication,
          noShow,
          comment: comment?.trim() ? comment.trim() : null,
        },
      });

      await recomputeTrustScore(prisma, revieweeId);

      return mapFeedback(createdFeedback);
    },
  },
};

export default resolvers;
