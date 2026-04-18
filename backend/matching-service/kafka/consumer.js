/**
 * Everything that writes matching.UserProfile:
 *
 * 1) GraphQL upsertUserProfile — manual PATCH-merge (see resolvers): omitted fields keep DB values.
 * 2) Kafka UserPreferencesUpdated (from profile service) — syncs courses, topics, study prefs; when payload
 *    includes name/email (or userName/userEmail from profile service) they are applied on create and update
 *    (omitted keys keep existing name/email on update).
 * 3) Kafka AvailabilityCreated | Updated | Deleted (topic availability-updates) — merges slot strings into
 *    availability[]; may create a stub row (name "Unknown") if none exists yet.
 */
import { Kafka } from "kafkajs";
import "dotenv/config";
import { publishTopMatchAfterDataChange } from "../schema/resolvers.js";

const kafka = new Kafka({
  clientId: "matching-service",
  brokers: [process.env.KAFKA_BROKER || "localhost:9092"],
  // ORIGINAL: retries: 1, initialRetryTime: 100 (via env defaults)
  // EDIT: HIGHER DEFAULT RETRIES WHEN KAFKA STARTS AFTER THIS SERVICE
  retry: {
    retries: Number(process.env.KAFKA_RETRIES || 8),
    initialRetryTime: Number(process.env.KAFKA_RETRY_INITIAL_MS || 300),
  },
  ...(process.env.KAFKA_USERNAME && {
    sasl: {
      mechanism: "plain",
      username: process.env.KAFKA_USERNAME,
      password: process.env.KAFKA_PASSWORD,
    },
    ssl: true,
  }),
});

const groupId = process.env.KAFKA_GROUP_ID || "matching-group";
const consumer = kafka.consumer({ groupId });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const getEnvelope = (raw) => {
  if (!raw) return null;
  const parsed = JSON.parse(raw);
  if (!parsed || typeof parsed !== "object") return null;
  // Spec envelope: eventName + payload. Legacy producers used `event` instead of eventName.
  if ("payload" in parsed) {
    const eventName = parsed.eventName ?? parsed.event ?? null;
    if (eventName != null) return { eventName, payload: parsed.payload };
  }
  return { eventName: null, payload: parsed };
};

const availabilitySlotToString = (slot) => {
  const day = slot.dayOfWeek ?? slot.day ?? slot.weekday;
  const start = slot.startHour ?? slot.start ?? slot.from;
  const end = slot.endHour ?? slot.end ?? slot.to;
  if (day == null || start == null || end == null) return null;
  return `${day} ${start}-${end}`;
};

/** Profile service may publish UserPreferencesUpdated on `notifications` or legacy topic `user-preferences-updated`. */
async function handleUserPreferencesUpdated(prisma, topic, env) {
  if (env.eventName !== "UserPreferencesUpdated") return false;

  const payload = env.payload || {};
  const pref = payload.studyPreference || {};
  /** Display name for matching is the auth username; producers may send name, userName, or username. */
  const identityName =
    payload.name !== undefined && payload.name !== null
      ? payload.name
      : payload.userName !== undefined && payload.userName !== null
        ? payload.userName
        : payload.username;
  const identityEmail =
    payload.email !== undefined ? payload.email : payload.userEmail;

  const userId = payload.userId;
  if (!userId) return true;

  let mergedName;
  if (identityName !== undefined) {
    const trimmed = String(identityName).trim();
    mergedName = trimmed !== "" ? trimmed : "Unknown";
  }

  const updateData = {
    courses: payload.courses || [],
    topics: payload.topics || [],
    studyPace: pref.pace ?? null,
    studyMode: pref.mode ?? null,
    preferredGroupSize: pref.groupSize ?? null,
    studyStyle: pref.studyStyle ?? null,
  };
  if (mergedName !== undefined) {
    updateData.name = mergedName;
  }
  if (identityEmail !== undefined) updateData.email = identityEmail;

  await prisma.userProfile.upsert({
    where: { userId },
    create: {
      userId,
      name:
        identityName !== undefined && String(identityName).trim() !== ""
          ? String(identityName).trim()
          : "Unknown",
      email: identityEmail ?? null,
      courses: payload.courses || [],
      topics: payload.topics || [],
      studyPace: pref.pace ?? null,
      studyMode: pref.mode ?? null,
      preferredGroupSize: pref.groupSize ?? null,
      studyStyle: pref.studyStyle ?? null,
      availability: [],
    },
    update: updateData,
  });

  console.log(
    `[matching-service] Kafka handled UserPreferencesUpdated topic=${topic} userId=${userId}`
  );
  try {
    await publishTopMatchAfterDataChange(prisma, userId);
  } catch (err) {
    console.warn("[matching-service] publishTopMatchAfterDataChange:", err?.message || err);
  }
  return true;
}

