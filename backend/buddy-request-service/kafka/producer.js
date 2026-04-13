import { Kafka } from "kafkajs";
import { randomUUID } from "crypto";
import "dotenv/config";

const kafka = new Kafka({
  clientId: "buddy-request-service",
  brokers: [process.env.KAFKA_BROKER || "localhost:9092"],
  retry: {
    retries: Number(process.env.KAFKA_RETRIES || 1),
    initialRetryTime: Number(process.env.KAFKA_RETRY_INITIAL_MS || 100),
  },
});

const producer = kafka.producer();
let isConnected = false;

export const connectProducer = async () => {
  try {
    await producer.connect();
    isConnected = true;
    console.log("✅ Kafka Producer connected (buddy-request-service)");
  } catch (err) {
    isConnected = false;
    console.warn("⚠️ Kafka Producer not connected (buddy-request-service):", err?.message || err);
  }
};

/** Envelope for other microservices (matching spec: event, timestamp, producer, correlationId, payload). */
export const publishBuddyRequestEvent = async (eventName, payload) => {
  if (!isConnected) return;
  const message = {
    event: eventName,
    timestamp: new Date().toISOString(),
    producerService: "buddy-request-service",
    correlationId: randomUUID(),
    payload,
  };
  await producer.send({
    topic: "buddy-request-updates",
    messages: [{ value: JSON.stringify(message) }],
  });
};

/** Same shape as study-session-scheduling-service → notification-service consumer. */
export const publishNotification = async ({ recipient, subject, message }) => {
  if (!isConnected) return;
  await producer.send({
    topic: "notifications",
    messages: [{ value: JSON.stringify({ recipient, subject, message }) }],
  });
};
