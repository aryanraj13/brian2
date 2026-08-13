/**
 * Run once: `npm run auth`
 * Opens a local server, prints a consent URL, and after you approve access in the
 * browser, prints the refresh token to paste into .env.local as GOOGLE_REFRESH_TOKEN.
 */
import dotenv from "dotenv";
   dotenv.config({ path: ".env.local" });
import http from "http";
import { URL } from "url";
import { getOAuth2Client, SCOPES } from "../lib/google";

async function main() {
  const client = getOAuth2Client();

  const authUrl = client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent", // forces a refresh_token to be issued every time
    scope: SCOPES,
  });

  console.log("\n1. Open this URL in your browser and approve access:\n");
  console.log(authUrl);
  console.log("\n2. Waiting for redirect to", process.env.GOOGLE_REDIRECT_URI, "...\n");

  const server = http.createServer(async (req, res) => {
    if (!req.url) return;
    const url = new URL(req.url, process.env.GOOGLE_REDIRECT_URI);
    const code = url.searchParams.get("code");

    if (code) {
      const { tokens } = await client.getToken(code);
      res.end("Auth complete — you can close this tab and return to the terminal.");
      console.log("\n✅ Refresh token obtained. Add this to your .env.local file:\n");
      console.log(`GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}\n`);
      server.close();
      process.exit(0);
    } else {
      res.end("No code received.");
    }
  });

  const port = Number(new URL(process.env.GOOGLE_REDIRECT_URI || "http://localhost:3000").port || 3000);
  server.listen(port, () => console.log(`Listening on port ${port} for the OAuth redirect...`));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
