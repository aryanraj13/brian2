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

  return "focused";
}

/**
 * GBrain-only retrieval.
 *
 * IMPORTANT:
 * We intentionally do NOT import ./db here.
 *
 * The Vercel deployment uses GBrain + PostgreSQL on Render.
 * SQLite is only a local/legacy fallback and must not be initialized
 * during the Vercel server build/runtime.
 */
export async function retrieveForQuestion(
  question: string
): Promise<{
  gmailFacts: [];
  driveFacts: [];
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

  try {
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

    console.warn("[retrieval] GBrain returned no results");

    return {
      gmailFacts: [],
      driveFacts: [],
      plan,
      gbrainContext: null,
    };
  } catch (error) {
    console.error("[retrieval] GBrain retrieval failed:", error);

    return {
      gmailFacts: [],
      driveFacts: [],
      plan,
      gbrainContext: null,
    };
  }
}