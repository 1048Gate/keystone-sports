/**
 * X / PA sports discovery — candidate-only (never auto-publishes).
 *
 * Uses public X syndication timeline HTML + curated account list.
 * No ToS-violating scraping of authenticated timelines; no firehose.
 * Manual: `npm run beat:discover` or admin `discoverBeatCandidates` server fn.
 */

import type { BeatCategory, BeatDiscoveryCandidate, SourceTier } from "./types";
import { beatDuplicateFingerprint } from "./fingerprint";
import { classifyBeatMedia } from "./allowlist";

export type DiscoverAccount = {
  handle: string;
  source: string;
  sourceTier: SourceTier;
  teamSlug?: string;
  league?: string;
  verifiedOfficial: boolean;
  defaultCategory: BeatCategory;
};

/** Curated PA sports accounts — not a firehose. Official → reporter → broadcaster. */
export const PA_BEAT_DISCOVERY_ACCOUNTS: DiscoverAccount[] = [
  { handle: "Eagles", source: "@Eagles", sourceTier: "official_team_league", teamSlug: "eagles", league: "NFL", verifiedOfficial: true, defaultCategory: "reaction" },
  { handle: "steelers", source: "@steelers", sourceTier: "official_team_league", teamSlug: "steelers", league: "NFL", verifiedOfficial: true, defaultCategory: "reaction" },
  { handle: "Phillies", source: "@Phillies", sourceTier: "official_team_league", teamSlug: "phillies", league: "MLB", verifiedOfficial: true, defaultCategory: "reaction" },
  { handle: "Pirates", source: "@Pirates", sourceTier: "official_team_league", teamSlug: "pirates", league: "MLB", verifiedOfficial: true, defaultCategory: "reaction" },
  { handle: "sixers", source: "@sixers", sourceTier: "official_team_league", teamSlug: "sixers", league: "NBA", verifiedOfficial: true, defaultCategory: "reaction" },
  { handle: "NHLFlyers", source: "@NHLFlyers", sourceTier: "official_team_league", teamSlug: "flyers", league: "NHL", verifiedOfficial: true, defaultCategory: "reaction" },
  { handle: "penguins", source: "@penguins", sourceTier: "official_team_league", teamSlug: "penguins", league: "NHL", verifiedOfficial: true, defaultCategory: "reaction" },
  { handle: "PhilaUnion", source: "@PhilaUnion", sourceTier: "official_team_league", teamSlug: "union", league: "MLS", verifiedOfficial: true, defaultCategory: "reaction" },
  { handle: "PennStateFball", source: "@PennStateFball", sourceTier: "official_team_league", teamSlug: "penn-state", league: "NCAAF", verifiedOfficial: true, defaultCategory: "reaction" },
  { handle: "Pitt_FB", source: "@Pitt_FB", sourceTier: "official_team_league", teamSlug: "pitt", league: "NCAAF", verifiedOfficial: true, defaultCategory: "reaction" },
  { handle: "Jeff_McLane", source: "Inquirer / Jeff McLane", sourceTier: "reporter_original", teamSlug: "eagles", league: "NFL", verifiedOfficial: false, defaultCategory: "from_the_beat" },
  { handle: "DZangaroNBCS", source: "NBCS Philly / Dave Zangaro", sourceTier: "broadcaster_publication", teamSlug: "eagles", league: "NFL", verifiedOfficial: false, defaultCategory: "locker_room" },
];

const BREAKING_HINT = /\b(breaking|ruled out|activated|signed|traded|waived|injury report|ir\b|pup\b|suspended)\b/i;
const RUMOR_HINT = /\b(rumor|sources say|hearing|reportedly|per sources)\b/i;

export function scoreDiscoveryCandidate(input: {
  sourceTier: SourceTier;
  verifiedOfficial: boolean;
  text: string;
  category: BeatCategory;
}): number {
  let score = 40;
  if (input.sourceTier === "official_team_league") score += 30;
  else if (input.sourceTier === "reporter_original") score += 25;
  else if (input.sourceTier === "broadcaster_publication") score += 15;
  if (input.verifiedOfficial) score += 10;
  if (BREAKING_HINT.test(input.text)) score += 15;
  if (input.category === "breaking") score += 10;
  if (RUMOR_HINT.test(input.text)) score -= 20; // rumors need manual approval; never boost
  // Reddit / aggregators never outrank reporting — capped low if somehow present
  if (input.sourceTier === "aggregator") score = Math.min(score, 25);
  return Math.max(0, Math.min(100, score));
}

export function recommendCategory(text: string, fallback: BeatCategory): BeatCategory {
  if (BREAKING_HINT.test(text)) return "breaking";
  if (/\b(watch|highlights|full game|press conference)\b/i.test(text)) return "watch";
  if (/\b(locker|says|quote|react)\b/i.test(text)) return "locker_room";
  return fallback;
}

export function proposeExpiration(category: BeatCategory, timestampIso: string): string | undefined {
  const base = Date.parse(timestampIso);
  if (!Number.isFinite(base)) return undefined;
  const hours = category === "breaking" ? 24 : category === "from_the_beat" ? 72 : category === "reaction" ? 96 : 120;
  return new Date(base + hours * 3600_000).toISOString();
}

