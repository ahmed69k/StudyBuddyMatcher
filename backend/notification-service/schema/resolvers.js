import { prisma } from "../index.js"

export async function sendNotif(recipient, subject, message){
    const data = {recipient,subject,message}
    const notifications = await prisma.notification.create({
        data
    })
    return notifications
}
const resolvers = {
    Query:{
        getMyNotifications: async(_,__,context)=>{
            if(!context.user){
                throw new Error("Unauthorized Access")
            }
            const notifications = await prisma.notification.findMany({
                where:{
                    recipient: context.user.id
                },
                orderBy:{
                    date: 'desc'
                }
            })
            return notifications;
        }
    },
    Mutation:{
        sendNotification: async(_,{input})=>{
            const {recipient,subject,message} = input
            const data = {recipient,subject,message}
            const notification = await sendNotif(recipient, subject, message);
            return `Notification sent to user with ID: ${recipient}`
        },
        openNotification: async(_,{notificationID},context)=>{
            if(!context.user) throw new Error("Unauthenticated!")
            const notification = await prisma.notification.findFirst({
                where:{
                    recipient:context.user.id,
                    id: notificationID
                }
            })
            if(!notification) throw new Error("Unauthorized!");
            const updatedNotif = await prisma.notification.update({
                where:{
                    id: notificationID
                },
                data:{
                    readStatus: true
                }
            })
            return updatedNotif;
        }
    }
}
export default resolvers