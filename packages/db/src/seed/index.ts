import "./load-env";
import { db, pool } from "../client";
import { seedContent } from "./content";
import { seedRacing } from "./racing";
import { seedRbac } from "./rbac";

async function main() {
  console.log("CTR Sports seed — 2025 + 2026 real data\n");
  await seedRbac(db);
  await seedRacing(db, [2025, 2026]);
  await seedContent(db);
  await pool.end();
  console.log("\nSeed complete ✓");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
