import { Kafka } from "kafkajs";

const kafka = new Kafka({
  clientId: "test-producer",
  brokers: ["localhost:29092"], // host-to-docker connection
});

const producer = kafka.producer();

async function run() {
  await producer.connect();

  const testMessage = {
    recipient: "cmne3vo9a0000ysltuuwbwzw9",
    subject: "Test Notification",
    message: "This is a test message from the Kafka test producer."
  };

  const result = await producer.send({
    topic: "notifications",
    messages: [
      {
        key: "test",
        value: JSON.stringify(testMessage),
      },
    ],
  });

  console.log("Test notification sent:", result);

  await producer.disconnect();
}

run().catch(console.error);