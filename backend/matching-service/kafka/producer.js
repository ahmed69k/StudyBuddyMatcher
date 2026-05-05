import { Kafka } from "kafkajs";
import { randomUUID } from "crypto";
import "dotenv/config";

const kafka = new Kafka({
  clientId: "matching-service",
  brokers: [process.env.KAFKA_BROKER || "localhost:9092"],
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

let connectLogged = false;

/**
 * Same pattern as availability-management-service/kafka/producer.js:
 * await connect before every send so GraphQL handlers never race a background connect()
 * and silently skip publishes while isConnected was still false.
 */
export const connectProducer = async () => {
  await producer.connect();
  if (!connectLogged) {
    connectLogged = true;
    console.log("✅ Kafka Producer connected (matching-service)");
  }
};

/** Publishes a structured domain event (envelope with correlation id) to any Kafka topic — e.g. `matching-events`. */
export const publishDomainEvent = async (topic, eventName, payload) => {
  const message = {
    eventName,
    timestamp: new Date().toISOString(),
    producerService: "matching-service",
    correlationId: randomUUID(),
    payload,
  };

  try {
    await connectProducer();
    await producer.send({
      topic,
      messages: [{ value: JSON.stringify(message) }],
    });
  } catch (err) {
    console.error("❌ Kafka publish error (matching-service domain):", err?.message || err);
  }
};

/**
 * Asks the notification pipeline to notify a user by publishing `NotificationRequested`
 * on the shared `notifications` topic (consumed by notification-service).
 */
export const publishNotification = async ({ recipient, subject, message }) => {
  const envelope = {
    eventName: "NotificationRequested",
    timestamp: new Date().toISOString(),
    producerService: "matching-service",
    correlationId: randomUUID(),
    payload: { recipient, subject, message },
  };
  try {
    await connectProducer();
    await producer.send({
      topic: "notifications",
      messages: [{ value: JSON.stringify(envelope) }],
    });
    console.log(`📡 Notification published to Kafka (matching-service) recipient=${recipient}`);
  } catch (err) {
    console.error("❌ Kafka publish error (matching-service notification):", err?.message || err);
  }
};

/** Broadcasts buddy-request lifecycle changes (`BuddyRequestCreated`, accept/decline/cancel) for downstream consumers. */
export const publishBuddyRequestEvent = async (eventName, payload) => {
  const message = {
    eventName,
    timestamp: new Date().toISOString(),
    producerService: "matching-service",
    correlationId: randomUUID(),
    payload,
  };
  try {
    await connectProducer();
    await producer.send({
      topic: "buddy-request-updates",
      messages: [{ value: JSON.stringify(message) }],
    });
    console.log(`📡 Buddy-request event published: ${eventName}`);
  } catch (err) {
    console.error("❌ Kafka publish error (matching-service buddy-request):", err?.message || err);
  }
};
