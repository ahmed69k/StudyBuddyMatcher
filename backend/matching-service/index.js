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

const server = new ApolloServer({
  typeDefs,
  resolvers,
  introspection: true,
});

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const connectPrismaWithRetry = async () => {
  const maxAttempts = Number(process.env.PRISMA_CONNECT_RETRIES || 10);
  const delayMs = Number(process.env.PRISMA_CONNECT_DELAY_MS || 1500);
  let lastErr;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await prisma.$connect();
      await prisma.$queryRaw`SELECT 1`;
      if (attempt > 1) {
        console.log(`✅ Prisma: connected (matching-service) on attempt ${attempt}`);
      } else {
        console.log("✅ Prisma: connected to PostgreSQL (matching-service)");
      }
      return;
    } catch (err) {
      lastErr = err;
      console.warn(
        `⚠️ Prisma connect attempt ${attempt}/${maxAttempts} failed (matching-service):`,
        err?.message || err
      );
      if (attempt < maxAttempts) await sleep(delayMs);
    }
  }
  throw lastErr;
};

const port = Number(process.env.PORT) || 4002;
const jwtSecret = process.env.SECRET_KEY?.trim();

const startServer = async () => {
  await connectPrismaWithRetry();

  // Don't block GraphQL startup on Kafka availability.
  connectProducer().catch((err) =>
    console.warn("⚠️ Kafka producer (matching-service):", err?.message || err)
  );
  startConsumer(prisma).catch((err) =>
    console.warn("⚠️ Kafka consumer (matching-service):", err?.message || err)
  );

  const { url } = await startStandaloneServer(server, {
    listen: { port, host: "0.0.0.0" },
    context: async ({ req }) => {
      const authHeader = req.headers.authorization || "";
      const token = authHeader.replace("Bearer ", "").trim();
      if (!token) return { user: null, prisma };
      if (!jwtSecret) {
        console.warn("matching-service: SECRET_KEY is not set");
        return { user: null, prisma };
      }
      try {
        const user = jwt.verify(token, jwtSecret);
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
