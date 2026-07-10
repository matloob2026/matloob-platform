/**
 * Prisma client singleton.
 *
 * In Next.js dev mode, modules are re-evaluated on every hot reload.
 * Without this pattern, each reload would open a fresh PrismaClient and
 * exhaust the database's connection pool within minutes. This is the
 * standard, Prisma-documented workaround.
 *
 * Every service in src/services imports `prisma` from here — nothing
 * else in the codebase should call `new PrismaClient()`.
 */

import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
