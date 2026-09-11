import type { BeatCandidate, Env } from "./types.ts";

const INGEST_URL = "https://keystonebeat.com/api/editor/beat/ingest";

export type WriteResult = {
  path: "http_ingest" | "d1_direct";
  pendingWritten: number;
  skippedDuplicates: number;
  discarded: number;
  errors: string[];
  items: Array<{ originalUrl: string; relevanceScore: number; headline: string; teamSlug?: string }>;
};

function toIngestPayload(c: BeatCandidate) {
  return {
    originalUrl: c.originalUrl,
    headline: c.headline,
    text: c.text,
    source: c.source,
    account: c.account,
    teamSlug: c.teamSlug,
    league: c.league,
    sourceTier: c.sourceTier,
    verifiedOfficial: c.verifiedOfficial,
    category: c.category,
    suggestedContext: c.suggestedContext,
    timestamp: c.timestamp,
    mediaType: c.mediaType,
    embedUrl: c.embedUrl,
    embedId: c.embedId,
    relevanceScore: c.relevanceScore,
    duplicateFingerprint: c.duplicateFingerprint,
    proposedExpiration: c.proposedExpiration,
  };
}

async function writeViaHttpIngest(
  secret: string,
  candidates: BeatCandidate[],
): Promise<WriteResult> {
  const res = await fetch(INGEST_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ candidates: candidates.map(toIngestPayload) }),
  });
  const body = (await res.json().catch(() => ({}))) as {
    inserted?: number;
    skippedDuplicates?: number;
    discarded?: number;
    errors?: string[];
    items?: Array<{ originalUrl: string; relevanceScore: number; category?: string }>;
    error?: string;
  };
  if (!res.ok) {
    throw new Error(`HTTP ingest failed: ${res.status} ${body.error || JSON.stringify(body).slice(0, 200)}`);
  }
  return {
    path: "http_ingest",
    pendingWritten: body.inserted ?? 0,
    skippedDuplicates: body.skippedDuplicates ?? 0,
    discarded: body.discarded ?? 0,
    errors: body.errors ?? [],
    items: (body.items ?? []).map((i, idx) => ({
      originalUrl: i.originalUrl,
      relevanceScore: i.relevanceScore,
      headline: candidates[idx]?.headline ?? i.originalUrl,
      teamSlug: candidates.find((c) => c.originalUrl === i.originalUrl)?.teamSlug,
    })),
  };
}

function newBeatId(): string {
  return `beat_${crypto.randomUUID().replace(/-/g, "").slice(0, 20)}`;
}

/** Direct D1 INSERT matching beat_items schema — PENDING only, never approve. */
async function writeViaD1(env: Env, candidates: BeatCandidate[]): Promise<WriteResult> {
  let pendingWritten = 0;
  let skippedDuplicates = 0;
  const errors: string[] = [];
  const items: WriteResult["items"] = [];
  const now = new Date().toISOString();

  for (const c of candidates) {
    try {
      const existing = await env.DB.prepare(
        `SELECT id FROM beat_items WHERE original_url = ? OR duplicate_fingerprint = ? LIMIT 1`,
      )
        .bind(c.originalUrl, c.duplicateFingerprint)
        .first<{ id: string }>();
      if (existing) {
        skippedDuplicates += 1;
        continue;
      }
      const id = newBeatId();
      await env.DB.prepare(
        `INSERT INTO beat_items (
          id, source, source_tier, author_account, team_slug, league, category,
          headline, context, original_url, embed_url, embed_id, oembed_html,
          timestamp, media_type, verified_official, expires_at,
          approval_status, approval_mode, approved_by, approved_at, pinned,
          relevance_score, duplicate_fingerprint, created_at, updated_at, created_by
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?, NULL,
          ?, ?, ?, ?,
          'pending', 'manual', NULL, NULL, 0,
          ?, ?, ?, ?, ?
        )`,
      )
        .bind(
          id,
          c.source,
          c.sourceTier,
          c.account,
          c.teamSlug ?? null,
          c.league ?? null,
          c.category,
          c.headline,
          c.suggestedContext,
          c.originalUrl,
          c.embedUrl ?? null,
          c.embedId ?? null,
          c.timestamp,
          c.mediaType,
          c.verifiedOfficial ? 1 : 0,
          c.proposedExpiration ?? null,
          c.relevanceScore,
          c.duplicateFingerprint,
          now,
          now,
          "jobs:keystone-beat-jobs",
        )
        .run();
      pendingWritten += 1;
      items.push({
        originalUrl: c.originalUrl,
        relevanceScore: c.relevanceScore,
        headline: c.headline,
        teamSlug: c.teamSlug,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (/UNIQUE|unique/i.test(msg)) skippedDuplicates += 1;
      else errors.push(msg);
    }
  }

  return {
    path: "d1_direct",
    pendingWritten,
    skippedDuplicates,
    discarded: 0,
    errors,
    items,
  };
}

/**
 * Prefer HTTP ingest with KEYSTONE_BEAT_INGEST_SECRET (narrow permissions).
 * Fall back to direct D1 INSERT if ingest secret unavailable.
 */
export async function writePendingCandidates(
  env: Env,
  candidates: BeatCandidate[],
): Promise<WriteResult> {
  if (candidates.length === 0) {
    return {
      path: env.KEYSTONE_BEAT_INGEST_SECRET ? "http_ingest" : "d1_direct",
      pendingWritten: 0,
      skippedDuplicates: 0,
      discarded: 0,
      errors: [],
      items: [],
    };
  }
  const ingestSecret = (env.KEYSTONE_BEAT_INGEST_SECRET || "").trim();
  if (ingestSecret) {
    try {
      return await writeViaHttpIngest(ingestSecret, candidates);
    } catch (err) {
      // Fall back to D1 if HTTP path fails
      const fallback = await writeViaD1(env, candidates);
      fallback.errors = [
        `http_ingest_failed: ${err instanceof Error ? err.message : String(err)}`,
        ...fallback.errors,
      ];
      return fallback;
    }
  }
  return writeViaD1(env, candidates);
}
