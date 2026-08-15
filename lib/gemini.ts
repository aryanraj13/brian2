import { GoogleGenerativeAI } from "@google/generative-ai";
import type { Fact } from "./db";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

const MODEL = "gemini-flash-lite-latest";

export type Plan = {
  keywords: string[];
  people: string[];
  useGmail: boolean;
  useDrive: boolean;

  // focused = exact/specific lookup
  // broad = exploratory/semantic search
  searchMode: "focused" | "broad";
};

/**
 * LLM call #1:
 * Turn a natural-language question into a search plan.
 *
 * searchMode controls how aggressively GBrain searches:
 *
 * focused:
 *   - exact/specific lookup
 *   - no query expansion
 *   - fewer results
 *
 * broad:
 *   - exploratory question
 *   - query expansion enabled
 *   - broader result set
 */
export async function planQuery(question: string): Promise<Plan> {
  const model = genAI.getGenerativeModel({
    model: MODEL,
    generationConfig: {
      responseMimeType: "application/json",
    },
  });

  const prompt = `You are the query planner for a personal search assistant over the user's
Gmail and Google Drive.

Given the user's question, extract a JSON object with:

- "keywords": short list of important search terms such as company names,
  topics, filenames, subjects, technologies, or specific phrases.
  Do NOT use whole sentences.

- "people": list of person names or email fragments mentioned or implied.

- "useGmail": boolean. True if the question could be answered from email.

- "useDrive": boolean. True if the question could be answered from Drive files.

- "searchMode": either "focused" or "broad".

Use "focused" when the user is asking for a specific lookup or single fact.
Examples:
- "What did Capgemini email me?"
- "Find my resume"
- "Did Varp TechLab contact me?"
- "What did Infosys say?"
- "Show me emails from Microsoft"
- "Where is my Aryan Rajput resume?"

Use "broad" when the user is asking for exploration, multiple related facts,
patterns, concepts, or a wider picture.
Examples:
- "What have I been doing regarding job applications?"
- "Tell me everything about my internship search"
- "What companies have contacted me?"
- "What patterns do you see in my career activity?"
- "Find everything related to my projects"

Default useGmail and useDrive to true unless the question is clearly single-source.

Question: "${question}"

Respond with ONLY the JSON object.

Example focused response:
{
  "keywords": ["Capgemini"],
  "people": [],
  "useGmail": true,
  "useDrive": false,
  "searchMode": "focused"
}

Example broad response:
{
  "keywords": ["job applications", "interviews", "companies"],
  "people": [],
  "useGmail": true,
  "useDrive": true,
  "searchMode": "broad"
}`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();

  try {
    const parsed = JSON.parse(text);

    return {
      keywords: Array.isArray(parsed.keywords) ? parsed.keywords : [],
      people: Array.isArray(parsed.people) ? parsed.people : [],
      useGmail:
        typeof parsed.useGmail === "boolean" ? parsed.useGmail : true,
      useDrive:
        typeof parsed.useDrive === "boolean" ? parsed.useDrive : true,
      searchMode:
        parsed.searchMode === "broad" ? "broad" : "focused",
    };
  } catch {
    // Safe fallback.
    return {
      keywords: [question],
      people: [],
      useGmail: true,
      useDrive: true,
      searchMode: "focused",
    };
  }
}

/**
 * LLM call #2:
 * Given the question and retrieved facts, produce a grounded answer.
 */
export async function synthesizeAnswer(
  question: string,
  gmailFacts: Fact[],
  driveFacts: Fact[]
): Promise<string> {
  const model = genAI.getGenerativeModel({
    model: MODEL,
  });

  const formatFacts = (facts: Fact[]) =>
    facts
      .map(
        (f, i) =>
          `[${i + 1}] (${f.source}) "${f.title}" — ${f.timestamp} — participants: ${f.participants.join(
            ", "
          )} — files: ${f.filenames.join(", ") || "none"}\n` +
          `    snippet: ${f.snippet}\n` +
          `    link: ${f.link}`
      )
      .join("\n");

  const prompt = `You are a personal assistant answering a question using ONLY the facts
retrieved below from the user's Gmail and Google Drive.

Do not use outside knowledge.

If the facts don't contain enough information to answer, say clearly that
you couldn't find it in their Gmail/Drive. Do not guess or make up an answer.

When facts from both Gmail and Drive relate to the same topic, connect them
explicitly.

Cite sources inline using the [n] markers matching the fact list, and mention
which service (Gmail/Drive) each part of the answer came from.

Answer conversationally, like a helpful assistant, not as a raw data dump.

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
 * GBrain variant.
 *
 * Uses the raw hybrid-search output returned by GBrain.
 */
export async function synthesizeAnswerFromGbrainContext(
  question: string,
  gbrainContext: string
): Promise<string> {
  const model = genAI.getGenerativeModel({
    model: MODEL,
  });

  const prompt = `You are a personal assistant answering a question using ONLY the search
results below, retrieved from the user's personal knowledge brain.

The brain contains Gmail and Google Drive data.

Do not use outside knowledge.

If the results don't contain enough information to answer, say clearly that
you couldn't find it. Do not guess or make up an answer.

When results from both email and Drive relate to the same topic, connect them
explicitly.

Answer conversationally, like a helpful assistant, not as a raw data dump.

Mention whether information came from email or Drive when that is clear.

Question: "${question}"

Search results from the brain:
${gbrainContext || "(no results retrieved)"}
`;

  const result = await model.generateContent(prompt);

  return result.response.text();
}