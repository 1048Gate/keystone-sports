import type { BeatCandidate, Env } from "./types.ts";

const INGEST_URL = "https://keystonebeat.com/api/editor/beat/ingest";

/** Default HTTP ingest timeout (ms). Bounded between 3s and 30s. */
const DEFAULT_INGEST_TIMEOUT_MS = 10_000;
const MIN_INGEST_TIMEOUT_MS = 3_000;
const MAX_INGEST_TIMEOUT_MS = 30_000;

/**
 * Stable error codes for write results. These are sanitized — they never
 * contain raw server response text, tokens, or internal implementation details.
 */
export type IngestErrorCode =
  | "INGEST_REJECTED"
  | "INGEST_UNAVAILABLE"
  | "INGEST_TIMEOUT"
  | "INGEST_NOT_CONFIGURED";

export type WriteResult = {
  path: "http_ingest" | "d1_direct" | "failed";
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

/** Resolve the HTTP ingest timeout from env, clamped to safe bounds. */
function resolveTimeout(env: Env): number {
  const raw = Number(env.KEYSTONE_INGEST_TIMEOUT_MS);
  if (!Number.isFinite(raw)) return DEFAULT_INGEST_TIMEOUT_MS;
  return Math.max(MIN_INGEST_TIMEOUT_MS, Math.min(MAX_INGEST_TIMEOUT_MS, raw));
}

/**
 * Classify a non-success HTTP response into a stable error code.
 * Never includes the response body or arbitrary server text.
 */
function classifyHttpError(status: number): IngestErrorCode {
  if (status === 401 || status === 403) return "INGEST_REJECTED";
  if (status === 415 || status === 400 || status === 422 || status === 413 || status === 405) {
    return "INGEST_REJECTED";
  }
  return "INGEST_UNAVAILABLE";
}

async function writeViaHttpIngest(
  secret: string,
  candidates: BeatCandidate[],
  timeoutMs: number,
): Promise<WriteResult> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(INGEST_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ candidates: candidates.map(toIngestPayload) }),
      signal: controller.signal,
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
      const code = classifyHttpError(res.status);
      return {
        path: "failed",
        pendingWritten: 0,
        skippedDuplicates: 0,
        discarded: 0,
        errors: [`${code}:${res.status}`],
        items: [],
      };
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
  } catch (err) {
    // Distinguish timeout from other network failures.
    if (err instanceof DOMException && err.name === "AbortError") {
      return {
        path: "failed",
        pendingWritten: 0,
        skippedDuplicates: 0,
        discarded: 0,
        errors: ["INGEST_TIMEOUT"],
        items: [],
      };
    }
    return {
      path: "failed",
      pendingWritten: 0,
      skippedDuplicates: 0,
      discarded: 0,
      errors: ["INGEST_UNAVAILABLE"],
      items: [],
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

function newBeatId(): string {
  return `beat_${crypto.randomUUID().replace(/-/g, "").slice(0, 20)}`;
}

/**
 * Direct D1 INSERT matching beat_items schema — PENDING only, never approve.
 * Only used when KEYSTONE_ALLOW_DIRECT_D1_FALLBACK=true is explicitly set.
 */
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
 *
 * If the ingest secret is configured, HTTP ingest is the primary write path.
 * HTTP failures (auth, validation, timeout, network) do NOT fall back to D1
 * unless KEYSTONE_ALLOW_DIRECT_D1_FALLBACK=true is explicitly set.
 *
 * If no ingest secret is configured, the function fails closed with
 * INGEST_NOT_CONFIGURED unless KEYSTONE_ALLOW_DIRECT_D1_FALLBACK=true.
 *
 * This ensures the authenticated HTTP boundary is authoritative — a missing
 * secret or a failed ingest request cannot bypass validation by writing
 * directly to D1.
 */
export async function writePendingCandidates(
  env: Env,
  candidates: BeatCandidate[],
): Promise<WriteResult> {
  if (candidates.length === 0) {
    return {
      path: env.KEYSTONE_BEAT_INGEST_SECRET ? "http_ingest" : "failed",
      pendingWritten: 0,
      skippedDuplicates: 0,
      discarded: 0,
      errors: [],
      items: [],
    };
  }

  const ingestSecret = (env.KEYSTONE_BEAT_INGEST_SECRET || "").trim();
  const allowD1Fallback =
    (env.KEYSTONE_ALLOW_DIRECT_D1_FALLBACK || "").trim().toLowerCase() === "true";

  if (!ingestSecret) {
    // No ingest secret configured: fail closed unless explicit D1 fallback.
    if (allowD1Fallback) {
      return writeViaD1(env, candidates);
    }
    return {
      path: "failed",
      pendingWritten: 0,
      skippedDuplicates: 0,
      discarded: 0,
      errors: ["INGEST_NOT_CONFIGURED"],
      items: [],
    };
  }

  // Ingest secret is configured: HTTP ingest is the primary path.
  const httpResult = await writeViaHttpIngest(
    ingestSecret,
    candidates,
    resolveTimeout(env),
  );

  if (httpResult.path !== "failed") {
    return httpResult;
  }

  // HTTP ingest failed. Only fall back to D1 if explicitly enabled.
  if (allowD1Fallback) {
    return writeViaD1(env, candidates);
  }

  // No fallback: return the failed HTTP result.
  return httpResult;
}
