import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient; pgPool?: Pool };

function getPool() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set");
  // Reuse pool across HMR in dev
  const pool =
    globalForPrisma.pgPool ??
    new Pool({
      connectionString,
      max: 10,
    });
  if (process.env.NODE_ENV !== "production") globalForPrisma.pgPool = pool;
  return pool;
}

function makePrisma() {
  const adapter = new PrismaPg(getPool());
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? makePrisma();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;