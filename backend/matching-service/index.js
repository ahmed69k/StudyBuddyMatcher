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

// ORIGINAL: const server = new ApolloServer({ typeDefs, resolvers });
const server = new ApolloServer({
  typeDefs,
  resolvers,
  // EDIT: INTROSPECTION ON FOR GRAPHQL GATEWAY / TOOLING
  introspection: true,
});

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ORIGINAL (PRISMA ONCE THEN THROW):
// try {
//   await prisma.$connect();
//   await prisma.$queryRaw`SELECT 1`;
//   console.log("✅ Prisma: connected to PostgreSQL (matching-service)");
// } catch (err) {
//   console.error("❌ Prisma: database connection failed (matching-service):", err?.message || err);
//   throw err;
// }
// EDIT: RETRY PRISMA WHEN DB / NEON IS SLOW TO ACCEPT CONNECTIONS
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

// ORIGINAL: listen used process.env.PORT || 4002 inline (no separate const)
// EDIT: PARSE PORT FROM ENV (TEAM SCHEME: MATCHING = 3003)
const port = Number(process.env.PORT) || 3003;
// ORIGINAL: jwt.verify(token, process.env.SECRET_KEY) with no trim / no missing-secret guard
// EDIT: TRIM SECRET SO .ENV SPACES DO NOT BREAK JWT VS OTHER SERVICES
const jwtSecret = process.env.SECRET_KEY?.trim();

const startServer = async () => {
  await connectPrismaWithRetry();

  // ORIGINAL: connectProducer().catch(() => {});
  // ORIGINAL: startConsumer(prisma).catch(() => {});
  // EDIT: KAFKA NON-BLOCKING; CONSUMER ALSO NON-BLOCKING
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
      // ORIGINAL: no missing-secret guard (jwt.verify threw if secret unset)
      // EDIT: GUARD IF SECRET_KEY MISSING
      if (!jwtSecret) {
        console.warn("matching-service: SECRET_KEY is not set");
        return { user: null, prisma };
      }
      try {
        // ORIGINAL: const user = jwt.verify(token, process.env.SECRET_KEY);
        // EDIT: VERIFY WITH TRIMMED SECRET (MATCHES LOGIN SIGNING)
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
