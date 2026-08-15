/**
 * Run to (re)populate the local brain:
 * `npm run sync`
 *
 * Idempotent — safe to re-run any time.
 */

import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

import { syncPersonalData } from "../lib/sync";

async function main() {
  console.log("Starting Personal Brain sync...\n");

  const result = await syncPersonalData();

  console.log(`Gmail: ${result.gmailCount} facts`);
  console.log(`Drive: ${result.driveCount} facts`);
  console.log(`SQLite total: ${result.totalCount} facts`);

  if (result.gbrain.skipped) {
    console.log("gbrain: skipped");
  } else if (result.gbrain.success) {
    console.log("gbrain: import complete");
  } else {
    console.warn("gbrain: import did not complete");
  }

  console.log(`\n${result.message}`);
}

main().catch((err) => {
  console.error("\nSync failed:");
  console.error(err);
  process.exit(1);
});