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
  // ORIGINAL: await producer.connect(); (throws if Kafka down)
  // EDIT: DO NOT CRASH APP IF KAFKA IS DOWN
  try {
    await producer.connect();
    console.log('Kafka producer connected (profile-and-study-preferences-service)');
  } catch (err) {
    console.warn('⚠️ Kafka producer not connected (profile-and-study-preferences-service):', err?.message || err);
  }
};

export const publishEvent = async (eventName, payload) => {
  const message = {
    eventName,
    timestamp: new Date().toISOString(),
    producerService: 'profile-and-study-preferences-service',
    correlationId: randomUUID(),
    payload:
      eventName === 'UserPreferencesUpdated'
        ? {
            recipient: payload.userId,
            subject: 'Your profile and study preferences were updated',
            message: 'Your updated profile and study preference information has been saved.',
          }
        : payload,
  };

  // ORIGINAL:
  // await producer.send({
  //   topic: 'user-events',
  //   messages: [{ value: JSON.stringify(message) }],
  // });
  // EDIT: topic `notifications` so matching-service consumes UserPreferencesUpdated on the same topic contract.
  await producer.send({
    topic: 'notifications',
    messages: [{ value: JSON.stringify(message) }],
  });

  console.log(`Event published to notifications: ${eventName}`);
};