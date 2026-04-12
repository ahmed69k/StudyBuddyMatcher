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
            const raw = message.value?.toString()
            if(!raw) return;
            const event = JSON.parse(raw);
            const {
                eventName,
                timestamp,
                producerService,
                correlationId,
                payload
            } = event;
            //where does the other info go brawg 😭🙏🏻
            console.log("Received event:", {
                eventName,
                timestamp,
                producerService,
                correlationId
            });
            if(!payload){
                console.warn("Missing payload, skipping message.")
                return;
            }
            await sendNotif(payload.recipient, payload.subject, payload.message);
        }
    })
    console.log("Kafka Notification Consumer Is Running...")
}