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

/** Pauses execution for database retry backoff between Prisma connection attempts. */
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
/** Connects to PostgreSQL with repeated attempts so Docker/Neon cold starts do not crash the service on boot. */
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

/*
 * --- Previous bootstrap (Prisma + Kafka before HTTP) — kept for reference; do not use. ---
 * const startServer = async () => {
 *   await connectPrismaWithRetry();
 *   connectProducer().catch((err) =>
 *     console.warn("⚠️ Kafka producer (matching-service):", err?.message || err)
 *   );
 *   startConsumer(prisma).catch((err) =>
 *     console.warn("⚠️ Kafka consumer (matching-service):", err?.message || err)
 *   );
 *   const { url } = await startStandaloneServer(server, {
 *     listen: { port, host: "0.0.0.0" },
 *     context: async ({ req }) => {
 *       const authHeader = req.headers.authorization || "";
 *       const token = authHeader.replace("Bearer ", "").trim();
 *       if (!token) return { user: null, prisma };
 *       if (!jwtSecret) {
 *         console.warn("matching-service: SECRET_KEY is not set");
 *         return { user: null, prisma };
 *       }
 *       try {
 *         const user = jwt.verify(token, jwtSecret);
 *         return { user, prisma };
 *       } catch (err) {
 *         console.warn("Invalid token:", err.message);
 *         return { user: null, prisma };
 *       }
 *     },
 *   });
 *   console.log(`Matching Service is ready at ${url}`);
 * };
 * --- end previous bootstrap ---
 */

/**
 * Listen for GraphQL before Prisma finishes so the stitched gateway can introspect this
 * subgraph while the DB is still coming up; then connect DB and Kafka.
 */
const startServer = async () => {
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

  console.log(`Matching Service listening at ${url} (connecting DB…)`);

  await connectPrismaWithRetry();

  connectProducer().catch((err) =>
    console.warn("⚠️ Kafka producer (matching-service):", err?.message || err)
  );
  startConsumer(prisma).catch((err) =>
    console.warn("⚠️ Kafka consumer (matching-service):", err?.message || err)
  );

  console.log(`Matching Service ready (DB + Kafka workers started)`);
};

startServer().catch((err) => {
  console.error("❌ Matching service failed to start:", err);
});
