import { ApolloServer } from "@apollo/server";
import { startStandaloneServer } from "@apollo/server/standalone";
import typeDefs from "./schema/type-defs.js";
import resolvers from "./schema/resolvers.js";
import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";
import { PrismaPg } from "@prisma/adapter-pg";
import { connectProducer } from "./kafka/producer.js";
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

const port = Number(process.env.PORT) || 4003;

// Start everything
const startServer = async () => {
  try {
    // Do not block GraphQL on Kafka (gateway and dev UX stay up if broker is slow/down).
    connectProducer().catch((err) =>
      console.error("❌ Kafka producer (availability):", err?.message || err)
    );

    const { url } = await startStandaloneServer(server, {
      listen: { port, host: "0.0.0.0" },
      context: async ({ req }) => {
        const authHeader = req.headers.authorization || "";
        const token = authHeader.replace("Bearer ", "").trim();

        if (!token) {
          return { user: null };
        }

        try {
          const user = jwt.verify(token, process.env.SECRET_KEY);
          return { user };
        } catch (err) {
          console.warn("Invalid token:", err.message);
          return { user: null };
        }
      },
    });

    console.log(`🚀 Availability Service running at ${url}`);
  } catch (err) {
    console.error("❌ Server failed to start:", err);
  }
};

startServer();
