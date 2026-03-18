import { prisma } from "../index.js"

const resolvers ={
    Query: {
        getAllUsers: async()=>{
            return await prisma.user.findMany();
        },
        getUser:async(_,{id})=>{
            return await prisma.user.findUnique({where: {id}})
        }

    },
    Mutation: {
        createUser: async(_,{input})=>{
            const {email,password,username,profilePicture} = input;
            const data = {email, password, username, profilePicture: profilePicture ?? null}
            return await prisma.user.create({
                data
            })
        }
    }
}
export default resolvers