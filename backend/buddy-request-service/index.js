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

const server = new ApolloServer({
  typeDefs,
  resolvers,
  introspection: true,
});

const startServer = async () => {
  try {
    await prisma.$connect();
    await prisma.$queryRaw`SELECT 1`;
    console.log("✅ Prisma: connected (buddy-request-service)");
  } catch (err) {
    console.error("❌ Prisma: database connection failed (buddy-request-service):", err?.message || err);
    throw err;
  }

  await connectProducer();

  const { url } = await startStandaloneServer(server, {
    listen: { port: Number(process.env.PORT) || 4006, host: "0.0.0.0" },
    context: async ({ req }) => {
      const authHeader = req.headers.authorization || "";
      const token = authHeader.replace("Bearer ", "").trim();
      if (!token) return { user: null };
      try {
        const user = jwt.verify(token, process.env.SECRET_KEY);
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
