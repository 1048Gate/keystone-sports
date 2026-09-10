/** D1 accessors for beat_items. Never returns fixtures. */

import type { BeatItem, BeatCategory, ApprovalStatus } from "./types";
import { BEAT_ITEM_COLUMNS, rowToBeatItem, type BeatItemRow } from "./row";
import { beatDuplicateFingerprint } from "./fingerprint";
import { classifyBeatMedia, normalizeBeatUrl } from "./allowlist";
import type { Database } from "../publishing/runtime.server";

function nowIso() {
  return new Date().toISOString();
}

export async function listBeatItems(database: Database, opts?: { status?: ApprovalStatus | "all" }): Promise<BeatItem[]> {
  const status = opts?.status ?? "all";
  const stmt =
    status === "all"
      ? database.prepare(`SELECT ${BEAT_ITEM_COLUMNS} FROM beat_items ORDER BY updated_at DESC LIMIT 200`)
      : database.prepare(
          `SELECT ${BEAT_ITEM_COLUMNS} FROM beat_items WHERE approval_status = ? ORDER BY updated_at DESC LIMIT 200`,
        ).bind(status);
  const { results } = await stmt.all<BeatItemRow>();
  return results.map(rowToBeatItem);
}

export async function listPublicBeatRows(database: Database, now = new Date()): Promise<BeatItem[]> {
  const iso = now.toISOString();
  const { results } = await database
    .prepare(
      `SELECT ${BEAT_ITEM_COLUMNS} FROM beat_items
       WHERE approval_status = 'approved'
         AND (expires_at IS NULL OR expires_at > ?)
       ORDER BY pinned DESC, updated_at DESC
       LIMIT 100`,
    )
    .bind(iso)
    .all<BeatItemRow>();
  return results.map(rowToBeatItem);
}

export async function getBeatItemById(database: Database, id: string): Promise<BeatItem | null> {
  const row = await database
    .prepare(`SELECT ${BEAT_ITEM_COLUMNS} FROM beat_items WHERE id = ?`)
    .bind(id)
    .first<BeatItemRow>();
  return row ? rowToBeatItem(row) : null;
}

export async function existingBeatFingerprints(database: Database): Promise<Set<string>> {
  const { results } = await database
    .prepare(`SELECT duplicate_fingerprint AS fp, original_url AS url FROM beat_items`)
    .all<{ fp: string | null; url: string }>();
  const set = new Set<string>();
  for (const r of results) {
    if (r.fp) set.add(r.fp);
    const n = normalizeBeatUrl(r.url);
    if (n) set.add(`url:${n.toLowerCase()}`);
  }
  return set;
}

export type UpsertBeatInput = {
  id?: string;
  source: string;
  sourceTier: BeatItem["sourceTier"];
  authorAccount: string;
  teamSlug?: string | null;
  league?: string | null;
  category: BeatCategory;
  headline: string;
  context?: string | null;
  originalUrl: string;
  embedUrl?: string | null;
  embedId?: string | null;
  oembedHtml?: string | null;
  timestamp: string;
  mediaType?: BeatItem["mediaType"];
  verifiedOfficial?: boolean;
  expiresAt?: string | null;
  approvalStatus?: ApprovalStatus;
  approvalMode?: BeatItem["approvalMode"];
  approvedBy?: string | null;
  approvedAt?: string | null;
  pinned?: boolean;
  relevanceScore?: number | null;
  duplicateFingerprint?: string | null;
  createdBy: string;
};

