import { PrismaClient } from "@prisma/client";
import { PrismaBetterSQLite3 } from "@prisma/adapter-better-sqlite3";
import Database from "better-sqlite3";

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

function sqlitePathFromUrl(url: string) {
  // expected "file:./dev.db"
  if (!url.startsWith("file:")) {
    throw new Error(`SQLite DATABASE_URL must start with "file:". Got: ${url}`);
  }
  return url.replace("file:", "");
}

export const prisma =
  global.prisma ??
  (() => {
    const url = process.env.DATABASE_URL ?? "file:./dev.db";
    const filePath = sqlitePathFromUrl(url);

    const db = new Database(filePath);
    const adapter = new PrismaBetterSQLite3(db);

    return new PrismaClient({ adapter });
  })();

if (process.env.NODE_ENV !== "production") global.prisma = prisma;

