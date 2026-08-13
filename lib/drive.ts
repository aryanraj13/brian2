import { google } from "googleapis";
import type { OAuth2Client } from "google-auth-library";
import type { Fact } from "./db";

/**
 * Fetch Drive files modified in the last `months` months and normalize into Facts.
 * For Google Docs, exports plain text (capped) so the body is searchable/synthesizable.
 */
export async function fetchDriveFacts(auth: OAuth2Client, months = 6): Promise<Fact[]> {
  const drive = google.drive({ version: "v3", auth });
  const afterDate = new Date();
  afterDate.setMonth(afterDate.getMonth() - months);
  const afterISO = afterDate.toISOString();

  const facts: Fact[] = [];
  let pageToken: string | undefined = undefined;

  do {
    const listRes: any = await drive.files.list({
      q: `modifiedTime > '${afterISO}' and trashed = false`,
      fields:
        "nextPageToken, files(id, name, mimeType, modifiedTime, owners, webViewLink, description)",
      pageSize: 100,
      pageToken,
    });

    const files = listRes.data.files || [];
    for (const f of files) {
      let body: string | null = null;

      // Export plain text for Google Docs so content is actually searchable.
      if (f.mimeType === "application/vnd.google-apps.document") {
        try {
          const exportRes: any = await drive.files.export(
            { fileId: f.id!, mimeType: "text/plain" },
            { responseType: "text" }
          );
          body = String(exportRes.data).slice(0, 4000);
        } catch {
          body = null;
        }
      }

      const owners = (f.owners || []).map((o: any) => o.emailAddress).filter(Boolean);

      facts.push({
        id: `drive:${f.id}`,
        source: "drive",
        type: "file",
        title: f.name || "(untitled)",
        participants: owners,
        timestamp: f.modifiedTime || new Date().toISOString(),
        snippet: f.description || f.name || "",
        body,
        filenames: [f.name || ""],
        link: f.webViewLink || "",
        thread_id: null,
      });
    }

    pageToken = listRes.data.nextPageToken || undefined;
  } while (pageToken);

  return facts;
}
