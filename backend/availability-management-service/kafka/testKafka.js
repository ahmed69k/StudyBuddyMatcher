import { connectProducer, publishEvent } from "./producer.js";

const test = async () => {
  await connectProducer();

  await publishEvent("TestEvent", {
    message: "Kafka is working 🚀"
  });

  process.exit();
};

test();
