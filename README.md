# Personal Brain

A conversational agent over your Gmail and Google Drive. Ask questions in a chat UI;
it retrieves facts from both sources and reasons across them in one answer.

Everything used here is free: Google's own APIs (free quota), Gemini's free-tier API,
and local SQLite storage — no paid services, no credit card required anywhere.

See `SPEC.md` for the design this was built against.

## 1. Prerequisites
- Node.js 18+
- A Google account (use a throwaway/test account if you don't want to connect your main one)

## 2. Get Google OAuth credentials (free)
1. Go to https://console.cloud.google.com and create a new project.
2. Enable **Gmail API** and **Google Drive API** (APIs & Services → Library).
3. Configure the OAuth consent screen (External, testing mode is fine — you'll add
   yourself as a test user, no verification needed for personal use).
4. Create OAuth Client ID credentials (Application type: **Web application**).
   Add `http://localhost:3000/oauth2callback` as an authorized redirect URI.
5. Copy the generated Client ID and Client Secret.

## 3. Get a Gemini API key (free)
Go to https://aistudio.google.com/apikey and generate a free API key. No billing required
for the free tier — plenty of quota for this project's usage.

## 4. Configure environment
```bash
cp .env.example .env.local
```
Fill in `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `GEMINI_API_KEY`.
Leave `GOOGLE_REFRESH_TOKEN` blank for now.

## 5. Install and authenticate
```bash
npm install
npm run auth
```
This prints a URL — open it, approve access (Gmail + Drive read-only) with your
Google account, and the script will print a refresh token. Paste it into `.env.local`
as `GOOGLE_REFRESH_TOKEN`.

## 6. Set up gbrain (system-of-record store)
```bash
bun install -g github:garrytan/gbrain
gbrain init --pglite
```
This is the minimal local mode — no autopilot daemon, no cron enrichment, no Telegram.
Run `gbrain doctor` after to confirm it's healthy.

**Before this step**, verify `gbrain import --help` yourself and check `lib/gbrainStore.ts`
— the exact CLI flags (`GBRAIN_IMPORT_CMD` / `GBRAIN_IMPORT_ARGS`) were written from public
docs, not tested locally, and gbrain has changed its CLI between versions before. Adjust
if your installed version differs.

If you'd rather not deal with gbrain during initial testing, set `SKIP_GBRAIN=1` before
`npm run sync` — the app's SQLite index still gets fully populated and the chat UI works
end-to-end; you can backfill the gbrain import later once you've confirmed the CLI syntax.

## 7. Ingest your data
```bash
npm run sync
```
Pulls the last 6 months of Gmail + Drive, writes them into the SQLite query index
(`data/brain.db`, gitignored — never committed) **and** exports + imports them into gbrain
as the system-of-record store. Re-run any time to refresh. Adjust the window with
`SYNC_MONTHS=12 npm run sync`.

## 8. Run it
```bash
npm run dev
```
Open http://localhost:3000 and start asking questions.

## Example queries to try
- "Find the email from Stripe about the failed payment."
- "What files have I recently edited in Drive?"
- "What jobs have I applied to, and what's my status on each, including my take-home submission?"
- "Did I ever send [person] the [file], and did they reply?"

## Notes
- Read-only scopes — this never modifies your Gmail or Drive.
- Ingestion is a separate step from querying (`npm run sync` vs the chat UI) — the
  chat UI only ever reads from the local SQLite file, never calls Gmail/Drive live.
- If a question can't be answered from what's been synced, the assistant will say so
  rather than guessing — see `SPEC.md` §5 for why that's an explicit design constraint.

## Optional: deploying
The assignment prefers a Vercel deployment. Note that Vercel's serverless functions
have an ephemeral filesystem, so a local SQLite file won't persist across deploys/requests
there. Easiest free path if you want a hosted demo: swap `better-sqlite3` for a free-tier
hosted Postgres (e.g. Neon, no credit card required) using the same `facts` table shape —
or just run locally for the demo video, which the assignment explicitly allows.
