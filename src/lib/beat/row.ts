/** Map D1 rows ↔ BeatItem. */

import type { ApprovalMode, ApprovalStatus, BeatCategory, BeatItem, BeatMediaType, SourceTier } from "./types";

export type BeatItemRow = {
  id: string;
  source: string;
  source_tier: string;
  author_account: string;
  team_slug: string | null;
  league: string | null;
  category: string;
  headline: string;
  context: string | null;
  original_url: string;
  embed_url: string | null;
  embed_id: string | null;
  oembed_html: string | null;
  timestamp: string;
  media_type: string;
  verified_official: number;
  expires_at: string | null;
  approval_status: string;
  approval_mode: string;
  approved_by: string | null;
  approved_at: string | null;
  pinned: number;
  relevance_score: number | null;
  duplicate_fingerprint: string | null;
  created_at: string;
  updated_at: string;
  created_by: string;
};

export const BEAT_ITEM_COLUMNS = `
  id, source, source_tier, author_account, team_slug, league, category, headline, context,
  original_url, embed_url, embed_id, oembed_html, timestamp, media_type, verified_official,
  expires_at, approval_status, approval_mode, approved_by, approved_at, pinned,
  relevance_score, duplicate_fingerprint, created_at, updated_at, created_by
`.replace(/\s+/g, " ").trim();

export function rowToBeatItem(row: BeatItemRow): BeatItem {
  return {
    id: row.id,
    source: row.source,
    sourceTier: row.source_tier as SourceTier,
    authorAccount: row.author_account,
    teamSlug: row.team_slug ?? undefined,
    league: row.league ?? undefined,
    category: row.category as BeatCategory,
    headline: row.headline,
    context: row.context ?? undefined,
    originalUrl: row.original_url,
    embedUrl: row.embed_url ?? undefined,
    embedId: row.embed_id ?? undefined,
    oembedHtml: row.oembed_html ?? undefined,
    timestamp: row.timestamp,
    mediaType: row.media_type as BeatMediaType,
    verifiedOfficial: Boolean(row.verified_official),
    expiresAt: row.expires_at ?? undefined,
    approvalStatus: row.approval_status as ApprovalStatus,
    approvalMode: row.approval_mode as ApprovalMode,
    approvedBy: row.approved_by ?? undefined,
    approvedAt: row.approved_at ?? undefined,
    pinned: Boolean(row.pinned),
    relevanceScore: row.relevance_score ?? undefined,
    duplicateFingerprint: row.duplicate_fingerprint ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    createdBy: row.created_by,
  };
}
