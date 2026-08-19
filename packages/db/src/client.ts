import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";
import * as schema from "./schema";

// WebSocket driver → full transaction support (neon-http can't do transactions)
neonConfig.webSocketConstructor = ws;

const globalForDb = globalThis as unknown as { __ctrPool?: Pool };

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
