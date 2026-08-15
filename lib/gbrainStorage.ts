import { gbrainPool } from "./gbrainDb";
import type { Fact } from "./db";

function escapeMarkdown(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function factToContent(fact: Fact) {
  return fact.body || fact.snippet || "";
}

function factToFrontmatter(fact: Fact) {
  return {
    id: fact.id,
    source: fact.source,
    type: fact.type,
    title: fact.title,
    timestamp: fact.timestamp,
    participants: fact.participants,
    filenames: fact.filenames,
    link: fact.link,
    ...(fact.thread_id ? { thread_id: fact.thread_id } : {}),
  };
}

function buildCompiledTruth(fact: Fact) {
  const frontmatter = factToFrontmatter(fact);

  return [
    "---",
    `id: "${escapeMarkdown(frontmatter.id)}"`,
    `source: "${escapeMarkdown(frontmatter.source)}"`,
    `type: "${escapeMarkdown(frontmatter.type)}"`,
    `title: "${escapeMarkdown(frontmatter.title)}"`,
    `timestamp: "${escapeMarkdown(frontmatter.timestamp)}"`,
    `participants: ${JSON.stringify(frontmatter.participants)}`,
    `filenames: ${JSON.stringify(frontmatter.filenames)}`,
    `link: "${escapeMarkdown(frontmatter.link)}"`,
    frontmatter.thread_id
      ? `thread_id: "${escapeMarkdown(frontmatter.thread_id)}"`
      : null,
    "---",
    "",
    factToContent(fact),
  ]
    .filter((line) => line !== null)
    .join("\n");
}

function buildFrontmatter(fact: Fact) {
  return JSON.stringify(factToFrontmatter(fact));
}

function slugForFact(fact: Fact) {
  const safe = fact.id.replace(/[^a-zA-Z0-9_-]/g, "_");
  return `${fact.source}/${safe}`;
}

export async function ensureGbrainSource() {
  await gbrainPool.query(
    `
      INSERT INTO sources (id, name, config)
      VALUES ($1, $2, $3::jsonb)
      ON CONFLICT (id) DO NOTHING
    `,
    [
      "personal-brain",
      "Personal Brain",
      JSON.stringify({
        type: "gmail-drive",
        managed_by: "personal-brain",
      }),
    ],
  );
}

export async function upsertFactIntoGbrain(fact: Fact) {
  await ensureGbrainSource();

  const slug = slugForFact(fact);
  const compiledTruth = buildCompiledTruth(fact);
  const frontmatter = buildFrontmatter(fact);

  const client = await gbrainPool.connect();

  try {
    await client.query("BEGIN");

    const pageResult = await client.query(
      `
        INSERT INTO pages (
          source_id,
          slug,
          type,
          page_kind,
          title,
          compiled_truth,
          timeline,
          frontmatter,
          content_hash,
          updated_at
        )
        VALUES (
          $1,
          $2,
          $3,
          'markdown',
          $4,
          $5,
          '',
          $6::jsonb,
          md5($5),
          now()
        )
        ON CONFLICT (source_id, slug)
        DO UPDATE SET
          type = EXCLUDED.type,
          title = EXCLUDED.title,
          compiled_truth = EXCLUDED.compiled_truth,
          frontmatter = EXCLUDED.frontmatter,
          content_hash = EXCLUDED.content_hash,
          updated_at = now()
        RETURNING id
      `,
      [
        "personal-brain",
        slug,
        fact.type,
        fact.title,
        compiledTruth,
        frontmatter,
      ],
    );

    const pageId = pageResult.rows[0].id;

    await client.query(
      `
        DELETE FROM content_chunks
        WHERE page_id = $1
      `,
      [pageId],
    );

    await client.query(
      `
        INSERT INTO content_chunks (
          page_id,
          chunk_index,
          chunk_text,
          chunk_source,
          modality
        )
        VALUES (
          $1,
          0,
          $2,
          'compiled_truth',
          'text'
        )
      `,
      [pageId, factToContent(fact)],
    );

    await client.query("COMMIT");

    return pageId;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function upsertFactsIntoGbrain(facts: Fact[]) {
  for (const fact of facts) {
    await upsertFactIntoGbrain(fact);
  }

  return facts.length;
}

export async function getGbrainPageCount() {
  const result = await gbrainPool.query(
    `
      SELECT COUNT(*)::int AS count
      FROM pages
      WHERE deleted_at IS NULL
    `,
  );

  return result.rows[0].count as number;
}