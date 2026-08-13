import { getOAuth2Client } from "./google";
import { fetchGmailFacts } from "./gmail";
import { fetchDriveFacts } from "./drive";
import { upsertFact, factCount } from "./db";
import {
  exportFactsToMarkdown,
  importIntoGbrain,
} from "./gbrainStore";

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

  // Gmail
  const gmailFacts = await fetchGmailFacts(auth, months);

  for (const fact of gmailFacts) {
    upsertFact(fact);
  }

  // Google Drive
  const driveFacts = await fetchDriveFacts(auth, months);

  for (const fact of driveFacts) {
    upsertFact(fact);
  }

  const allFacts = [...gmailFacts, ...driveFacts];

  // gbrain
  let gbrainSuccess = false;
  let gbrainSkipped = false;

  if (process.env.SKIP_GBRAIN === "1") {
    gbrainSkipped = true;
  } else {
    const dir = exportFactsToMarkdown(allFacts);
    const result = await importIntoGbrain(dir);

    if (!result.ok) {
      gbrainSuccess = false;
    } else {
      gbrainSuccess = true;
    }
  }

  const counts = factCount();
const totalCount = counts.gmail + counts.drive;

  return {
    success: true,

    gmailCount: gmailFacts.length,
    driveCount: driveFacts.length,
    totalCount,

    gbrain: {
      success: gbrainSuccess,
      skipped: gbrainSkipped,
    },

    message: gbrainSkipped
      ? "Gmail and Drive synced. gbrain import was skipped."
      : gbrainSuccess
        ? "Gmail, Drive and gbrain synced successfully."
        : "Gmail and Drive synced, but the gbrain import did not complete.",
  };
}