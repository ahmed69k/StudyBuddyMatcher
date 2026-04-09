import { publishDomainEvent, publishNotification } from "../kafka/producer.js";

const assertAuthenticated = (context) => {
  if (!context?.user) throw new Error("Not authenticated");
};

const assertSelf = (context, userId) => {
  assertAuthenticated(context);
  if (context.user.id !== userId) throw new Error("Not authorized");
};

const resolvers = {
  Query: {
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
      return session;
    },
    sessions: async (_, __, context) => {
      const { prisma } = context;
      assertAuthenticated(context);
      // Return only sessions related to the caller (creator or participant)
      return prisma.studySession.findMany({
        where: {
          OR: [
            { creatorId: context.user.id },
            { participants: { some: { userId: context.user.id } } },
          ],
        },
        include: { participants: true },
        orderBy: { dateTime: "asc" },
      });
    },
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

      return [...created, ...joined];
    },
  },
  Mutation: {
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

      return session;
    },
    joinSession: async (_, { sessionId, userId }, context) => {
      const { prisma } = context;
      assertSelf(context, userId);
      const existing = await prisma.sessionParticipant.findUnique({
        where: { sessionId_userId: { sessionId, userId } },
      });
      if (existing) {
        const session = await prisma.studySession.findUnique({
          where: { id: sessionId },
          include: { participants: true },
        });
        return session;
      }
      await prisma.sessionParticipant.create({ data: { sessionId, userId } });
      const session = await prisma.studySession.findUnique({ where: { id: sessionId }, include: { participants: true } });

      if (session) {
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
      }

      return session;
    },
    leaveSession: async (_, { sessionId, userId }, context) => {
      const { prisma } = context;
      assertSelf(context, userId);
      await prisma.sessionParticipant.deleteMany({ where: { sessionId, userId } });
      const session = await prisma.studySession.findUnique({ where: { id: sessionId }, include: { participants: true } });

      await publishDomainEvent("study-session-events", "StudySessionLeft", {
        sessionId,
        userId,
        creatorId: session?.creatorId ?? null,
      });

      return session;
    },
    cancelSession: async (_, { sessionId, userId }, context) => {
      const { prisma } = context;
      assertSelf(context, userId);
      const session = await prisma.studySession.findUnique({ where: { id: sessionId } });
      if (!session) throw new Error("Session not found");
      if (session.creatorId !== userId) throw new Error("Only creator can cancel the session");

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
      return true;
    },
  },
};

export default resolvers;
