import { config } from "dotenv";
import { resolve } from "node:path";

// Seed scripts run with cwd = packages/db; the single .env lives at the root.
config({ path: resolve(process.cwd(), "../../.env") });

// Migrations/seeding should use the direct (unpooled) Neon connection.
if (process.env.DATABASE_URL_UNPOOLED) {
  process.env.DATABASE_URL = process.env.DATABASE_URL_UNPOOLED;
}
