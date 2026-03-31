import { prisma } from "../index.js"

export async function sendMail(recipient, subject, message){
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
            const notification = await sendMail(recipient, subject, message);
            return `Notification sent to user with ID: ${recipient}`
        }
    }
}
export default resolvers