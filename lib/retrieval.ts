import { searchFacts, type Fact } from "./db";
import { planQuery, type Plan } from "./gemini";

/**
 * Retrieval is SQLite-only by design: fast, deterministic, and simple to reason about
 * for the live chat path. gbrain is still used as the system-of-record store (see
 * `npm run sync` / lib/gbrainStore.ts) — every fact gets imported there too — but the
 * app queries SQLite directly rather than shelling out to gbrain's CLI per chat message.
 */
export async function retrieveForQuestion(
  question: string
): Promise<{ gmailFacts: Fact[]; driveFacts: Fact[]; plan: Plan }> {
  const plan = await planQuery(question);
  const terms = [...plan.keywords, ...plan.people];
  const gmailFacts = plan.useGmail ? searchFacts("gmail", terms) : [];
  const driveFacts = plan.useDrive ? searchFacts("drive", terms) : [];
  return { gmailFacts, driveFacts, plan };
}
