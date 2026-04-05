import { Kafka } from 'kafkajs';
import { randomUUID } from 'crypto';
import 'dotenv/config';

const kafka = new Kafka({
  clientId: 'availability-management-service',
  // Uses 29092 for local testing outside of Docker
  brokers: [process.env.KAFKA_BROKER || 'localhost:29092'],
});

const producer = kafka.producer();

export const connectProducer = async () => {
  try {
    await producer.connect();
    console.log('✅ Kafka Producer connected');
  } catch (error) {
    console.error('❌ Kafka connection error:', error);
  }
};

export const publishEvent = async (eventName, payload) => {
  const message = {
    event: eventName,
    timestamp: new Date().toISOString(),
    producerService: 'availability-management-service',
    correlationId: randomUUID(),
    payload,
  };

  try {
    await producer.send({
      topic: 'availability-updates',
      messages: [{ value: JSON.stringify(message) }],
    });
    console.log(`📡 Event published: ${eventName}`);
  } catch (error) {
    console.error('❌ Kafka publish error:', error);
  }
};