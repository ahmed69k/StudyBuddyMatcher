import { Kafka } from "kafkajs";
import "dotenv/config";

// 🧠 Create Kafka instance
const kafka = new Kafka({
  clientId: "availability-service",
  brokers: [process.env.KAFKA_BROKER],
});

// 📣 Create producer
const producer = kafka.producer();

let isConnected = false;

// 🔌 Connect producer (only once)
export const connectProducer = async () => {
  if (isConnected) return;

  try {
    await producer.connect();
    isConnected = true;
    console.log("✅ Kafka Producer Connected");
  } catch (error) {
    console.error("❌ Kafka Connection Error:", error);
  }
};

// // 📤 Publish event
// export const publishEvent = async (eventType, payload) => {
//   try {
//     if (!isConnected) {
//       await connectProducer();
//     }

//     await producer.send({
//       topic: "availability-events",
//       messages: [
//         {
//           key: eventType,
//           value: JSON.stringify({
//             event: eventType,
//             timestamp: new Date().toISOString(),
//             service: "availability-service",
//             data: payload,
//           }),
//         },
//       ],
//     });

//     console.log(`📣 Event sent: ${eventType}`);
//   } catch (error) {
//     console.error("❌ Failed to send event:", error);
//   }
// };

export const publishEvent = async () => {
  console.log("Kafka skipped");
};

