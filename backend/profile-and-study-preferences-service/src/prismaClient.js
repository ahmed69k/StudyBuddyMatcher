import { PrismaClient } from './generated/prisma/index.js';
import { PrismaNeon } from '@prisma/adapter-neon';
import 'dotenv/config';

const adapter = new PrismaNeon({
  connectionString: process.env.DATABASE_URL,
});

export const prisma = new PrismaClient({ adapter });