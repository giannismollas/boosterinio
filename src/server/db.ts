import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as { __prisma?: PrismaClient };

function createClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set");
  const adapter = new PrismaPg({
    connectionString,
    max: Number(process.env.DATABASE_POOL_MAX || 10),
  });
  return new PrismaClient({ adapter });
}

function client(): PrismaClient {
  // One client per process (and across dev hot reloads).
  return (globalForPrisma.__prisma ??= createClient());
}

/**
 * Lazily connected Prisma client: importing this module never touches the
 * database, so `next build` works even where DATABASE_URL isn't available.
 */
export const db = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const c = client() as unknown as Record<string | symbol, unknown>;
    const value = c[prop];
    return typeof value === "function" ? (value as (...args: unknown[]) => unknown).bind(c) : value;
  },
});

export { Prisma } from "@/generated/prisma/client";
