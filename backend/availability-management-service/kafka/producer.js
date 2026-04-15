import { Kafka } from 'kafkajs';
import { randomUUID } from 'crypto';
import 'dotenv/config';

const kafka = new Kafka({
  clientId: 'availability-management-service',
  // ORIGINAL: brokers: [process.env.KAFKA_BROKER || 'localhost:29092'], // local lab port
  // EDIT: align default with other services / Docker (9092)
  brokers: [process.env.KAFKA_BROKER || 'localhost:9092'],
});

const producer = kafka.producer();

let connectLogged = false;

export const connectProducer = async () => {
  // Idempotent: safe to call from startup and before each publish.
  await producer.connect();
  if (!connectLogged) {
    console.log("✅ Kafka Producer connected (availability-management-service)");
    connectLogged = true;
  }
};

export const publishEvent = async (eventName, payload) => {
  const message = {
    event: eventName,
    timestamp: new Date().toISOString(),
    producerService: "availability-management-service",
    correlationId: randomUUID(),
    payload,
  };

  try {
    // ORIGINAL: send without awaiting connect — races with non-blocking connectProducer() in index.js → "producer is disconnected".
    await connectProducer();
    await producer.send({
      topic: "availability-updates",
      messages: [{ value: JSON.stringify(message) }],
    });
    console.log(`📡 Event published: ${eventName}`);
  } catch (error) {
    console.error("❌ Kafka publish error:", error);
  }
};