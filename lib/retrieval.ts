import { searchFacts, type Fact } from "./db";
import { queryGbrain } from "./gbrainStore";

export type SearchMode = "focused" | "broad";

export type RetrievalPlan = {
  keywords: string[];
  people: string[];
  useGmail: boolean;
  useDrive: boolean;
  searchMode: SearchMode;
};

/**
 * Classify the question locally.
 *
 * We deliberately do NOT use an LLM here.
 * GBrain already performs semantic/vector retrieval, so using Gemini
 * just to decide whether a query is broad or focused adds latency.
 */
function classifyQuestion(question: string): SearchMode {
  const q = question.toLowerCase().trim();

  // Questions that clearly ask for a broad/exploratory search.
  const broadPatterns = [
    /\beverything\b/,
    /\ball\b/,
    /\banything\b/,
    /\bwhat have i been\b/,
    /\bwhat have i done\b/,
    /\bwhat have i\b/,
    /\btell me about\b/,
    /\btell me everything\b/,
    /\bwhat do i know about\b/,
    /\bwhat can you tell me about\b/,
    /\bwhat patterns\b/,
    /\bpatterns do you see\b/,
    /\boverview\b/,
    /\bsummarize my\b/,
    /\bsummarise my\b/,
    /\brelated to\b/,
    /\bregarding\b/,
    /\bcareer activity\b/,
    /\bjob applications\b/,
    /\binternship search\b/,
    /\bprojects\b/,
  ];

  if (broadPatterns.some((pattern) => pattern.test(q))) {
    return "broad";
  }

  // Otherwise treat the question as a focused lookup.
  return "focused";
}

/**
 * Retrieval is GBrain-first.
 *
 * The live path no longer calls Gemini just to create a search plan.
 * This saves one complete LLM request per user question.
 */
export async function retrieveForQuestion(
  question: string
): Promise<{
  gmailFacts: Fact[];
  driveFacts: Fact[];
  plan: RetrievalPlan;
  gbrainContext: string | null;
}> {
  const searchMode = classifyQuestion(question);

  const plan: RetrievalPlan = {
    keywords: [],
    people: [],
    useGmail: true,
    useDrive: true,
    searchMode,
  };

  console.log(
    `[retrieval] Search mode: ${searchMode} (local classification)`
  );

  const gbrainContext = await queryGbrain(question, {
    searchMode,
  });

  if (gbrainContext) {
    console.log("[retrieval] Using gbrain");

    return {
      gmailFacts: [],
      driveFacts: [],
      plan,
      gbrainContext,
    };
  }

  /**
   * SQLite fallback.
   *
   * Since the normal path is GBrain, this fallback simply searches
   * the full question.
   */
  console.log("[retrieval] gbrain unavailable — using SQLite");

  const gmailFacts = searchFacts("gmail", [question]);
  const driveFacts = searchFacts("drive", [question]);

  return {
    gmailFacts,
    driveFacts,
    plan,
    gbrainContext: null,
  };
}