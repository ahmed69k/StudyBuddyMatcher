import { ApolloServer } from "@apollo/server";
import { startStandaloneServer } from "@apollo/server/standalone"
import typeDefs from "./schema/type-defs.js";
import resolvers from "./schema/resolvers.js";
import {PrismaClient} from "@prisma/client"
import jwt from "jsonwebtoken"
import {PrismaPg} from "@prisma/adapter-pg"
import "dotenv/config";
const adapter = new PrismaPg({connectionString: process.env.DATABASE_URL})

export const prisma = new PrismaClient({adapter});
const server = new ApolloServer({
    typeDefs, 
    resolvers,

});
const { url } = await startStandaloneServer(server,{
    listen: {port: 3000},
    context: ({req})=>{
    const authHeader = req.headers.authorization || "";
    const token = authHeader.replace("Bearer ", "").trim();
    let user = null;
    try{
        user = jwt.verify(token, process.env.SECRET_KEY);
    }
    catch(err){
        throw new Error("Unable to verify.")
    }
    return {user}
}
})
console.log(`Server is ready at ${url}`)