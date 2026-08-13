import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const dataDir = path.join(process.cwd(), "data");
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const dbPath = path.join(dataDir, "brain.db");
export const db = new Database(dbPath);

db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS facts (
    id TEXT PRIMARY KEY,
    source TEXT NOT NULL,       -- 'gmail' | 'drive'
    type TEXT NOT NULL,          -- 'email' | 'file'
    title TEXT NOT NULL,
    participants TEXT NOT NULL,  -- JSON array string
    timestamp TEXT NOT NULL,     -- ISO date
    snippet TEXT,
    body TEXT,
    filenames TEXT,              -- JSON array string
    link TEXT,
    thread_id TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_facts_source ON facts(source);
  CREATE INDEX IF NOT EXISTS idx_facts_timestamp ON facts(timestamp);
`);

export type Fact = {
  id: string;
  source: "gmail" | "drive";
  type: "email" | "file";
  title: string;
  participants: string[];
  timestamp: string;
  snippet: string;
  body: string | null;
  filenames: string[];
  link: string;
  thread_id: string | null;
};

const upsertStmt = db.prepare(`
  INSERT INTO facts (id, source, type, title, participants, timestamp, snippet, body, filenames, link, thread_id)
  VALUES (@id, @source, @type, @title, @participants, @timestamp, @snippet, @body, @filenames, @link, @thread_id)
  ON CONFLICT(id) DO UPDATE SET
    title=excluded.title, participants=excluded.participants, timestamp=excluded.timestamp,
    snippet=excluded.snippet, body=excluded.body, filenames=excluded.filenames,
    link=excluded.link, thread_id=excluded.thread_id
`);

export function upsertFact(fact: Fact) {
  upsertStmt.run({
    ...fact,
    participants: JSON.stringify(fact.participants),
    filenames: JSON.stringify(fact.filenames),
  });
}

function rowToFact(row: any): Fact {
  return {
    ...row,
    participants: JSON.parse(row.participants || "[]"),
    filenames: JSON.parse(row.filenames || "[]"),
  };
}

/**
 * Keyword search across a source. Very deliberately simple (LIKE, not vectors) —
 * a personal inbox is a few thousand rows; this is fast enough and fully free.
 */
export function searchFacts(source: "gmail" | "drive", keywords: string[], limit = 15): Fact[] {
  if (keywords.length === 0) {
    const rows = db
      .prepare(`SELECT * FROM facts WHERE source = ? ORDER BY timestamp DESC LIMIT ?`)
      .all(source, limit);
    return rows.map(rowToFact);
  }

  const clauses = keywords
    .map(() => `(title LIKE ? OR body LIKE ? OR snippet LIKE ? OR participants LIKE ? OR filenames LIKE ?)`)
    .join(" OR ");
  const params: any[] = [source];
  for (const kw of keywords) {
    const like = `%${kw}%`;
    params.push(like, like, like, like, like);
  }
  params.push(limit);

  const rows = db
    .prepare(`SELECT * FROM facts WHERE source = ? AND (${clauses}) ORDER BY timestamp DESC LIMIT ?`)
    .all(...params);
  return rows.map(rowToFact);
}

export function factCount() {
  const gmail = db.prepare(`SELECT COUNT(*) c FROM facts WHERE source='gmail'`).get() as any;
  const drive = db.prepare(`SELECT COUNT(*) c FROM facts WHERE source='drive'`).get() as any;
  return { gmail: gmail.c as number, drive: drive.c as number };
}
