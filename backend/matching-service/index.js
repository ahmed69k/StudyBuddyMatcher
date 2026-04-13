import { ApolloServer } from "@apollo/server";
import { startStandaloneServer } from "@apollo/server/standalone";
import typeDefs from "./schema/type-defs.js";
import resolvers from "./schema/resolvers.js";
import pkg from "@prisma/client";
const { PrismaClient } = pkg;
import { PrismaPg } from "@prisma/adapter-pg";
import jwt from "jsonwebtoken";
import { connectProducer } from "./kafka/producer.js";
import { startConsumer } from "./kafka/consumer.js";
import "dotenv/config";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const server = new ApolloServer({ typeDefs, resolvers });

const startServer = async () => {
  try {
    await prisma.$connect();
    await prisma.$queryRaw`SELECT 1`;
    console.log("✅ Prisma: connected to PostgreSQL (matching-service)");
  } catch (err) {
    console.error("❌ Prisma: database connection failed (matching-service):", err?.message || err);
    throw err;
  }

  // Don't block GraphQL startup on Kafka availability.
  // (Kafka may be down in dev; service should still run.)
  connectProducer().catch(() => {});
  startConsumer(prisma).catch(() => {});

  const { url } = await startStandaloneServer(server, {
    listen: { port: process.env.PORT || 4002, host: "0.0.0.0" },
    context: async ({ req }) => {
      const authHeader = req.headers.authorization || "";
      const token = authHeader.replace("Bearer ", "").trim();
      if (!token) return { user: null, prisma };
      try {
        const user = jwt.verify(token, process.env.SECRET_KEY);
        return { user, prisma };
      } catch (err) {
        console.warn("Invalid token:", err.message);
        return { user: null, prisma };
      }
    },
  });

  console.log(`Matching Service is ready at ${url}`);
};

startServer().catch((err) => {
  console.error("❌ Matching service failed to start:", err);
});
