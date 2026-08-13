/**
 * Run to (re)populate the local brain: `npm run sync`
 * Idempotent — safe to re-run any time to pick up new emails/files.
 */
import dotenv from "dotenv";
   dotenv.config({ path: ".env.local" });
import { getOAuth2Client } from "../lib/google";
import { fetchGmailFacts } from "../lib/gmail";
import { fetchDriveFacts } from "../lib/drive";
import { upsertFact, factCount } from "../lib/db";
import { exportFactsToMarkdown, importIntoGbrain } from "../lib/gbrainStore";

async function main() {
  if (!process.env.GOOGLE_REFRESH_TOKEN) {
    console.error("No GOOGLE_REFRESH_TOKEN found. Run `npm run auth` first.");
    process.exit(1);
  }

  const auth = getOAuth2Client();
  const months = Number(process.env.SYNC_MONTHS || 6);

  console.log(`Fetching Gmail messages from the last ${months} months...`);
  const gmailFacts = await fetchGmailFacts(auth, months);
  gmailFacts.forEach(upsertFact);
  console.log(`  → ${gmailFacts.length} email facts stored in SQLite index.`);

  console.log(`Fetching Drive files modified in the last ${months} months...`);
  const driveFacts = await fetchDriveFacts(auth, months);
  driveFacts.forEach(upsertFact);
  console.log(`  → ${driveFacts.length} drive facts stored in SQLite index.`);

  const allFacts = [...gmailFacts, ...driveFacts];

  if (process.env.SKIP_GBRAIN === "1") {
    console.log("\nSKIP_GBRAIN=1 set — skipping gbrain export/import step.");
  } else {
    console.log(`\nExporting ${allFacts.length} facts to markdown for gbrain...`);
    const dir = exportFactsToMarkdown(allFacts);
    console.log(`  → written to ${dir}`);

    console.log("Importing into gbrain (this shells out to the gbrain CLI)...");
    const result = await importIntoGbrain(dir);
    if (!result.ok) {
      console.warn(
        "  ⚠ gbrain import did not complete — the SQLite index above is still fully " +
          "populated and the app will work, but the gbrain system-of-record store was " +
          "not updated this run. See the error above, or set SKIP_GBRAIN=1 to silence this."
      );
    } else {
      console.log("  → gbrain import complete.");
    }
  }

  console.log("\nDone. SQLite query index contents:", factCount());
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
