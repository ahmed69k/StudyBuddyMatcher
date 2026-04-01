import { prisma } from '../prismaClient.js';
import { publishEvent } from '../kafka.js';

export const resolvers = {
  Query: {
    getProfile: async (_, { userId }) => {
      return await prisma.profile.findUnique({
        where: { userId },
        include: {
          courses: true,
          topics: true,
          studyPreference: true,
        },
      });
    },
  },

  



  Mutation: {
    addCourse: async (_, { userId, name }, context) => {
      if (!context.userId) throw new Error('Unauthorized');
      if (context.userId !== userId) throw new Error('Unauthorized');

      let profile = await prisma.profile.findUnique({ where: { userId } });
      if (!profile) {
        profile = await prisma.profile.create({ data: { userId } });
      }

      const course = await prisma.course.create({
        data: { name, profileId: profile.id },
      });

      const fullProfile = await prisma.profile.findUnique({
        where: { userId },
        include: { courses: true, topics: true, studyPreference: true },
      });

      await publishEvent('UserPreferencesUpdated', {
        userId,
        courses: fullProfile.courses.map((c) => c.name),
        topics: fullProfile.topics.map((t) => t.name),
        studyPreference: fullProfile.studyPreference,
      });

      return course;
    },

    deleteCourse: async (_, { courseId }, context) => {
      if (!context.userId) throw new Error('Unauthorized');

      const course = await prisma.course.findUnique({ where: { id: courseId } });
      if (!course) throw new Error('Course not found');

      const profile = await prisma.profile.findUnique({ where: { id: course.profileId } });
      if (profile.userId !== context.userId) throw new Error('Unauthorized');

      await prisma.course.delete({ where: { id: courseId } });

      const fullProfile = await prisma.profile.findUnique({
        where: { userId: context.userId },
        include: { courses: true, topics: true, studyPreference: true },
      });

      await publishEvent('UserPreferencesUpdated', {
        userId: context.userId,
        courses: fullProfile.courses.map((c) => c.name),
        topics: fullProfile.topics.map((t) => t.name),
        studyPreference: fullProfile.studyPreference,
      });

      return course;
    },

    addTopic: async (_, { userId, name }, context) => {
      if (!context.userId) throw new Error('Unauthorized');
      if (context.userId !== userId) throw new Error('Unauthorized');

      let profile = await prisma.profile.findUnique({ where: { userId } });
      if (!profile) {
        profile = await prisma.profile.create({ data: { userId } });
      }

      const topic = await prisma.topic.create({
        data: { name, profileId: profile.id },
      });

      const fullProfile = await prisma.profile.findUnique({
        where: { userId },
        include: { courses: true, topics: true, studyPreference: true },
      });

      await publishEvent('UserPreferencesUpdated', {
        userId,
        courses: fullProfile.courses.map((c) => c.name),
        topics: fullProfile.topics.map((t) => t.name),
        studyPreference: fullProfile.studyPreference,
      });

      return topic;
    },

    deleteTopic: async (_, { topicId }, context) => {
      if (!context.userId) throw new Error('Unauthorized');

      const topic = await prisma.topic.findUnique({ where: { id: topicId } });
      if (!topic) throw new Error('Topic not found');

      const profile = await prisma.profile.findUnique({ where: { id: topic.profileId } });
      if (profile.userId !== context.userId) throw new Error('Unauthorized');

      await prisma.topic.delete({ where: { id: topicId } });

      const fullProfile = await prisma.profile.findUnique({
        where: { userId: context.userId },
        include: { courses: true, topics: true, studyPreference: true },
      });

      await publishEvent('UserPreferencesUpdated', {
        userId: context.userId,
        courses: fullProfile.courses.map((c) => c.name),
        topics: fullProfile.topics.map((t) => t.name),
        studyPreference: fullProfile.studyPreference,
      });

      return topic;
    },

    upsertStudyPreference: async (_, { userId, pace, mode, groupSize, studyStyle }, context) => {
      if (!context.userId) throw new Error('Unauthorized');
      if (context.userId !== userId) throw new Error('Unauthorized');

      let profile = await prisma.profile.findUnique({ where: { userId } });
      if (!profile) {
        profile = await prisma.profile.create({ data: { userId } });
      }

      const studyPreference = await prisma.studyPreference.upsert({
        where: { profileId: profile.id },
        update: { pace, mode, groupSize, studyStyle },
        create: { profileId: profile.id, pace, mode, groupSize, studyStyle },
      });

      const fullProfile = await prisma.profile.findUnique({
        where: { userId },
        include: { courses: true, topics: true, studyPreference: true },
      });

      await publishEvent('UserPreferencesUpdated', {
        userId,
        courses: fullProfile.courses.map((c) => c.name),
        topics: fullProfile.topics.map((t) => t.name),
        studyPreference: fullProfile.studyPreference,
      });

      return studyPreference;
    },
  },
};