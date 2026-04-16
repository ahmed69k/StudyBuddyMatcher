import { ApolloServer } from "@apollo/server";
import { startStandaloneServer } from "@apollo/server/standalone"
import typeDefs from './schema/type-defs.js'
import resolvers from './schema/resolvers.js'
import pkg from "@prisma/client"
const {PrismaClient} = pkg
import jwt from "jsonwebtoken"
import {PrismaPg} from "@prisma/adapter-pg"
import "dotenv/config";

const adapter = new PrismaPg({connectionString: process.env.DATABASE_URL})
export const prisma = new PrismaClient({adapter});
const server = new ApolloServer({
  typeDefs,
  resolvers,
  introspection: true,
});
const jwtSecret = process.env.SECRET_KEY?.trim();

const { url } = await startStandaloneServer(server, {
  listen: { port: 3000, host: "0.0.0.0" },
  context: ({ req }) => {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.replace("Bearer ", "").trim();

    if (!token) {
      return { user: null };
    }
    if (!jwtSecret) {
      console.warn("user-and-auth-service: SECRET_KEY is not set");
      return { user: null };
    }

    try {
      const user = jwt.verify(token, jwtSecret);
      return { user };
    } catch (err) {
      console.warn("Invalid token:", err.message);
      return { user: null };
    }
  },
});
console.log(`Server is ready at ${url}`)

