import { Kafka } from 'kafkajs';
import { randomUUID } from 'crypto';
import 'dotenv/config';

const kafka = new Kafka({
  clientId: 'profile-and-study-preferences-service',
  // ORIGINAL: brokers: [process.env.KAFKA_BROKER], // no fallback, no retry block
  // EDIT: DEFAULT BROKER IF ENV MISSING; RETRIES FOR SLOW KAFKA START
  brokers: [process.env.KAFKA_BROKER || 'localhost:9092'],
  retry: {
    retries: Number(process.env.KAFKA_RETRIES || 8),
    initialRetryTime: Number(process.env.KAFKA_RETRY_INITIAL_MS || 300),
  },
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