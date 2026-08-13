# SPEC — Personal Brain

Written before implementation. Implementation should stay traceable back to this file;
if it diverges, note the divergence in CHANGELOG.md rather than silently drifting.

## 1. Problem statement
A conversational agent that answers natural-language questions by pulling facts from
Gmail and Google Drive and reasoning across both in a single answer, via a chat UI.

## 2. Connectors
- **Gmail** — read-only, via Gmail API (`gmail.readonly` scope)
- **Google Drive** — read-only, via Drive API (`drive.readonly` scope)

Both authenticated via a single Google OAuth2 consent (same project, both scopes
requested together). This is a personal single-user tool — no multi-user auth,
no session management. A one-time script obtains a refresh token and stores it locally.

## 3. Data model
Every ingested item is normalized into one shape, `Fact`, regardless of source:

```ts
type Fact = {
  id: string;               // source-prefixed unique id, e.g. "gmail:18abc..."
  source: "gmail" | "drive";
  type: "email" | "file";
  title: string;             // subject line, or file name
  participants: string[];    // email addresses: from/to/cc for gmail, owner/sharedWith for drive
  timestamp: string;         // ISO date — sent date, or file modifiedTime
  snippet: string;           // short preview text
  body: string | null;       // fuller text where available (email plain-text body,
                              // or exported text for Google Docs — capped ~4000 chars)
  filenames: string[];       // attachment filenames (gmail) or the file's own name (drive)
  link: string;               // deep link back to gmail thread or drive file
  thread_id: string | null;  // gmail thread id, for grouping replies
}
```

**Storage: two layers, deliberately.**
- **gbrain** (https://github.com/garrytan/gbrain) is the system of record, per the
  assignment's storage requirement. Every normalized fact is exported as a markdown file
  with YAML frontmatter and ingested via `gbrain import` (see `lib/gbrainStore.ts`,
  run from `scripts/sync.ts`). This is gbrain's local/pglite mode only — no autopilot
  daemon, no cron enrichment, no Telegram integration — kept intentionally minimal given
  it's handling real personal data.
- **SQLite** (`data/brain.db`) is a local query index built from the same normalized
  Facts, used by the app's retrieval step (`lib/db.ts`, simple `LIKE` search on
  title/body/participants/filenames). This exists because gbrain's own query surface
  (`whoknows`, `find-trajectory`, skill-routed agent loop) is designed around a full
  agent harness, not a synchronous "return matching rows" call a Next.js API route can
  shell out to and parse deterministically. Both layers are populated from the exact
  same `Fact[]` in one sync run, so they never disagree about what data exists — SQLite
  is just the faster path for this app's specific query pattern.

## 4. Ingestion pipeline (offline, run manually via `npm run sync`)
1. Auth with stored refresh token.
2. Gmail: list messages from the last N months (default 6), fetch each, normalize to `Fact`.
3. Drive: list files modified in the last N months, normalize to `Fact`. For Google Docs,
   export plain text (capped) into `body`.
4. Upsert into `facts` table (id is stable, so re-running sync is idempotent).

This is intentionally decoupled from the query path — no live API calls happen while
answering a question. Fresher data just means running `npm run sync` again.

## 5. Query pipeline
```
question
  → [LLM call: planner]   extract search keywords + people mentioned, per source
  → [SQLite retrieval]    LIKE-query facts table for gmail candidates + drive candidates
  → [LLM call: synthesizer]  given question + ALL retrieved facts (both sources),
                             produce a conversational answer, grounded ONLY in given facts,
                             citing which source(s) it used
  → answer returned to chat UI
```
The synthesizer prompt is explicitly constrained: if retrieved facts don't answer the
question, say so — never fill gaps from general knowledge. This is what makes cross-source
answers (Tier 2) work: both Gmail and Drive candidates are handed to one LLM call together,
so it can e.g. match a Drive filename against a Gmail attachment name / thread subject itself.

## 6. Target queries (contract)

**Tier 1**
- "What's on my calendar tomorrow?" — *out of scope for this connector pair (no Calendar
  connector); substitute: "What's the most recent unread-looking email in my inbox?"*
- "Find the email from Stripe about the failed payment." → gmail-only retrieval, keyword
  ["Stripe", "payment", "failed"], synthesizer answers from top matching thread.
- "What files have I recently edited in Drive?" → drive-only retrieval, sorted by
  modifiedTime.

**Tier 2**
- "What jobs have I applied to, and what's my status on each, including my take-home
  submission?" → gmail retrieval (keyword: "application", "interview", "offer", etc,
  grouped by thread/company) + drive retrieval (files matching company/role names or
  "take-home"/"assignment") → synthesizer joins per company.
- "Did I ever send \<person\> the \<file\>, and did they reply?" → gmail retrieval
  (participant = person, keyword = file topic) + drive retrieval (matching filename)
  → synthesizer checks thread for a reply from that participant after the send.

## 7. Non-goals
- No write-back to Gmail/Drive (read-only).
- No real-time sync / webhooks — manual `npm run sync`.
- No multi-user auth.
- No vector embeddings / semantic search — keyword `LIKE` search is sufficient at personal-inbox scale and keeps everything free and dependency-light.

## 8. Stack (all free)
- Next.js (App Router) + TypeScript — UI + API routes
- gbrain — system-of-record storage (local/pglite mode, no daemon)
- better-sqlite3 — local query index, zero server, zero cost
- googleapis — Gmail + Drive API access
- @google/generative-ai — Gemini free-tier API (planner + synthesizer calls)
- Run locally via `npm run dev`; optional free-tier deploy later (see README)
