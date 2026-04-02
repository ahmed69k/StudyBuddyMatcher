const resolvers = {
  Query: {
    session: async (_, { id }, { prisma }) => {
      return prisma.studySession.findUnique({
        where: { id },
        include: { participants: true },
      });
    },
    sessions: async (_, __, { prisma }) => {
      return prisma.studySession.findMany({ include: { participants: true }, orderBy: { dateTime: "asc" } });
    },
    sessionsByUser: async (_, { userId }, { prisma }) => {
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
    createSession: async (_, { input }, { prisma }) => {
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

      return session;
    },
    joinSession: async (_, { sessionId, userId }, { prisma }) => {
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
      return prisma.studySession.findUnique({ where: { id: sessionId }, include: { participants: true } });
    },
    leaveSession: async (_, { sessionId, userId }, { prisma }) => {
      await prisma.sessionParticipant.deleteMany({ where: { sessionId, userId } });
      return prisma.studySession.findUnique({ where: { id: sessionId }, include: { participants: true } });
    },
    cancelSession: async (_, { sessionId, userId }, { prisma }) => {
      const session = await prisma.studySession.findUnique({ where: { id: sessionId } });
      if (!session) throw new Error("Session not found");
      if (session.creatorId !== userId) throw new Error("Only creator can cancel the session");

      await prisma.sessionParticipant.deleteMany({ where: { sessionId } });
      await prisma.studySession.delete({ where: { id: sessionId } });
      return true;
    },
  },
};

export default resolvers;
