// Minimal config for Prisma 7 migrations only
// PrismaClient uses DATABASE_URL from environment automatically (standard Node engine)
import { config } from "dotenv";

config({ path: ".env.local" });
config({ path: ".env" });

export default {
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env.DATABASE_URL,
  },
};
