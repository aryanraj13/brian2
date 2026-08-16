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
      "No GOOGLE_REFRESH_TOKEN found. Please configure Google OAuth."
    );
  }

  const auth = getOAuth2Client();

  const months = Number(
    process.env.SYNC_MONTHS || 1
  );

  console.log(
    `[sync] Starting sync for last ${months} month(s)...`
  );

  /*
   * Gmail and Drive are independent.
   * Fetch both at the same time.
   */
  const [gmailFacts, driveFacts] =
    await Promise.all([
      fetchGmailFacts(auth, months),
      fetchDriveFacts(auth, months),
    ]);

  console.log(
    `[sync] Gmail facts: ${gmailFacts.length}`
  );

  console.log(
    `[sync] Drive facts: ${driveFacts.length}`
  );

  const allFacts = [
    ...gmailFacts,
    ...driveFacts,
  ];

  let gbrainSuccess = false;
  let gbrainSkipped = false;

  if (process.env.SKIP_GBRAIN === "1") {
    console.log(
      "[sync] SKIP_GBRAIN=1 — skipping GBrain storage"
    );

    gbrainSkipped = true;
  } else {
    console.log(
      `[sync] Writing ${allFacts.length} facts to GBrain...`
    );

    await upsertFactsIntoGbrain(allFacts);

    gbrainSuccess = true;

    console.log(
      "[sync] GBrain storage complete."
    );
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
      ? "Gmail and Drive synced. GBrain storage was skipped."
      : "Gmail, Drive and GBrain synced successfully.",
  };
}