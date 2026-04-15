import { Kafka } from "kafkajs";
import { randomUUID } from "crypto";
import "dotenv/config";

const kafka = new Kafka({
  clientId: "matching-service",
  brokers: [process.env.KAFKA_BROKER || "localhost:9092"],
  // ORIGINAL: retries: Number(process.env.KAFKA_RETRIES || 1), initialRetryTime: Number(process.env.KAFKA_RETRY_INITIAL_MS || 100),
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

const producer = kafka.producer();
let isConnected = false;

export const connectProducer = async () => {
  try {
    await producer.connect();
    isConnected = true;
    console.log("✅ Kafka Producer connected (matching-service)");
  } catch (err) {
    isConnected = false;
    console.warn("⚠️ Kafka Producer not connected (matching-service):", err?.message || err);
  }
};

export const publishDomainEvent = async (topic, eventName, payload) => {
  if (!isConnected) return;
  const message = {
    event: eventName,
    timestamp: new Date().toISOString(),
    producerService: "matching-service",
    correlationId: randomUUID(),
    payload,
  };

  await producer.send({
    topic,
    messages: [{ value: JSON.stringify(message) }],
  });
};

// ORIGINAL: flat body only — notification consumer expected { recipient, subject, message } at top level.
// await producer.send({
//   topic: "notifications",
//   messages: [{ value: JSON.stringify({ recipient, subject, message }) }],
// });
/** EDIT: same envelope as buddy-request / study-session → notification-service consumer. */
export const publishNotification = async ({ recipient, subject, message }) => {
  if (!isConnected) return;
  const envelope = {
    event: "NotificationRequested",
    timestamp: new Date().toISOString(),
    producerService: "matching-service",
    correlationId: randomUUID(),
    payload: { recipient, subject, message },
  };
  await producer.send({
    topic: "notifications",
    messages: [{ value: JSON.stringify(envelope) }],
  });
};

/** Buddy-request lifecycle on topic consumed by downstream services (same topic as former buddy-request-service). */
export const publishBuddyRequestEvent = async (eventName, payload) => {
  if (!isConnected) return;
  const message = {
    event: eventName,
    timestamp: new Date().toISOString(),
    producerService: "matching-service",
    correlationId: randomUUID(),
    payload,
  };
  await producer.send({
    topic: "buddy-request-updates",
    messages: [{ value: JSON.stringify(message) }],
  });
};

