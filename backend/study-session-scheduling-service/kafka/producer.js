import { Kafka } from "kafkajs";
import { randomUUID } from "crypto";
import "dotenv/config";

const kafka = new Kafka({
  clientId: "study-session-scheduling-service",
  brokers: [process.env.KAFKA_BROKER || "localhost:9092"],
  // ORIGINAL: retries default 1, initialRetryTime default 100
  // EDIT: HIGHER DEFAULT KAFKA RETRIES FOR SLOW BROKER STARTUP
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

const producer = kafka.producer();
let isConnected = false;

/** Connects the Kafka producer once; sets `isConnected` so publish helpers skip work if the broker was down. */
export const connectProducer = async () => {
  try {
    await producer.connect();
    isConnected = true;
    console.log("✅ Kafka Producer connected (study-session-scheduling-service)");
  } catch (err) {
    isConnected = false;
    console.warn("⚠️ Kafka Producer not connected (study-session-scheduling-service):", err?.message || err);
  }
};

/** Emits lifecycle events (`StudySessionCreated`, updates, join/leave/cancel) to `study-session-events` for other services. */
export const publishDomainEvent = async (topic, eventName, payload) => {
  if (!isConnected) return;
  const message = {
    eventName,
    timestamp: new Date().toISOString(),
    producerService: "study-session-scheduling-service",
    correlationId: randomUUID(),
    payload,
  };

  await producer.send({
    topic,
    messages: [{ value: JSON.stringify(message) }],
  });

  const sessionId = payload?.sessionId;
  const extra =
    sessionId != null
      ? ` sessionId=${sessionId}`
      : payload?.userId != null
        ? ` userId=${payload.userId}`
        : "";
  console.log(
    `[study-session-scheduling-service] Kafka published ${eventName} topic=${topic}${extra}`
  );
};

// ORIGINAL:
// await producer.send({
//   topic: "notifications",
//   messages: [{ value: JSON.stringify({ recipient, subject, message }) }],
// });
/**
 * Sends a user notification by publishing a `NotificationRequested` envelope to `notifications` for notification-service.
 */
export const publishNotification = async ({ recipient, subject, message }) => {
  if (!isConnected) return;
  const envelope = {
    eventName: "NotificationRequested",
    timestamp: new Date().toISOString(),
    producerService: "study-session-scheduling-service",
    correlationId: randomUUID(),
    payload: { recipient, subject, message },
  };
  await producer.send({
    topic: "notifications",
    messages: [{ value: JSON.stringify(envelope) }],
  });

  console.log(
    `[study-session-scheduling-service] Kafka published NotificationRequested topic=notifications recipient=${recipient}`
  );
};

