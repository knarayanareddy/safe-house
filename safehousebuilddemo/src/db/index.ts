import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const globalForDb = globalThis as typeof globalThis & {
  __arenaNextJsPostgresqlPool?: Pool;
  __arenaNextJsPostgresqlDb?: NodePgDatabase;
};

function needsSsl(url: string): boolean {
  if (url.includes("sslmode=disable")) return false;
  return url.includes("sslmode=require") || url.includes("render.com");
}

function initPool(): Pool {
  if (globalForDb.__arenaNextJsPostgresqlPool) {
    return globalForDb.__arenaNextJsPostgresqlPool;
  }
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }
  const created = new Pool({
    connectionString: databaseUrl,
    ...(needsSsl(databaseUrl) ? { ssl: { rejectUnauthorized: false } } : {}),
  });
  globalForDb.__arenaNextJsPostgresqlPool = created;
  return created;
}

function initDb(): NodePgDatabase {
  if (globalForDb.__arenaNextJsPostgresqlDb) {
    return globalForDb.__arenaNextJsPostgresqlDb;
  }
  const created = drizzle(initPool());
  globalForDb.__arenaNextJsPostgresqlDb = created;
  return created;
}

export const pool: Pool = new Proxy({} as Pool, {
  get(_target, prop) {
    const target = initPool();
    const value = Reflect.get(target, prop, target);
    return typeof value === "function" ? value.bind(target) : value;
  },
});

export const db: NodePgDatabase = new Proxy({} as NodePgDatabase, {
  get(_target, prop) {
    const target = initDb();
    const value = Reflect.get(target, prop, target);
    return typeof value === "function" ? value.bind(target) : value;
  },
});
