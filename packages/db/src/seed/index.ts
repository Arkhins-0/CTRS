import "./load-env";
import { db, pool } from "../client";
import { seedRbac } from "./rbac";
import { seedAssets, seedContentCtr, seedRacingCtr, wipeOldData } from "./seed-ctr";

async function main() {
  console.log("CTR Sports seed — CTR–JK Tyre FMSCI INCRC 2026\n");
  await seedRbac(db);
  await wipeOldData(db);
  const assets = await seedAssets(db);
  await seedRacingCtr(db, assets);
  await seedContentCtr(db, assets);
  await pool.end();
  console.log("\nSeed complete ✓");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
