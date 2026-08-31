import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";
import * as schema from "./schema";

// WebSocket driver → full transaction support (neon-http can't do transactions)
neonConfig.webSocketConstructor = ws;

const globalForDb = globalThis as unknown as { __ctrPool?: Pool };

/*
 * DANGER — this is the POOLED endpoint (PgBouncer in transaction mode).
 *
 * Never issue a session-scoped command through it: SET search_path, SET ROLE,
 * SET TIME ZONE, LISTEN, advisory locks, temp tables. The setting sticks to the
 * server-side connection and is inherited by whichever client is handed that
 * backend next — including production. A stray `SET search_path` here once took
 * the live site down with `relation "admin_users" does not exist` while every
 * table was present and correct.
 *
 * Anything session-scoped, and any scratch-schema or migration experiment,
 * must use DATABASE_URL_UNPOOLED with its own dedicated connection.
 */
function makePool() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set — fill in the root .env");
  return new Pool({ connectionString: url });
}

export const pool: Pool = globalForDb.__ctrPool ?? makePool();
if (process.env.NODE_ENV !== "production") globalForDb.__ctrPool = pool;

export const db = drizzle(pool, { schema });
export type Db = typeof db;
export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
