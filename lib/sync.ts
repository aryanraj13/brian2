import { getOAuth2Client } from "./google";
import { fetchGmailFacts } from "./gmail";
import { fetchDriveFacts } from "./drive";
import { upsertFactsIntoGbrain } from "./gbrainStorage";

export type SyncResult = {
  success: boolean;
  gmailCount: number;
  driveCount: number;
  totalCount: number;
  gbrain: {
    success: boolean;
    skipped: boolean;
  };
  message: string;
};

export async function syncPersonalData(): Promise<SyncResult> {
  if (!process.env.GOOGLE_REFRESH_TOKEN) {
    throw new Error(
      "No GOOGLE_REFRESH_TOKEN found. Please run `npm run auth` first.",
    );
  }

  const auth = getOAuth2Client();
  const months = Number(process.env.SYNC_MONTHS || 6);

  console.log(`Fetching Gmail messages from the last ${months} months...`);

  const gmailFacts = await fetchGmailFacts(auth, months);

  console.log(`Fetched ${gmailFacts.length} Gmail facts.`);

  console.log(`Fetching Drive files from the last ${months} months...`);

  const driveFacts = await fetchDriveFacts(auth, months);

  console.log(`Fetched ${driveFacts.length} Drive facts.`);

  const allFacts = [...gmailFacts, ...driveFacts];

  let gbrainSuccess = false;
  let gbrainSkipped = false;

  if (process.env.SKIP_GBRAIN === "1") {
    gbrainSkipped = true;
  } else {
    console.log(
      `Writing ${allFacts.length} facts directly into gbrain/PostgreSQL...`,
    );

    await upsertFactsIntoGbrain(allFacts);

    gbrainSuccess = true;

    console.log("gbrain/PostgreSQL storage complete.");
  }

  return {
    success: true,

    gmailCount: gmailFacts.length,
    driveCount: driveFacts.length,
    totalCount: allFacts.length,

    gbrain: {
      success: gbrainSuccess,
      skipped: gbrainSkipped,
    },

    message: gbrainSkipped
      ? "Gmail and Drive synced. gbrain storage was skipped."
      : "Gmail, Drive and gbrain storage synced successfully.",
  };
}