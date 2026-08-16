import { google } from "googleapis";
import type { OAuth2Client } from "google-auth-library";
import type { Fact } from "./db";

export async function fetchDriveFacts(
  auth: OAuth2Client,
  months = 1
): Promise<Fact[]> {
  const drive = google.drive({
    version: "v3",
    auth,
  });

  const afterDate = new Date();

  afterDate.setMonth(afterDate.getMonth() - months);

  const afterISO = afterDate.toISOString();

  const facts: Fact[] = [];

  let pageToken: string | undefined;

  const batchSize = 10;

  do {
    const listRes: any = await drive.files.list({
      q: `modifiedTime > '${afterISO}' and trashed = false`,
      fields:
        "nextPageToken, files(id, name, mimeType, modifiedTime, owners, webViewLink, description)",
      pageSize: 100,
      pageToken,
    });

    const files = listRes.data.files || [];

    console.log(`[drive] Found ${files.length} files on this page`);

    for (let i = 0; i < files.length; i += batchSize) {
      const batch = files.slice(i, i + batchSize);

      console.log(
        `[drive] Processing ${i + 1}-${i + batch.length} of ${files.length}`
      );

      const batchFacts = await Promise.all(
        batch.map(async (f: any): Promise<Fact> => {
          let body: string | null = null;

          if (
            f.mimeType ===
            "application/vnd.google-apps.document"
          ) {
            try {
              const exportRes: any = await drive.files.export(
                {
                  fileId: f.id!,
                  mimeType: "text/plain",
                },
                {
                  responseType: "text",
                }
              );

              body = String(exportRes.data).slice(0, 4000);
            } catch (error) {
              console.warn(
                `[drive] Failed to export ${f.name}:`,
                error
              );

              body = null;
            }
          }

          const owners = (f.owners || [])
            .map((o: any) => o.emailAddress)
            .filter(Boolean);

          return {
            id: `drive:${f.id}`,
            source: "drive",
            type: "file",
            title: f.name || "(untitled)",
            participants: owners,
            timestamp:
              f.modifiedTime || new Date().toISOString(),
            snippet: f.description || f.name || "",
            body,
            filenames: [f.name || ""],
            link: f.webViewLink || "",
            thread_id: null,
          };
        })
      );

      facts.push(...batchFacts);
    }

    pageToken = listRes.data.nextPageToken || undefined;
  } while (pageToken);

  console.log(`[drive] Total facts fetched: ${facts.length}`);

  return facts;
}