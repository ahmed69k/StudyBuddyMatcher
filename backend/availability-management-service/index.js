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

// APOLLO SERVER
// ORIGINAL: const server = new ApolloServer({ typeDefs, resolvers });
const server = new ApolloServer({
  typeDefs,
  resolvers,
  // EDIT: INTROSPECTION ON FOR GRAPHQL GATEWAY / TOOLING
  introspection: true,
});

// ORIGINAL: default port was 4000 (same as notifications if both ran locally)
// EDIT: TEAM SCHEME — AVAILABILITY = 3002 (auth host 3007→3000 in compose, profile 3001, … notif 3005)
const port = Number(process.env.PORT) || 3002;

// START EVERYTHING
const startServer = async () => {
  try {
    // Warm Kafka in background; publishEvent() also awaits connectProducer() so sends never race ahead of connect.
    connectProducer().catch((err) =>
      console.error("❌ Kafka producer (availability):", err?.message || err)
    );

    const { url } = await startStandaloneServer(server, {
      // ORIGINAL: listen: { port: process.env.PORT || 4000 } then 4003
      // EDIT: 0.0.0.0 SO OTHER DOCKER CONTAINERS CAN REACH THIS SERVICE
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
