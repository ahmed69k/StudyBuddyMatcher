import { connectProducer, publishEvent } from './matchingProd.js';

async function test() {
  await connectProducer();
  await publishEvent('UserPreferencesUpdated', {
    userId: 'test-user-123',
    courses: ['Math 101'],
    topics: ['Calculus'],
    studyPreference: {
      pace: 'fast',
      mode: 'online',
      groupSize: 3,
      studyStyle: 'discussing',
    },
  });
  console.log('Test complete!');
  process.exit(0);
}

test().catch(console.error);