import { prisma } from "../index.js"
const resolvers = {
    Query:{
        
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
        }
    }
}
export default resolvers