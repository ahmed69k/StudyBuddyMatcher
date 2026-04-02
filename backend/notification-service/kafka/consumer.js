import { Kafka } from "kafkajs";
import { sendNotif } from "../schema/resolvers.js";

const kafka = new Kafka({
    clientId: "notification-service",
    brokers: ["localhost:29092"]
})

const consumer = kafka.consumer({groupId: "notification-group"})

export async function startConsumer(){
    await consumer.connect();
    await consumer.subscribe({topic: "notifications"})
    await consumer.run({
        eachMessage: async({message})=>{
            const data = JSON.parse(message.value.toString());
            await sendNotif(data.recipient, data.subject, data.message);
        }
    })
    console.log("Kafka Notification Consumer Is Running...")
}