export async function upsertBeatItem(database: Database, input: UpsertBeatInput): Promise<{ id: string }> {
  const id = input.id ?? crypto.randomUUID();
  const originalUrl = normalizeBeatUrl(input.originalUrl) ?? input.originalUrl.trim();
  const classified = classifyBeatMedia(originalUrl);
  const mediaType = input.mediaType ?? classified.mediaType;
  const embedUrl = input.embedUrl ?? classified.embedUrl ?? null;
  const embedId = input.embedId ?? classified.embedId ?? null;
  const fingerprint =
    input.duplicateFingerprint ??
    beatDuplicateFingerprint({
      originalUrl,
      teamSlug: input.teamSlug,
      headline: input.headline,
    });
  const ts = nowIso();
  await database
    .prepare(
      `INSERT INTO beat_items (
        id, source, source_tier, author_account, team_slug, league, category, headline, context,
        original_url, embed_url, embed_id, oembed_html, timestamp, media_type, verified_official,
        expires_at, approval_status, approval_mode, approved_by, approved_at, pinned,
        relevance_score, duplicate_fingerprint, created_at, updated_at, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        source = excluded.source,
        source_tier = excluded.source_tier,
        author_account = excluded.author_account,
        team_slug = excluded.team_slug,
        league = excluded.league,
        category = excluded.category,
        headline = excluded.headline,
        context = excluded.context,
        original_url = excluded.original_url,
        embed_url = excluded.embed_url,
        embed_id = excluded.embed_id,
        oembed_html = excluded.oembed_html,
        timestamp = excluded.timestamp,
        media_type = excluded.media_type,
        verified_official = excluded.verified_official,
        expires_at = excluded.expires_at,
        approval_status = excluded.approval_status,
        approval_mode = excluded.approval_mode,
        approved_by = excluded.approved_by,
        approved_at = excluded.approved_at,
        pinned = excluded.pinned,
        relevance_score = excluded.relevance_score,
        duplicate_fingerprint = excluded.duplicate_fingerprint,
        updated_at = excluded.updated_at`,
    )
    .bind(
      id,
      input.source,
      input.sourceTier,
      input.authorAccount,
      input.teamSlug ?? null,
      input.league ?? null,
      input.category,
      input.headline,
      input.context ?? null,
      originalUrl,
      embedUrl,
      embedId,
      input.oembedHtml ?? null,
      input.timestamp,
      mediaType,
      Number(Boolean(input.verifiedOfficial)),
      input.expiresAt ?? null,
      input.approvalStatus ?? "pending",
      input.approvalMode ?? "manual",
      input.approvedBy ?? null,
      input.approvedAt ?? null,
      Number(Boolean(input.pinned)),
      input.relevanceScore ?? null,
      fingerprint,
      ts,
      ts,
      input.createdBy,
    )
    .run();
  return { id };
}

export async function patchBeatItem(
  database: Database,
  id: string,
  patch: Partial<{
    context: string | null;
    headline: string;
    category: BeatCategory;
    approvalStatus: ApprovalStatus;
    approvedBy: string | null;
    approvedAt: string | null;
    pinned: boolean;
    expiresAt: string | null;
  }>,
): Promise<void> {
  const current = await getBeatItemById(database, id);
  if (!current) throw new Error("Beat item not found.");
  const next = {
    context: patch.context !== undefined ? patch.context : current.context ?? null,
    headline: patch.headline ?? current.headline,
    category: patch.category ?? current.category,
    approvalStatus: patch.approvalStatus ?? current.approvalStatus,
    approvedBy: patch.approvedBy !== undefined ? patch.approvedBy : current.approvedBy ?? null,
    approvedAt: patch.approvedAt !== undefined ? patch.approvedAt : current.approvedAt ?? null,
    pinned: patch.pinned !== undefined ? patch.pinned : Boolean(current.pinned),
    expiresAt: patch.expiresAt !== undefined ? patch.expiresAt : current.expiresAt ?? null,
  };
  await database
    .prepare(
      `UPDATE beat_items SET context = ?, headline = ?, category = ?, approval_status = ?,
       approved_by = ?, approved_at = ?, pinned = ?, expires_at = ?, updated_at = ?
       WHERE id = ?`,
    )
    .bind(
      next.context,
      next.headline,
      next.category,
      next.approvalStatus,
      next.approvedBy,
      next.approvedAt,
      Number(next.pinned),
      next.expiresAt,
      nowIso(),
      id,
    )
    .run();
}
