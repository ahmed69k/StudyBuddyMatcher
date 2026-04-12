import { Kafka } from "kafkajs";
import { sendNotif } from "../schema/resolvers.js";

const kafka = new Kafka({
    clientId: "notification-service",
    brokers: ["kafka:9092"]
})
const admin = kafka.admin()

const consumer = kafka.consumer({groupId: "notification-group"})

export async function startConsumer(){
    await consumer.connect();
    await consumer.subscribe({topic: "notifications", fromBeginning: true})
    await consumer.run({
        eachMessage: async({message})=>{
            const data = JSON.parse(message.value.toString());
            await sendNotif(data.recipient, data.subject, data.message);
        }
    })
    console.log("Kafka Notification Consumer Is Running...")
}