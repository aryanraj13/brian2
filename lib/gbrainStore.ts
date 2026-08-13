/**
 * Integration with gbrain (https://github.com/garrytan/gbrain) as the system-of-record
 * store and hybrid-search retrieval engine.
 *
 * gbrain's own query surface (hybrid vector + keyword search with expansion) is used
 * as the PRIMARY retrieval path — one call spans both Gmail and Drive facts since both
 * get imported into the same brain. The SQLite index (lib/db.ts) is kept only as an
 * automatic fallback if the gbrain call fails, so the app doesn't break mid-demo.
 */
import { execFile } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";
import type { Fact } from "./db";

const execFileAsync = promisify(execFile);

const EXPORT_DIR = path.join(process.cwd(), "gbrain-export");

// GBRAIN_CLI_PATH: on Windows, `bun link`'s global symlink can break across drives
// (e.g. clone on D:, global bin resolves against C:). If set, we invoke gbrain
// directly via `bun run <path>` instead of relying on a `gbrain` command on PATH.
const GBRAIN_CLI_PATH = process.env.GBRAIN_CLI_PATH; // e.g. D:\personal-brain\gbrain\src\cli.ts

function buildInvocation(args: string[]): { cmd: string; cmdArgs: string[] } {
  if (GBRAIN_CLI_PATH) {
    return { cmd: "bun", cmdArgs: ["run", GBRAIN_CLI_PATH, ...args] };
  }
  return { cmd: "gbrain", cmdArgs: args };
}

function factToMarkdown(fact: Fact): string {
  const frontmatter = [
    "---",
    `id: "${fact.id}"`,
    `source: "${fact.source}"`,
    `type: "${fact.type}"`,
    `title: "${fact.title.replace(/"/g, '\\"')}"`,
    `timestamp: "${fact.timestamp}"`,
    `participants: [${fact.participants.map((p) => `"${p}"`).join(", ")}]`,
    `filenames: [${fact.filenames.map((f) => `"${f.replace(/"/g, '\\"')}"`).join(", ")}]`,
    `link: "${fact.link}"`,
    fact.thread_id ? `thread_id: "${fact.thread_id}"` : null,
    "---",
  ]
    .filter(Boolean)
    .join("\n");

  const body = fact.body || fact.snippet || "";
  return `${frontmatter}\n\n${body}\n`;
}

/**
 * Write facts to markdown files ready for gbrain import. Does not itself run the
 * gbrain CLI — call importIntoGbrain() after.
 */
export function exportFactsToMarkdown(facts: Fact[]) {
  for (const fact of facts) {
    const sourceDir = path.join(EXPORT_DIR, fact.source);
    fs.mkdirSync(sourceDir, { recursive: true });
    const safeId = fact.id.replace(/[^a-zA-Z0-9_-]/g, "_");
    const filePath = path.join(sourceDir, `${safeId}.md`);
    fs.writeFileSync(filePath, factToMarkdown(fact), "utf-8");
  }
  return EXPORT_DIR;
}

/**
 * Shells out to the gbrain CLI to import the exported markdown directory.
 */
export async function importIntoGbrain(dir: string = EXPORT_DIR) {
  const { cmd, cmdArgs } = buildInvocation(["import", dir]);
  try {
    const { stdout, stderr } = await execFileAsync(cmd, cmdArgs, {
      maxBuffer: 1024 * 1024 * 10,
    });
    if (stderr) console.error("[gbrain import stderr]", stderr);
    console.log("[gbrain import stdout]", stdout);
    return { ok: true, stdout, stderr };
  } catch (err: any) {
    console.error(
      "[gbrain import failed] — is gbrain installed and initialized? " +
        "Run `gbrain doctor` (or the bun run .../cli.ts doctor equivalent) to check.",
      err.message
    );
    return { ok: false, error: err.message };
  }
}

/**
 * Hybrid search (vector + keyword + expansion) across the whole imported brain —
 * spans both Gmail and Drive facts in one call. Returns gbrain's raw text output
 * (there's no --json flag; this CLI is designed to hand results straight to an LLM
 * as context, which suits us fine) or null if the call fails, so callers can fall
 * back to the SQLite index.
 */
export async function queryGbrain(question: string, limit = 15): Promise<string | null> {
  const { cmd, cmdArgs } = buildInvocation(["query", question, "--limit", String(limit)]);
  try {
    const { stdout, stderr } = await execFileAsync(cmd, cmdArgs, {
      maxBuffer: 1024 * 1024 * 10,
    });
    if (stderr) console.error("[gbrain query stderr]", stderr);
    return stdout;
  } catch (err: any) {
    console.error("[gbrain query failed] — falling back to SQLite index.", err.message);
    return null;
  }
}
