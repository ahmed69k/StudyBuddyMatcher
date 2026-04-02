import { prisma } from "../index.js"
const resolvers = {
    Query:{
        getUserConversations: async(_,__,context)=>{
            if(!context.user) throw new Error("Unauthenticated. Please log in to use messages.")
            const ctxUser = context.user;
            const conversations = await prisma.conversation.findMany({
                where:{
                    users:{
                        has:ctxUser.id
                    }
                },
                include:{
                    messages:{
                        orderBy:{
                            sendDate: 'desc'
                        }
                    }
                }
            })
            return conversations;
        }
    },
    Mutation:{
        createConversation: async(_,{input},context)=>{
            if(!context.user) throw new Error("Unauthenticated. Please log in to use messages.")
            const ctxUser = context.user
            const {addedUser} = input
            const existingConversation = await prisma.conversation.findFirst({
                where:{
                    users:{
                        hasEvery: [ctxUser.id, addedUser]
                    }
                }
            })
            if(existingConversation) throw new Error("You already have an existing conversation with this user.")
            const newConversation = await prisma.conversation.create({
                data:{
                    users:[ctxUser.id, addedUser]
                }
            })
            return newConversation
        },
        sendMessage: async(_,{input},context)=>{
            if(!context.user) throw new Error("Unauthenticated. Please log in to use messages.")
            const ctxUser = context.user
            const {conversationId, message} = input
            const foundConvo = await prisma.conversation.findFirst({
                where:{
                    users:{
                        has: ctxUser.id
                    },
                    id: conversationId
                }
            })
            if(!foundConvo) throw new Error("Conversation not found.")
            const newMessage = await prisma.message.create({
                data:{
                    senderId: ctxUser.id,
                    conversationId: conversationId,
                    message: message
                }
            })
            return {
                response: "Success!",
                message: newMessage
            };
        }
    }
}
export default resolvers