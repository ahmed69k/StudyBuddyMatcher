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
// ORIGINAL: const server = new ApolloServer({ typeDefs, resolvers }); // no introspection
const server = new ApolloServer({
  typeDefs,
  resolvers,
  // EDIT: INTROSPECTION ON FOR GRAPHQL GATEWAY / TOOLING
  introspection: true,
});

// ORIGINAL: jwt.verify(token, process.env.SECRET_KEY) inline in context (no trim / no jwtSecret const)
// EDIT: TRIM JWT SECRET FROM .ENV
const jwtSecret = process.env.SECRET_KEY?.trim();

const { url } = await startStandaloneServer(server, {
  listen: { port: 3000, host: "0.0.0.0" },
  context: ({ req }) => {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.replace("Bearer ", "").trim();

    if (!token) {
      return { user: null };
    }

    // ORIGINAL: no missing-secret guard
    // EDIT: GUARD IF SECRET_KEY MISSING
    if (!jwtSecret) {
      console.warn("user-and-auth-service: SECRET_KEY is not set");
      return { user: null };
    }

    try {
      // ORIGINAL: const user = jwt.verify(token, process.env.SECRET_KEY);
      // EDIT: VERIFY WITH TRIMMED SECRET
      const user = jwt.verify(token, jwtSecret);
      return { user };
    } catch (err) {
      console.warn("Invalid token:", err.message);
      return { user: null };
    }
  },
});
console.log(`Server is ready at ${url}`)

