import { connectProducer, publishEvent } from './producer.js';

const test = async () => {
  console.log('Testing Kafka Connection...');
  await connectProducer();
  
  await publishEvent("TestEvent", { 
    userId: "test-user-123", 
    status: "Kafka is working 🚀" 
  });
  
  console.log('Test message sent! Check console for success.');
  // Wait a second for the message to send before closing
  setTimeout(() => process.exit(0), 1000);
};

test();