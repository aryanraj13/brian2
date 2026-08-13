import { GoogleGenerativeAI } from "@google/generative-ai";
import type { Fact } from "./db";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
// gemini-1.5-flash was retired — Google shut down all 1.0/1.5 models.
// Using the "-latest" alias for flash-lite keeps this pointed at whatever
// current model is free-tier eligible, so it doesn't go stale again.
const MODEL = "gemini-flash-lite-latest";

export type Plan = {
  keywords: string[];
  people: string[];
  useGmail: boolean;
  useDrive: boolean;
};

/**
 * LLM call #1: turn a natural-language question into a search plan
 * (keywords + people to look for, and which source(s) are relevant).
 */
export async function planQuery(question: string): Promise<Plan> {
  const model = genAI.getGenerativeModel({
    model: MODEL,
    generationConfig: { responseMimeType: "application/json" },
  });

  const prompt = `You are the query planner for a personal search assistant over the user's
Gmail and Google Drive. Given the user's question, extract a JSON object with:
- "keywords": short list of search terms (company names, topics, filenames, subjects — NOT
  whole sentences, single words or short phrases only)
- "people": list of person names or email fragments mentioned or implied
- "useGmail": boolean, true if the question could be answered from email
- "useDrive": boolean, true if the question could be answered from Drive files

Default useGmail and useDrive to true unless the question is clearly single-source.

Question: "${question}"

Respond with ONLY the JSON object, no markdown fences.`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  try {
    return JSON.parse(text);
  } catch {
    // Fallback: search everything broadly rather than fail the request.
    return { keywords: [question], people: [], useGmail: true, useDrive: true };
  }
}

/**
 * LLM call #2: given the question and the retrieved facts from both sources,
 * produce a grounded conversational answer. Explicitly forbidden from guessing
 * beyond what's in the provided facts.
 */
export async function synthesizeAnswer(
  question: string,
  gmailFacts: Fact[],
  driveFacts: Fact[]
): Promise<string> {
  const model = genAI.getGenerativeModel({ model: MODEL });

  const formatFacts = (facts: Fact[]) =>
    facts
      .map(
        (f, i) =>
          `[${i + 1}] (${f.source}) "${f.title}" — ${f.timestamp} — participants: ${f.participants.join(
            ", "
          )} — files: ${f.filenames.join(", ") || "none"}\n    snippet: ${f.snippet}\n    link: ${f.link}`
      )
      .join("\n");

  const prompt = `You are a personal assistant answering a question using ONLY the facts
retrieved below from the user's Gmail and Google Drive. Do not use outside knowledge.
If the facts don't contain enough information to answer, say clearly that you couldn't
find it in their Gmail/Drive — do not guess or make up an answer.

When facts from both Gmail and Drive relate to the same topic (e.g. an email mentioning
a file, and that file existing in Drive), connect them explicitly in your answer.

Cite sources inline using the [n] markers matching the fact list, and mention which
service (Gmail/Drive) each part of the answer came from. Answer conversationally, like
a helpful assistant, not as a raw data dump.

Question: "${question}"

Gmail facts:
${formatFacts(gmailFacts) || "(none retrieved)"}

Drive facts:
${formatFacts(driveFacts) || "(none retrieved)"}
`;

  const result = await model.generateContent(prompt);
  return result.response.text();
}

/**
 * LLM call #2, gbrain variant: same grounding rules as synthesizeAnswer, but takes
 * gbrain's raw hybrid-search text output as context instead of a formatted Fact[]
 * list. gbrain's `query` command has no --json output — it's designed to hand
 * results straight to an LLM as context, so we pass its text through directly.
 */
export async function synthesizeAnswerFromGbrainContext(
  question: string,
  gbrainContext: string
): Promise<string> {
  const model = genAI.getGenerativeModel({ model: MODEL });

  const prompt = `You are a personal assistant answering a question using ONLY the search
results below, retrieved from the user's personal knowledge brain (which contains their
Gmail and Google Drive data). Do not use outside knowledge. If the results don't contain
enough information to answer, say clearly that you couldn't find it — do not guess or
make up an answer.

The results may include both email and Drive-file content. When results from both relate
to the same topic (e.g. an email mentioning a file, and that file's content), connect
them explicitly in your answer.

Answer conversationally, like a helpful assistant, not as a raw data dump. Mention which
kind of source (email vs file) each part of the answer came from where it's clear from
the results.

Question: "${question}"

Search results from the brain:
${gbrainContext || "(no results retrieved)"}
`;

  const result = await model.generateContent(prompt);
  return result.response.text();
}
