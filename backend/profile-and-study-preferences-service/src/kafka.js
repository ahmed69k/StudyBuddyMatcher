import { Kafka } from 'kafkajs';
import { randomUUID } from 'crypto';
import 'dotenv/config';

const kafka = new Kafka({
  clientId: 'profile-and-study-preferences-service',
  brokers: [process.env.KAFKA_BROKER],
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

  await producer.send({
    topic: 'notifications',
    messages: [{ value: JSON.stringify(message) }],
  });

  console.log(`Event published to notifications: ${eventName}`);
};