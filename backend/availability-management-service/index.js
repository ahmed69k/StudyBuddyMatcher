import { ApolloServer } from "@apollo/server";
import { startStandaloneServer } from "@apollo/server/standalone";
import typeDefs from "./schema/type-defs.js";
import resolvers from "./schema/resolvers.js";
import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";
import { PrismaPg } from "@prisma/adapter-pg";
// import { connectProducer } from "./kafka/producer.js"; //disable for now
import "dotenv/config";

// Prisma + NeonDB
const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

export const prisma = new PrismaClient({ adapter });

// Apollo Server
const server = new ApolloServer({
  typeDefs,
  resolvers,
  introspection: true,
});

// Start everything
const startServer = async () => {
  try {
    // Connect Kafka first
    // await connectProducer(); //disable for now

    const { url } = await startStandaloneServer(server, {
      listen: { port: process.env.PORT || 4000 },

      context: async ({ req }) => {
        const authHeader = req.headers.authorization || "";
        const token = authHeader.replace("Bearer ", "").trim();

        let user = null;

        if (token) {
          try {
            user = jwt.verify(token, process.env.SECRET_KEY);
          } catch (err) {
            // throw new Error("Unable to verify token");
            // user = null; // DO NOT throw
          }
        }

        return { user };
      },

    // // for testing
    //     context: async () => {
    //       return { user: { id: "test-user-123" } };
    //   },

    });


    console.log(`🚀 Availability Service running at ${url}`);
  } catch (err) {
    console.error("❌ Server failed to start:", err);
  }
};

startServer();
