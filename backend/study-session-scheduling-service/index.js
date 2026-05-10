import { execSync } from "node:child_process";
import { ApolloServer } from "@apollo/server";
import { startStandaloneServer } from "@apollo/server/standalone";
import typeDefs from "./schema/type-defs.js";
import resolvers from "./schema/resolvers.js";
import pkg from "@prisma/client";
const { PrismaClient } = pkg;
import { PrismaPg } from "@prisma/adapter-pg";
import jwt from "jsonwebtoken";
import { connectProducer } from "./kafka/producer.js";
import { startSessionReminderScheduler } from "./session-reminders.js";
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

/** Waits between Prisma connection retries when the database is slow to accept connections. */
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ORIGINAL (PRISMA THEN AWAIT KAFKA THEN HTTP):
// try {
//   await prisma.$connect();
//   await prisma.$queryRaw`SELECT 1`;
//   console.log("✅ Prisma: connected to PostgreSQL (study-session-scheduling-service)");
// } catch (err) {
//   console.error("❌ Prisma: database connection failed (study-session-scheduling-service):", err?.message || err);
//   throw err;
// }
// await connectProducer();
// EDIT: RETRY PRISMA WHEN DB / NEON IS SLOW TO ACCEPT CONNECTIONS
/** Establishes PostgreSQL with exponential-style retry so the container survives DB startup lag. */
const connectPrismaWithRetry = async () => {
  const maxAttempts = Number(process.env.PRISMA_CONNECT_RETRIES || 10);
  const delayMs = Number(process.env.PRISMA_CONNECT_DELAY_MS || 1500);
  let lastErr;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await prisma.$connect();
      await prisma.$queryRaw`SELECT 1`;
      if (attempt > 1) {
        console.log(
          `✅ Prisma: connected (study-session-scheduling-service) on attempt ${attempt}`
        );
      } else {
        console.log("✅ Prisma: connected to PostgreSQL (study-session-scheduling-service)");
      }
      return;
    } catch (err) {
      lastErr = err;
      console.warn(
        `⚠️ Prisma connect attempt ${attempt}/${maxAttempts} failed (study-session-scheduling-service):`,
        err?.message || err
      );
      if (attempt < maxAttempts) await sleep(delayMs);
    }
  }
  throw lastErr;
};

/**
 * Applies SQL migrations (e.g. `StudySessionInvite`) before handling GraphQL traffic.
 * Set SKIP_PRISMA_MIGRATE_ON_START=true only if you already ran `npm run migrate`.
 */
const runMigrateDeployWithRetry = async () => {
  if (process.env.SKIP_PRISMA_MIGRATE_ON_START === "true") {
    console.log(
      "study-session-scheduling-service: skipping prisma migrate deploy (SKIP_PRISMA_MIGRATE_ON_START)"
    );
    return;
  }
  const maxAttempts = Number(process.env.PRISMA_MIGRATE_RETRIES || 15);
  const delayMs = Number(process.env.PRISMA_MIGRATE_DELAY_MS || 5000);
  let lastErr;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      execSync("npx prisma migrate deploy", {
        stdio: "inherit",
        env: process.env,
        cwd: process.cwd(),
      });
      console.log("✅ study-session-scheduling-service: prisma migrate deploy OK");
      return;
    } catch (err) {
      lastErr = err;
      console.warn(
        `⚠️ prisma migrate deploy attempt ${attempt}/${maxAttempts} failed:`,
        err?.message || err
      );
      if (attempt < maxAttempts) await sleep(delayMs);
    }
  }
  throw lastErr ?? new Error("prisma migrate deploy failed");
};

// ORIGINAL: listen used process.env.PORT || 4005 inline (later 3004)
// EDIT: PARSE PORT FROM ENV (TEAM SCHEME: STUDY SESSION = 3004)
const port = Number(process.env.PORT) || 3004;
// ORIGINAL: jwt.verify(token, process.env.SECRET_KEY)
// EDIT: TRIM JWT SECRET FROM .ENV
const jwtSecret = process.env.SECRET_KEY?.trim();

/*
 * --- Previous bootstrap (Prisma + Kafka/reminders before HTTP) — kept for reference; do not use. ---
 * const startServer = async () => {
 *   await connectPrismaWithRetry();
 *   connectProducer().catch((err) =>
 *     console.warn("⚠️ Kafka producer (study-session-scheduling-service):", err?.message || err)
 *   );
 *   startSessionReminderScheduler(prisma);
 *   const { url } = await startStandaloneServer(server, {
 *     listen: { port, host: "0.0.0.0" },
 *     context: async ({ req }) => {
 *       const authHeader = req.headers.authorization || "";
 *       const token = authHeader.replace("Bearer ", "").trim();
 *       if (!token) return { user: null, prisma };
 *       if (!jwtSecret) {
 *         console.warn("study-session-scheduling-service: SECRET_KEY is not set");
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
 *   console.log(`Study Session Service is ready at ${url}`);
 * };
 * --- end previous bootstrap ---
 */

/**
 * Listen for GraphQL before Prisma finishes so the stitched gateway can introspect this
 * subgraph while the DB is still starting; then connect DB, Kafka, and reminders.
 */
const startServer = async () => {
  await runMigrateDeployWithRetry();

  const { url } = await startStandaloneServer(server, {
    listen: { port, host: "0.0.0.0" },
    context: async ({ req }) => {
      const authHeader = req.headers.authorization || "";
      const token = authHeader.replace("Bearer ", "").trim();
      if (!token) return { user: null, prisma };
      // ORIGINAL: no missing-secret guard
      // EDIT: GUARD IF SECRET_KEY MISSING
      if (!jwtSecret) {
        console.warn("study-session-scheduling-service: SECRET_KEY is not set");
        return { user: null, prisma };
      }
      try {
        // ORIGINAL: const user = jwt.verify(token, process.env.SECRET_KEY);
        // EDIT: VERIFY WITH TRIMMED SECRET
        const user = jwt.verify(token, jwtSecret);
        return { user, prisma };
      } catch (err) {
        console.warn("Invalid token:", err.message);
        return { user: null, prisma };
      }
    },
  });

  console.log(`Study Session Service listening at ${url} (connecting DB…)`);

  await connectPrismaWithRetry();

  connectProducer().catch((err) =>
    console.warn("⚠️ Kafka producer (study-session-scheduling-service):", err?.message || err)
  );

  startSessionReminderScheduler(prisma);

  console.log(`Study Session Service ready (DB + reminders)`);
};

startServer().catch((err) => {
  console.error("❌ Study session service failed to start:", err);
});
