import { google } from "googleapis";
import type { OAuth2Client } from "google-auth-library";
import type { Fact } from "./db";

function headerValue(headers: any[], name: string): string {
  const h = headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase());
  return h ? h.value : "";
}

function extractEmails(headerVal: string): string[] {
  const matches = headerVal.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g);
  return matches || [];
}

function decodeBody(payload: any): string {
  // Walk the MIME parts looking for text/plain; fall back to snippet if not found.
  function findPart(part: any): string | null {
    if (!part) return null;
    if (part.mimeType === "text/plain" && part.body?.data) {
      return Buffer.from(part.body.data, "base64").toString("utf-8");
    }
    if (part.parts) {
      for (const p of part.parts) {
        const found = findPart(p);
        if (found) return found;
      }
    }
    return null;
  }
  return findPart(payload) || "";
}

/**
 * Fetch Gmail messages from the last `months` months and normalize into Facts.
 * Kept intentionally simple: list + get per message. Fine for a personal-scale sync.
 */
export async function fetchGmailFacts(auth: OAuth2Client, months = 6): Promise<Fact[]> {
  const gmail = google.gmail({ version: "v1", auth });
  const afterDate = new Date();
  afterDate.setMonth(afterDate.getMonth() - months);
  const afterStr = `${afterDate.getFullYear()}/${afterDate.getMonth() + 1}/${afterDate.getDate()}`;

  const facts: Fact[] = [];
  let pageToken: string | undefined = undefined;

  do {
    const listRes: any = await gmail.users.messages.list({
      userId: "me",
      q: `after:${afterStr}`,
      maxResults: 100,
      pageToken,
    });

    const messages = listRes.data.messages || [];
    for (const m of messages) {
      const msgRes: any = await gmail.users.messages.get({
        userId: "me",
        id: m.id!,
        format: "full",
      });

      const headers = msgRes.data.payload?.headers || [];
      const subject = headerValue(headers, "Subject") || "(no subject)";
      const from = headerValue(headers, "From");
      const to = headerValue(headers, "To");
      const dateHeader = headerValue(headers, "Date");
      const timestamp = dateHeader ? new Date(dateHeader).toISOString() : new Date().toISOString();

      const participants = [...extractEmails(from), ...extractEmails(to)];
      const body = decodeBody(msgRes.data.payload).slice(0, 4000);

      // Collect attachment filenames from the MIME tree.
      const filenames: string[] = [];
      function walkForAttachments(part: any) {
        if (!part) return;
        if (part.filename) filenames.push(part.filename);
        if (part.parts) part.parts.forEach(walkForAttachments);
      }
      walkForAttachments(msgRes.data.payload);

      facts.push({
        id: `gmail:${m.id}`,
        source: "gmail",
        type: "email",
        title: subject,
        participants,
        timestamp,
        snippet: msgRes.data.snippet || "",
        body,
        filenames,
        link: `https://mail.google.com/mail/u/0/#all/${m.id}`,
        thread_id: msgRes.data.threadId || null,
      });
    }

    pageToken = listRes.data.nextPageToken || undefined;
  } while (pageToken);

  return facts;
}
