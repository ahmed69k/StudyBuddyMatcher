import { Kafka } from 'kafkajs';
import { randomUUID } from 'crypto';
import dotenv from 'dotenv';

const envPath = new URL('../.env', import.meta.url).pathname;
dotenv.config({ path: envPath });

const kafkaBrokers = process.env.KAFKA_BROKER
  ? process.env.KAFKA_BROKER.split(',').map((broker) => broker.trim()).filter(Boolean)
  : [];

if (!kafkaBrokers.length) {
  throw new Error('KAFKA_BROKER must be defined and contain at least one broker host:port');
}

const kafka = new Kafka({
  clientId: 'profile-and-study-preferences-service',
  brokers: kafkaBrokers,
  ...(process.env.KAFKA_USERNAME && {
    sasl: {
      mechanism: 'plain',
      username: process.env.KAFKA_USERNAME,
      password: process.env.KAFKA_PASSWORD,
    },
    ssl: true,
  }),
});

const producer = kafka.producer();

export const connectProducer = async () => {
  await producer.connect();
  console.log('Kafka producer connected');
};

export const publishEvent = async (eventName, payload) => {
  const message = {
    event: eventName,
    timestamp: new Date().toISOString(),
    producerService: 'profile-and-study-preferences-service',
    correlationId: randomUUID(),
    payload,
  };

  await producer.send({
    topic: 'user-preferences-updated',
    messages: [{ value: JSON.stringify(message) }],
  });

  console.log(`Event published: ${eventName}`);
};