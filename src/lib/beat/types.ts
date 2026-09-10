/** Keystone Beat Module — shared types (M1 fixtures + future D1). */

export type BeatCategory =
  | "breaking"
  | "from_the_beat"
  | "watch"
  | "locker_room"
  | "reaction";

export type SourceTier =
  | "official_team_league"
  | "reporter_original"
  | "broadcaster_publication"
  | "aggregator";

export type BeatMediaType = "x_embed" | "youtube_embed" | "link_out";

export type ApprovalStatus = "pending" | "approved" | "rejected" | "expired";

export type ApprovalMode = "manual" | "automatic";

export type BeatItem = {
  id: string;
  source: string;
  sourceTier: SourceTier;
  authorAccount: string;
  teamSlug?: string;
  league?: string;
  category: BeatCategory;
  /** Short Keystone context / caption (1–3 sentences). Not a rights claim. */
  headline: string;
  context?: string;
  originalUrl: string;
  embedUrl?: string;
  embedId?: string;
  /** Cached X oEmbed HTML without script tags (optional for M1). */
  oembedHtml?: string;
  timestamp: string;
  mediaType: BeatMediaType;
  verifiedOfficial: boolean;
  expiresAt?: string;
  approvalStatus: ApprovalStatus;
  approvalMode: ApprovalMode;
  approvedBy?: string;
  approvedAt?: string;
  pinned?: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
};

/** Public shape returned to /news when the flag is on. */
export type PublicBeatItem = Pick<
  BeatItem,
  | "id"
  | "source"
  | "sourceTier"
  | "authorAccount"
  | "teamSlug"
  | "league"
  | "category"
  | "headline"
  | "context"
  | "originalUrl"
  | "embedUrl"
  | "embedId"
  | "oembedHtml"
  | "timestamp"
  | "mediaType"
  | "verifiedOfficial"
  | "expiresAt"
  | "pinned"
>;

export const BEAT_CATEGORY_LABELS: Record<BeatCategory, string> = {
  breaking: "Breaking",
  from_the_beat: "From the beat",
  watch: "Watch",
  locker_room: "Locker room",
  reaction: "Reaction",
};

export const SOURCE_TIER_LABELS: Record<SourceTier, string> = {
  official_team_league: "Official",
  reporter_original: "Original reporting",
  broadcaster_publication: "Broadcast / publication",
  aggregator: "Aggregator",
};

/** Future editor controls (M3+). Documented + stubbed in admin UI. */
export type BeatEditorAction =
  | "approve"
  | "reject"
  | "edit_context"
  | "change_category"
  | "pin"
  | "expire"
  | "open_original";