/** Parse status IDs from X syndication timeline HTML (public, no auth). */
export function extractStatusIdsFromSyndicationHtml(html: string): string[] {
  const ids = new Set<string>();
  const re = /status\/(\d{10,})/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) ids.add(m[1]);
  return [...ids];
}

export async function fetchSyndicationTimeline(handle: string, fetchImpl: typeof fetch = fetch): Promise<string> {
  const url = `https://syndication.twitter.com/srv/timeline-profile/screen-name/${encodeURIComponent(handle)}`;
  const res = await fetchImpl(url, {
    headers: { "user-agent": "KeystoneBeatDiscover/1.0 (+https://keystone.twohoundsrun.com)" },
  });
  if (!res.ok) throw new Error(`Syndication fetch failed for @${handle}: ${res.status}`);
  return res.text();
}

export async function fetchXoEmbed(statusUrl: string, fetchImpl: typeof fetch = fetch): Promise<{ html?: string; authorName?: string } | null> {
  const endpoint = `https://publish.twitter.com/oembed?omit_script=true&url=${encodeURIComponent(statusUrl)}`;
  const res = await fetchImpl(endpoint, {
    headers: { "user-agent": "KeystoneBeatDiscover/1.0 (+https://keystone.twohoundsrun.com)" },
  });
  if (!res.ok) return null;
  try {
    const data = (await res.json()) as { html?: string; author_name?: string };
    return { html: data.html, authorName: data.author_name };
  } catch {
    return null;
  }
}

export type DiscoverOptions = {
  accounts?: DiscoverAccount[];
  existingFingerprints?: Set<string>;
  /** Extra URLs already on the News wire (dedupe). */
  newsUrls?: string[];
  fetchImpl?: typeof fetch;
  /** Cap posts considered per account. */
  perAccountLimit?: number;
  now?: Date;
};

/**
 * Discover candidate posts. Does NOT write to D1 — caller inserts as pending.
 */
export async function discoverPaBeatCandidates(opts: DiscoverOptions = {}): Promise<{
  candidates: BeatDiscoveryCandidate[];
  skippedDuplicates: number;
  errors: string[];
}> {
  const accounts = opts.accounts ?? PA_BEAT_DISCOVERY_ACCOUNTS;
  const existing = new Set(opts.existingFingerprints ?? []);
  for (const u of opts.newsUrls ?? []) {
    existing.add(beatDuplicateFingerprint({ originalUrl: u }));
  }
  const fetchImpl = opts.fetchImpl ?? fetch;
  const limit = opts.perAccountLimit ?? 3;
  const candidates: BeatDiscoveryCandidate[] = [];
  const errors: string[] = [];
  let skippedDuplicates = 0;

  for (const account of accounts) {
    try {
      const html = await fetchSyndicationTimeline(account.handle, fetchImpl);
      const ids = extractStatusIdsFromSyndicationHtml(html).slice(0, limit);
      for (const id of ids) {
        const originalUrl = `https://x.com/${account.handle}/status/${id}`;
        const fingerprint = beatDuplicateFingerprint({ originalUrl, teamSlug: account.teamSlug });
        if (existing.has(fingerprint) || existing.has(`x:${id}`)) {
          skippedDuplicates += 1;
          continue;
        }
        const oembed = await fetchXoEmbed(originalUrl, fetchImpl);
        const text = oembed?.html?.replace(/<[^>]+>/g, " ") ?? `Post from @${account.handle}`;
        const category = recommendCategory(text, account.defaultCategory);
        // Rumors stay pending forever until desk labels + approves — never auto boost.
        const media = classifyBeatMedia(originalUrl);
        const timestamp = (opts.now ?? new Date()).toISOString();
        const relevanceScore = scoreDiscoveryCandidate({
          sourceTier: account.sourceTier,
          verifiedOfficial: account.verifiedOfficial,
          text,
          category,
        });
        const candidate: BeatDiscoveryCandidate = {
          originalUrl,
          account: `@${account.handle}`,
          teamSlug: account.teamSlug,
          league: account.league,
          categoryRecommendation: category,
          timestamp,
          sourceTier: account.sourceTier,
          verifiedOfficial: account.verifiedOfficial,
          suggestedContext: RUMOR_HINT.test(text)
            ? "Rumor language detected — keep pending and label before any approve."
            : `Candidate from @${account.handle}. Desk: confirm category, Keystone context, and expiration before approve.`,
          headline: truncateHeadline(stripTags(oembed?.html ?? `@${account.handle} update`), 140),
          source: account.source,
          mediaType: media.mediaType,
          embedUrl: media.embedUrl,
          embedId: media.embedId,
          oembedHtml: oembed?.html,
          relevanceScore,
          duplicateFingerprint: fingerprint,
          proposedExpiration: proposeExpiration(category, timestamp),
        };
        candidates.push(candidate);
        existing.add(fingerprint);
      }
    } catch (err) {
      errors.push(err instanceof Error ? err.message : String(err));
    }
  }

  candidates.sort((a, b) => b.relevanceScore - a.relevanceScore);
  return { candidates, skippedDuplicates, errors };
}

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function truncateHeadline(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trim()}…`;
}

