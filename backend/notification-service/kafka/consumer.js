import { Kafka } from "kafkajs";
import { sendNotif } from "../schema/resolvers.js";

/*
 * ORIGINAL notification-service/kafka/consumer.js (before envelope + skip UserPreferencesUpdated):
 *
 * const kafka = new Kafka({
 *     clientId: "notification-service",
 *     brokers: ["kafka:9092"]
 * })
 * const admin = kafka.admin()
 *
 * const consumer = kafka.consumer({groupId: "notification-group"})
 *
 * export async function startConsumer(){
 *     await consumer.connect();
 *     await consumer.subscribe({topic: "notifications", fromBeginning: true})
 *     await consumer.run({
 *         eachMessage: async({message})=>{
 *             const raw = message.value?.toString()
 *             if(!raw) return;
 *             const event = JSON.parse(raw);
 *             const {
 *                 eventName,
 *                 timestamp,
 *                 producerService,
 *                 correlationId,
 *                 payload
 *             } = event;
 *             console.log("Received event:", {
 *                 eventName,
 *                 timestamp,
 *                 producerService,
 *                 correlationId
 *             });
 *             if(!payload){
 *                 console.warn("Missing payload, skipping message.")
 *                 return;
 *             }
 *             await sendNotif(payload.recipient, payload.subject, payload.message);
 *         }
 *     })
 *     console.log("Kafka Notification Consumer Is Running...")
 * }
 */

/**
 * Topic `notifications` (shared contract):
 * - UserPreferencesUpdated — profile service; matching-service consumes; this consumer skips.
 * - NotificationRequested — matching / buddy / study-session; persist via sendNotif.
 * Legacy: flat { recipient, subject, message } (still accepted).
 */

const kafka = new Kafka({
  clientId: "notification-service",
  brokers: [process.env.KAFKA_BROKER || "kafka:9092"],
});

const consumer = kafka.consumer({ groupId: "notification-group" });

function parseNotificationPayload(parsed) {
  const eventType = parsed.event ?? parsed.eventName;
  if (eventType === "UserPreferencesUpdated") {
    return { skip: true };
  }
  if (eventType === "NotificationRequested" && parsed.payload && typeof parsed.payload === "object") {
    const { recipient, subject, message } = parsed.payload;
    if (recipient != null && subject != null && message != null) {
      return { recipient, subject, message };
    }
    return null;
  }
  // Legacy flat (no envelope)
  if (!eventType && parsed.recipient != null && parsed.subject != null && parsed.message != null) {
    return { recipient: parsed.recipient, subject: parsed.subject, message: parsed.message };
  }
  // Misnamed envelope field (eventName + payload)
  if (parsed.eventName && parsed.payload && typeof parsed.payload === "object") {
    const { recipient, subject, message } = parsed.payload;
    if (recipient != null && subject != null && message != null) {
      return { recipient, subject, message };
    }
  }
  return null;
}

export async function startConsumer() {
  await consumer.connect();
  await consumer.subscribe({ topic: "notifications", fromBeginning: true });
  await consumer.run({
    eachMessage: async ({ message }) => {
      const raw = message.value?.toString();
      if (!raw) return;
      let parsed;
      try {
        parsed = JSON.parse(raw);
      } catch {
        console.warn("notification-service: invalid JSON on notifications topic");
        return;
      }
      const eventType = parsed.event ?? parsed.eventName;
      const parsedPayload = parseNotificationPayload(parsed);
      if (parsedPayload?.skip) return;
      if (!parsedPayload) {
        console.warn("notification-service: unhandled notifications message", { eventType });
        return;
      }
      const { recipient, subject, message } = parsedPayload;
      console.log("Received notification event:", {
        eventType: eventType || "flat",
        timestamp: parsed.timestamp,
        producerService: parsed.producerService,
        correlationId: parsed.correlationId,
      });
      await sendNotif(recipient, subject, message);
    },
  });
  console.log("Kafka Notification Consumer Is Running...");
}
