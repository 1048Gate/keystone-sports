import type { BeatCandidate, RawApifyTweet, SourceTier } from "./types.ts";
import { inferTeamFromText } from "./searches.ts";
import { proposeExpiration, recommendCategory, scoreTweet } from "./score.ts";

/** Known PA beat handles → tier + verified. */
const HANDLE_META: Record<
  string,
  { sourceTier: SourceTier; verifiedOfficial: boolean; source: string; teamSlug?: string; league?: string }
> = {
  eagles: { sourceTier: "official_team_league", verifiedOfficial: true, source: "@Eagles", teamSlug: "eagles", league: "NFL" },
  steelers: { sourceTier: "official_team_league", verifiedOfficial: true, source: "@steelers", teamSlug: "steelers", league: "NFL" },
  phillies: { sourceTier: "official_team_league", verifiedOfficial: true, source: "@Phillies", teamSlug: "phillies", league: "MLB" },
  pirates: { sourceTier: "official_team_league", verifiedOfficial: true, source: "@Pirates", teamSlug: "pirates", league: "MLB" },
  sixers: { sourceTier: "official_team_league", verifiedOfficial: true, source: "@sixers", teamSlug: "sixers", league: "NBA" },
  nhlflyers: { sourceTier: "official_team_league", verifiedOfficial: true, source: "@NHLFlyers", teamSlug: "flyers", league: "NHL" },
  penguins: { sourceTier: "official_team_league", verifiedOfficial: true, source: "@penguins", teamSlug: "penguins", league: "NHL" },
  philaunion: { sourceTier: "official_team_league", verifiedOfficial: true, source: "@PhilaUnion", teamSlug: "union", league: "MLS" },
  pennstatefball: {
    sourceTier: "official_team_league",
    verifiedOfficial: true,
    source: "@PennStateFball",
    teamSlug: "penn-state",
    league: "NCAAF",
  },
  pitt_fb: { sourceTier: "official_team_league", verifiedOfficial: true, source: "@Pitt_FB", teamSlug: "pitt", league: "NCAAF" },
  jeff_mclane: {
    sourceTier: "reporter_original",
    verifiedOfficial: false,
    source: "Inquirer / Jeff McLane",
    teamSlug: "eagles",
    league: "NFL",
  },
  dzangaronbcs: {
    sourceTier: "broadcaster_publication",
    verifiedOfficial: false,
    source: "NBCS Philly / Dave Zangaro",
    teamSlug: "eagles",
    league: "NFL",
  },
  tim_mcmanus: {
    sourceTier: "reporter_original",
    verifiedOfficial: false,
    source: "ESPN / Tim McManus",
    teamSlug: "eagles",
    league: "NFL",
  },
  eliotshorr: {
    sourceTier: "reporter_original",
    verifiedOfficial: false,
    source: "Eliot Shorr-Parks",
    teamSlug: "eagles",
    league: "NFL",
  },
  markkaboly: {
    sourceTier: "reporter_original",
    verifiedOfficial: false,
    source: "Mark Kaboly",
    teamSlug: "steelers",
    league: "NFL",
  },
  dalelolley: {
    sourceTier: "reporter_original",
    verifiedOfficial: false,
    source: "Dale Lolley",
    teamSlug: "steelers",
    league: "NFL",
  },
  m_gelb: {
    sourceTier: "reporter_original",
    verifiedOfficial: false,
    source: "Matt Gelb",
    teamSlug: "phillies",
    league: "MLB",
  },
};

export function extractHandle(raw: RawApifyTweet): string {
  const a =
    raw.author?.userName ||
    raw.author?.username ||
    raw.user?.screen_name ||
    "";
  return String(a).replace(/^@/, "").trim();
}

export function extractText(raw: RawApifyTweet): string {
  return String(raw.fullText || raw.full_text || raw.text || "").trim();
}

export function extractStatusId(raw: RawApifyTweet): string | undefined {
  const id = raw.id_str || (raw.id != null ? String(raw.id) : undefined);
  if (id && /^\d{10,}$/.test(id)) return id;
  const url = String(raw.url || raw.twitterUrl || "");
  const m = url.match(/status(?:es)?\/(\d{10,})/i);
  return m?.[1];
}