export const startConsumer = async (prisma) => {
  try {
    await consumer.connect();
  } catch (err) {
    console.warn("⚠️ Kafka consumer not connected (matching-service):", err?.message || err);
    return;
  }

  // Profile: UserPreferencesUpdated — topic may be "notifications" and/or "user-preferences-updated" (legacy producers).
  // Availability: AvailabilityCreated | Updated | Deleted on "availability-updates".
  // ORIGINAL subscribe (single try, no retry/backoff):
  // try {
  //   await consumer.subscribe({ topic: "notifications" });
  //   await consumer.subscribe({ topic: "availability-updates" });
  // } catch (err) {
  //   console.warn("⚠️ Kafka consumer subscribe failed (matching-service):", err?.message || err);
  //   return;
  // }
  const maxSubscribeAttempts = Number(process.env.KAFKA_SUBSCRIBE_RETRIES || 12);
  let subscribeErr;
  for (let attempt = 1; attempt <= maxSubscribeAttempts; attempt++) {
    try {
      await consumer.subscribe({ topic: "notifications" });
      await consumer.subscribe({ topic: "user-preferences-updated" });
      await consumer.subscribe({ topic: "availability-updates" });
      subscribeErr = null;
      break;
    } catch (err) {
      subscribeErr = err;
      if (attempt === maxSubscribeAttempts) break;
      await sleep(400 * attempt);
    }
  }
  if (subscribeErr) {
    console.warn("⚠️ Kafka consumer subscribe failed (matching-service):", subscribeErr?.message || subscribeErr);
    return;
  }

  try {
    await consumer.run({
      eachMessage: async ({ topic, message }) => {
        const raw = message.value?.toString();
        const env = getEnvelope(raw);
        if (!env) return;

        if (
          (topic === "notifications" || topic === "user-preferences-updated") &&
          (await handleUserPreferencesUpdated(prisma, topic, env))
        ) {
          return;
        }

        if (topic === "availability-updates" && env.eventName) {
          const payload = env.payload || {};
          const userId = payload.userId;
          if (!userId) return;

          // Ensure profile exists (availability may arrive before profile updates)
          const existing = await prisma.userProfile.findUnique({ where: { userId } });
          if (!existing) {
            await prisma.userProfile.create({
              data: {
                userId,
                name: "Unknown",
                email: null,
                courses: [],
                topics: [],
                availability: [],
              },
            });
          }

          if (env.eventName === "AvailabilityDeleted") {
            const slotStr = availabilitySlotToString(payload);
            if (!slotStr) return;
            const current = await prisma.userProfile.findUnique({ where: { userId } });
            const next = (current?.availability || []).filter((s) => s !== slotStr);
            await prisma.userProfile.update({ where: { userId }, data: { availability: next } });
            console.log(
              `[matching-service] Kafka handled ${env.eventName} topic=${topic} userId=${userId} slot=${slotStr}`
            );
            try {
              await publishTopMatchAfterDataChange(prisma, userId);
            } catch (err) {
              console.warn("[matching-service] publishTopMatchAfterDataChange:", err?.message || err);
            }
            return;
          }

          if (env.eventName === "AvailabilityCreated" || env.eventName === "AvailabilityUpdated") {
            const slotStr = availabilitySlotToString(payload);
            if (!slotStr) return;
            const current = await prisma.userProfile.findUnique({ where: { userId } });
            const set = new Set(current?.availability || []);
            set.add(slotStr);
            await prisma.userProfile.update({ where: { userId }, data: { availability: Array.from(set) } });
            console.log(
              `[matching-service] Kafka handled ${env.eventName} topic=${topic} userId=${userId} slot=${slotStr}`
            );
            try {
              await publishTopMatchAfterDataChange(prisma, userId);
            } catch (err) {
              console.warn("[matching-service] publishTopMatchAfterDataChange:", err?.message || err);
            }
            return;
          }
        }
      },
    });
  } catch (err) {
    console.warn("⚠️ Kafka consumer run failed (matching-service):", err?.message || err);
    return;
  }

  console.log("Kafka consumer running (matching-service)...");
};

