import type { Fact } from "./db";

const GBRAIN_MCP_URL =
  process.env.GBRAIN_MCP_URL || "http://localhost:8787/mcp";

const GBRAIN_MCP_TOKEN = process.env.GBRAIN_MCP_TOKEN;

type McpResponse = {
  result?: {
    content?: Array<{
      type: string;
      text?: string;
    }>;
    [key: string]: any;
  };
  error?: {
    code: number;
    message: string;
  };
};

async function callGbrainTool(
  name: string,
  args: Record<string, unknown>
): Promise<McpResponse> {
  if (!GBRAIN_MCP_TOKEN) {
    throw new Error("GBRAIN_MCP_TOKEN is not configured.");
  }

  const response = await fetch(GBRAIN_MCP_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${GBRAIN_MCP_TOKEN}`,
      Accept: "application/json, text/event-stream",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: Date.now(),
      method: "tools/call",
      params: {
        name,
        arguments: args,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(
      `gbrain MCP request failed: ${response.status} ${response.statusText}`
    );
  }

  const text = await response.text();

  const dataLine = text
    .split("\n")
    .find((line) => line.startsWith("data:"));

  if (!dataLine) {
    throw new Error(`Invalid gbrain MCP response: ${text}`);
  }

  const json = dataLine.slice("data:".length).trim();

  return JSON.parse(json) as McpResponse;
}

/**
 * Query GBrain.
 *
 * The search strategy is selected automatically:
 *
 * focused:
 *   expand=false
 *   adaptive_return=true
 *
 * broad:
 *   expand=true
 *   adaptive_return=false
 */
export async function queryGbrain(
  question: string,
  options?: {
    searchMode?: "focused" | "broad";
    limit?: number;
  }
): Promise<string | null> {
  try {
    const searchMode = options?.searchMode || "focused";

    const isBroad = searchMode === "broad";

    const limit = options?.limit ?? (isBroad ? 15 : 8);

    console.log(
      `[gbrain] Search mode: ${searchMode} | expand=${isBroad} | limit=${limit}`
    );

    const response = await callGbrainTool("query", {
      query: question,

      limit,

      // Broad questions benefit from multi-query expansion.
      // Focused lookups do not need it.
      expand: isBroad,

      detail: "medium",

      source_id: "personal-brain",

      // For focused lookups, ask GBrain to return a tight result set.
      adaptive_return: !isBroad,
    });

    if (response.error) {
      throw new Error(response.error.message);
    }

    const content = response.result?.content;

    if (!content || content.length === 0) {
      return null;
    }

    const result = content
      .map((item) => item.text || "")
      .filter(Boolean)
      .join("\n\n");

    if (!result.trim()) {
      return null;
    }

    return result;
  } catch (error) {
    console.error(
      "[gbrain query failed] Falling back to SQLite:",
      error
    );

    return null;
  }
}