export function extractUrl(raw: RawApifyTweet, handle: string, statusId?: string): string | null {
  const direct = String(raw.url || raw.twitterUrl || "").trim();
  if (direct && /status(?:es)?\/\d{10,}/i.test(direct)) {
    return normalizeXUrl(direct);
  }
  if (statusId && handle) return `https://x.com/${handle}/status/${statusId}`;
  if (statusId) return `https://x.com/i/status/${statusId}`;
  return null;
}

export function normalizeXUrl(raw: string): string {
  try {
    const u = new URL(raw.trim());
    u.hash = "";
    for (const key of [...u.searchParams.keys()]) {
      if (key.startsWith("utm_") || key === "ref_src" || key === "s" || key === "t") {
        u.searchParams.delete(key);
      }
    }
    let host = u.hostname.toLowerCase();
    if (host === "twitter.com" || host === "www.twitter.com" || host === "mobile.twitter.com") {
      host = "x.com";
    }
    u.hostname = host === "www.x.com" ? "x.com" : host;
    let out = u.toString();
    if (out.endsWith("/") && u.pathname !== "/") out = out.slice(0, -1);
    return out;
  } catch {
    return raw.trim();
  }
}

export function parseTweetTimestamp(raw: RawApifyTweet): string {
  const s = raw.createdAt || raw.created_at;
  if (typeof s === "string" && s.trim()) {
    const t = Date.parse(s);
    if (Number.isFinite(t)) return new Date(t).toISOString();
  }
  return new Date().toISOString();
}

export function truncateHeadline(text: string, max = 140): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1).trim()}…`;
}

export function fingerprintForUrl(url: string): string {
  const m = url.match(/status(?:es)?\/(\d{10,})/i);
  if (m) return `x:${m[1]}`;
  return `url:${url.toLowerCase()}`;
}

/**
 * Apify dataset item → Beat candidate shape (not yet filtered).
 * media_type is always x_embed for tweets — never download video.
 */
export function normalizeApifyItem(raw: RawApifyTweet): (BeatCandidate & {
  isRetweet?: boolean;
  isReply?: boolean;
}) | null {
  const handle = extractHandle(raw);
  const text = extractText(raw);
  const statusId = extractStatusId(raw);
  const originalUrl = extractUrl(raw, handle, statusId);
  if (!originalUrl || !text) return null;

  const key = handle.toLowerCase();
  const meta = HANDLE_META[key];
  const inferred = inferTeamFromText(text, handle);
  const sourceTier: SourceTier = meta?.sourceTier ?? "aggregator";
  const verifiedOfficial =
    meta?.verifiedOfficial ?? Boolean(raw.author?.verified || raw.author?.isVerified || raw.user?.verified);
  const teamSlug = meta?.teamSlug ?? inferred.teamSlug;
  const league = meta?.league ?? inferred.league;
  const category = recommendCategory(text, meta ? "from_the_beat" : "reaction");
  const relevanceScore = scoreTweet({ sourceTier, verifiedOfficial, text, category });
  const timestamp = parseTweetTimestamp(raw);
  const account = handle ? `@${handle}` : "unknown";
  const embedId = statusId;
  const embedUrl = statusId ? `https://x.com/i/status/${statusId}` : originalUrl;

  const isRetweet = Boolean(raw.isRetweet || raw.retweeted) || /^\s*RT\s+@/i.test(text);
  const isReply = Boolean(raw.isReply);

  return {
    originalUrl,
    account,
    teamSlug,
    league,
    category,
    headline: truncateHeadline(text, 140),
    suggestedContext: `Apify X discovery (${sourceTier}). Desk: confirm category, Keystone Beat context, and expiration before approve. Never auto-publish.`,
    source: meta?.source ?? account,
    sourceTier,
    verifiedOfficial,
    timestamp,
    mediaType: "x_embed",
    embedUrl,
    embedId,
    relevanceScore,
    duplicateFingerprint: fingerprintForUrl(originalUrl),
    proposedExpiration: proposeExpiration(category, timestamp),
    text,
    isRetweet,
    isReply,
  };
}

export function normalizeApifyItems(items: RawApifyTweet[]): Array<
  BeatCandidate & { isRetweet?: boolean; isReply?: boolean }
> {
  const out: Array<BeatCandidate & { isRetweet?: boolean; isReply?: boolean }> = [];
  for (const item of items) {
    const n = normalizeApifyItem(item);
    if (n) out.push(n);
  }
  return out;
}
