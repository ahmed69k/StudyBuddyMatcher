import { prisma } from "../index.js";
import { publishEvent } from "../kafka/producer.js";

const VALID_DAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday"
];

const resolvers = {

  Query: {

    getMyAvailability: async (_, __, context) => {
      if (!context.user) {
        throw new Error("Not authenticated");
      }

      return await prisma.availability.findMany({
        where: { userId: context.user.id },
        orderBy: { dayOfWeek: "asc" }
      });
    },

    getAvailabilityById: async (_, { id }, context) => {
      if (!context.user) {
        throw new Error("Not authenticated");
      }

      const availability = await prisma.availability.findUnique({
        where: { id }
      });

      if (!availability || availability.userId !== context.user.id) {
        throw new Error("Not authorized");
      }

      return availability;
    }

  },

  Mutation: {

    // ADD (multi-day)
    addAvailability: async (_, { input }, context) => {
      if (!context.user) throw new Error("Not authenticated");
      const userId = context.user.id;

      const createdSlots = [];

      for (let slot of input.days) {
        const { dayOfWeek, startHour, endHour } = slot;

        // Validate day
        if (!VALID_DAYS.includes(dayOfWeek)) throw new Error(`Invalid day: ${dayOfWeek}`);

        // Validate hours
        if (startHour >= endHour || startHour < 0 || endHour > 24) {
          throw new Error(`Invalid hours for ${dayOfWeek}`);
        }

        // Check overlap for this day
        const overlap = await prisma.availability.findMany({
          where: {
            userId,
            dayOfWeek,
            AND: [
              { startHour: { lt: endHour } },
              { endHour: { gt: startHour } },
            ],
          },
        });

        if (overlap.length > 0) throw new Error(`Overlap detected on ${dayOfWeek}`);

        // Create availability
        const created = await prisma.availability.create({
          data: {
            userId,
            dayOfWeek,
            startHour,
            endHour,
          },
        });

        // Publish Kafka event
        await publishEvent("AvailabilityCreated", created);

        createdSlots.push(created);
      }

      return createdSlots;
    },

    // UPDATE
    updateAvailability: async (_, { id, input }, context) => {
      if (!context.user) {
        throw new Error("Not authenticated");
      }

      const userId = context.user.id;

      const existing = await prisma.availability.findUnique({
        where: { id }
      });

      if (!existing || existing.userId !== userId) {
        throw new Error("Not authorized");
      }

      const newDay = input.dayOfWeek ?? existing.dayOfWeek;
      const newStart = input.startHour ?? existing.startHour;
      const newEnd = input.endHour ?? existing.endHour;

      if (newStart >= newEnd) {
        throw new Error("Invalid time range");
      }

      // check overlap (excluding current record)
      const otherSlots = await prisma.availability.findMany({
        where: {
          userId,
          dayOfWeek: newDay,
          NOT: { id }
        }
      });

      for (let slot of otherSlots) {
        if (
          newStart < slot.endHour &&
          newEnd > slot.startHour
        ) {
          throw new Error(`Overlap detected on ${newDay}`);
        }
      }

      const updated = await prisma.availability.update({
        where: { id },
        data: {
          dayOfWeek: newDay,
          startHour: newStart,
          endHour: newEnd
        }
      });

      // Kafka event
      await publishEvent("AvailabilityUpdated", updated);

      return updated;
    },

    // DELETE
    deleteAvailability: async (_, { id }, context) => {
      if (!context.user) {
        throw new Error("Not authenticated");
      }

      const existing = await prisma.availability.findUnique({
        where: { id }
      });

      if (!existing || existing.userId !== context.user.id) {
        throw new Error("Not authorized");
      }

      // ORIGINAL: delete first, then Kafka with only { id, userId } (matching consumer could not derive slot string).
      // await prisma.availability.delete({ where: { id } });
      // await publishEvent("AvailabilityDeleted", { id, userId: context.user.id });
      // EDIT: publish full slot before delete so matching-service can remove the correct availability string.
      await publishEvent("AvailabilityDeleted", {
        id: existing.id,
        userId: existing.userId,
        dayOfWeek: existing.dayOfWeek,
        startHour: existing.startHour,
        endHour: existing.endHour,
      });

      await prisma.availability.delete({
        where: { id }
      });

      return {
        message: "Availability deleted successfully",
        id
      };
    }

  }

};

export default resolvers;
