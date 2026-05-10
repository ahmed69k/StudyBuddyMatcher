import { prisma } from "../index.js";
import { publishEvent } from "../kafka/producer.js";

const VALID_DAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

/** Integer hour ranges overlap if they share any hour-boundary segment (touching endpoints do not overlap). */
function hourIntervalsOverlap(startA, endA, startB, endB) {
  return startA < endB && endA > startB;
}

function normalizeHours(dayLabel, startHour, endHour) {
  const start = Number(startHour);
  const end = Number(endHour);
  if (!Number.isFinite(start) || !Number.isFinite(end)) {
    throw new Error(`Invalid hours for ${dayLabel}`);
  }
  if (!Number.isInteger(start) || !Number.isInteger(end)) {
    throw new Error(`Use whole hours only (${dayLabel})`);
  }
  if (start < 0 || start > 23 || end < 1 || end > 24 || start >= end) {
    throw new Error(`Invalid time range for ${dayLabel} (use hours 0–24, end after start)`);
  }
  return { start, end };
}

function assertNoOverlapsWithinBatch(normalizedSlots) {
  for (let i = 0; i < normalizedSlots.length; i++) {
    for (let j = i + 1; j < normalizedSlots.length; j++) {
      const a = normalizedSlots[i];
      const b = normalizedSlots[j];
      if (a.dayOfWeek !== b.dayOfWeek) continue;
      if (hourIntervalsOverlap(a.startHour, a.endHour, b.startHour, b.endHour)) {
        throw new Error(
          `Overlapping or duplicate slots on ${a.dayOfWeek} in the same request. Adjust times or send one slot at a time.`,
        );
      }
    }
  }
}

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

      const normalizedSlots = [];
      for (const slot of input.days) {
        const { dayOfWeek } = slot;
        if (!VALID_DAYS.includes(dayOfWeek)) throw new Error(`Invalid day: ${dayOfWeek}`);
        const { start, end } = normalizeHours(dayOfWeek, slot.startHour, slot.endHour);
        normalizedSlots.push({ dayOfWeek, startHour: start, endHour: end });
      }

      assertNoOverlapsWithinBatch(normalizedSlots);

      const createdSlots = [];

      for (const { dayOfWeek, startHour, endHour } of normalizedSlots) {
        const overlap = await prisma.availability.findMany({
          where: {
            userId,
            dayOfWeek,
            AND: [{ startHour: { lt: endHour } }, { endHour: { gt: startHour } }],
          },
        });

        if (overlap.length > 0) {
          const exact = overlap.some((o) => o.startHour === startHour && o.endHour === endHour);
          if (exact) {
            throw new Error(
              `You already have this slot on ${dayOfWeek} (${startHour}:00–${endHour}:00).`,
            );
          }
          throw new Error(
            `That time overlaps another slot on ${dayOfWeek}. Change the hours or remove the existing slot first.`,
          );
        }

        const created = await prisma.availability.create({
          data: {
            userId,
            dayOfWeek,
            startHour,
            endHour,
          },
        });

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
        where: { id },
      });

      if (!existing || existing.userId !== userId) {
        throw new Error("Not authorized");
      }

      const newDay = input.dayOfWeek ?? existing.dayOfWeek;
      if (!VALID_DAYS.includes(newDay)) {
        throw new Error(`Invalid day: ${newDay}`);
      }

      const startRaw = input.startHour ?? existing.startHour;
      const endRaw = input.endHour ?? existing.endHour;
      const { start: newStart, end: newEnd } = normalizeHours(newDay, startRaw, endRaw);

      const otherSlots = await prisma.availability.findMany({
        where: {
          userId,
          dayOfWeek: newDay,
          NOT: { id },
        },
      });

      for (const slot of otherSlots) {
        if (hourIntervalsOverlap(newStart, newEnd, slot.startHour, slot.endHour)) {
          const exact = slot.startHour === newStart && slot.endHour === newEnd;
          if (exact) {
            throw new Error(`You already have this slot on ${newDay} (${newStart}:00–${newEnd}:00).`);
          }
          throw new Error(
            `That time overlaps another slot on ${newDay}. Change the hours or remove the other slot first.`,
          );
        }
      }

      const updated = await prisma.availability.update({
        where: { id },
        data: {
          dayOfWeek: newDay,
          startHour: newStart,
          endHour: newEnd,
        },
      });

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
