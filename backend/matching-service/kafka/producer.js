import { Kafka } from "kafkajs";
import { randomUUID } from "crypto";
import "dotenv/config";

const kafka = new Kafka({
  clientId: "matching-service",
  brokers: [process.env.KAFKA_BROKER || "localhost:9092"],
  retry: {
    retries: Number(process.env.KAFKA_RETRIES || 1),
    initialRetryTime: Number(process.env.KAFKA_RETRY_INITIAL_MS || 100),
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

// Align with existing notification-service consumer which expects:
// { recipient, subject, message } (flat, no envelope)
export const publishNotification = async ({ recipient, subject, message }) => {
  if (!isConnected) return;
  await producer.send({
    topic: "notifications",
    messages: [{ value: JSON.stringify({ recipient, subject, message }) }],
  });
};

