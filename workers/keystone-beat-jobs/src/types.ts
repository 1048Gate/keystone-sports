/** Shared types for keystone-beat-jobs (PENDING candidates only). */

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

export type Env = {
  DB: D1Database;
  APIFY_TOKEN?: string;
  /** "true" to allow Apify X discovery (default off — no paid plan yet). */
  KEYSTONE_APIFY_ENABLED?: string;
  KEYSTONE_JOBS_SECRET?: string;
  KEYSTONE_BEAT_INGEST_SECRET?: string;
  /** "true" to allow direct D1 fallback when HTTP ingest fails (dev/emergency only). */
  KEYSTONE_ALLOW_DIRECT_D1_FALLBACK?: string;
  /** HTTP ingest timeout in ms (default 10000, clamped 3000–30000). */
  KEYSTONE_INGEST_TIMEOUT_MS?: string;
};

export type RawApifyTweet = {
  id?: string | number;
  id_str?: string;
  url?: string;
  twitterUrl?: string;
  text?: string;
  full_text?: string;
  fullText?: string;
  createdAt?: string;
  created_at?: string;
  isRetweet?: boolean;
  isQuote?: boolean;
  isReply?: boolean;
  retweeted?: boolean;
  author?: {
    userName?: string;
    username?: string;
    name?: string;
    verified?: boolean;
    isVerified?: boolean;
  };
  user?: {
    screen_name?: string;
    name?: string;
    verified?: boolean;
  };
  retweetCount?: number;
  likeCount?: number;
  replyCount?: number;
  quoteCount?: number;
  lang?: string;
  [key: string]: unknown;
};

export type BeatCandidate = {
  originalUrl: string;
  account: string;
  teamSlug?: string;
  league?: string;
  category: BeatCategory;
  headline: string;
  suggestedContext: string;
  source: string;
  sourceTier: SourceTier;
  verifiedOfficial: boolean;
  timestamp: string;
  mediaType: BeatMediaType;
  embedUrl?: string;
  embedId?: string;
  relevanceScore: number;
  duplicateFingerprint: string;
  proposedExpiration?: string;
  text: string;
};

export type JobRunStats = {
  jobType: string;
  startedAt: string;
  finishedAt?: string;
  apifyRunId?: string;
  retrieved: number;
  discarded: number;
  deduped: number;
  pendingWritten: number;
  approxCostUsd?: number;
  error?: string;
  summary?: Record<string, unknown>;
};
