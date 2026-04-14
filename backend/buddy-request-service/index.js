import "dotenv/config";
import { ApolloServer } from "@apollo/server";
import { startStandaloneServer } from "@apollo/server/standalone";
import typeDefs from "./schema/type-defs.js";
import resolvers from "./schema/resolvers.js";
import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";
import { PrismaPg } from "@prisma/adapter-pg";
import { connectProducer } from "./kafka/producer.js";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

export const prisma = new PrismaClient({ adapter });

// ORIGINAL: ApolloServer({ typeDefs, resolvers, introspection: true }) — same fields; startup below changed
const server = new ApolloServer({
  typeDefs,
  resolvers,
  // EDIT: INTROSPECTION ON FOR GRAPHQL GATEWAY
  introspection: true,
});

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ORIGINAL (PRISMA ONCE THEN AWAIT KAFKA):
// try {
//   await prisma.$connect();
//   await prisma.$queryRaw`SELECT 1`;
//   console.log("✅ Prisma: connected (buddy-request-service)");
// } catch (err) {
//   console.error("❌ Prisma: database connection failed (buddy-request-service):", err?.message || err);
//   throw err;
// }
// await connectProducer();
// EDIT: RETRY PRISMA WHEN DB IS SLOW
const connectPrismaWithRetry = async () => {
  const maxAttempts = Number(process.env.PRISMA_CONNECT_RETRIES || 10);
  const delayMs = Number(process.env.PRISMA_CONNECT_DELAY_MS || 1500);
  let lastErr;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await prisma.$connect();
      await prisma.$queryRaw`SELECT 1`;
      if (attempt > 1) {
        console.log(`✅ Prisma: connected (buddy-request-service) on attempt ${attempt}`);
      } else {
        console.log("✅ Prisma: connected (buddy-request-service)");
      }
      return;
    } catch (err) {
      lastErr = err;
      console.warn(
        `⚠️ Prisma connect attempt ${attempt}/${maxAttempts} failed (buddy-request-service):`,
        err?.message || err
      );
      if (attempt < maxAttempts) await sleep(delayMs);
    }
  }
  throw lastErr;
};

// ORIGINAL: Number(process.env.PORT) || 4006 was already used inline in listen
// EDIT: PARSE PORT FROM ENV (TEAM SCHEME: BUDDY REQUEST = 3006)
const port = Number(process.env.PORT) || 3006;
// ORIGINAL: jwt.verify(token, process.env.SECRET_KEY)
// EDIT: TRIM JWT SECRET FROM .ENV
const jwtSecret = process.env.SECRET_KEY?.trim();

const startServer = async () => {
  await connectPrismaWithRetry();

  // ORIGINAL: await connectProducer();
  // EDIT: KAFKA NON-BLOCKING (DO NOT AWAIT BEFORE HTTP)
  connectProducer().catch((err) =>
    console.warn("⚠️ Kafka producer (buddy-request-service):", err?.message || err)
  );

  const { url } = await startStandaloneServer(server, {
    listen: { port, host: "0.0.0.0" },
    context: async ({ req }) => {
      const authHeader = req.headers.authorization || "";
      const token = authHeader.replace("Bearer ", "").trim();
      if (!token) return { user: null };
      // ORIGINAL: no missing-secret guard
      // EDIT: GUARD IF SECRET_KEY MISSING
      if (!jwtSecret) {
        console.warn("buddy-request-service: SECRET_KEY is not set");
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

  console.log(`🚀 Buddy Request Service running at ${url}`);
};

startServer().catch((err) => {
  console.error("❌ Buddy request service failed to start:", err);
  process.exit(1);
});
