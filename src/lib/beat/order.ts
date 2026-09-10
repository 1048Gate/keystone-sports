import type { BeatCategory, BeatItem, PublicBeatItem, SourceTier } from "./types";

/**
 * Editorial sort (NOT pure newest):
 * Breaking → important original reporting → official team/league →
 * useful video → locker-room/community → Reaction
 *
 * Pins float to the top within the public feed. Source-tier is the
 * secondary key inside a bucket; timestamp (newer first) is the tertiary.
 */

const CATEGORY_BUCKET: Record<BeatCategory, number> = {
  breaking: 0,
  from_the_beat: 1,
  watch: 3,
  locker_room: 4,
  reaction: 5,
};

const TIER_RANK: Record<SourceTier, number> = {
  official_team_league: 0,
  reporter_original: 1,
  broadcaster_publication: 2,
  aggregator: 3,
};

/** Bucket number used by sortBeatItems / tests. Lower = earlier. */
export function beatEditorialBucket(item: Pick<PublicBeatItem, "category" | "sourceTier">): number {
  if (item.category === "breaking") return 0;
  if (item.category === "from_the_beat") return 1;
  // Official team/league sits between original reporting and generic Watch.
  if (item.sourceTier === "official_team_league" && item.category === "watch") return 2;
  if (item.category === "watch") return 3;
  if (item.category === "locker_room") return 4;
  if (item.category === "reaction") return 5;
  return CATEGORY_BUCKET[item.category] ?? 6;
}

function ts(iso: string | undefined): number {
  if (!iso) return 0;
  const n = Date.parse(iso);
  return Number.isFinite(n) ? n : 0;
}

export function isBeatPubliclyVisible(
  item: Pick<BeatItem, "approvalStatus" | "expiresAt">,
  now: Date = new Date(),
): boolean {
  if (item.approvalStatus !== "approved") return false;
  if (!item.expiresAt) return true;
  const exp = Date.parse(item.expiresAt);
  if (!Number.isFinite(exp)) return true;
  return exp > now.getTime();
}

export function toPublicBeatItem(item: BeatItem): PublicBeatItem {
  return {
    id: item.id,
    source: item.source,
    sourceTier: item.sourceTier,
    authorAccount: item.authorAccount,
    teamSlug: item.teamSlug,
    league: item.league,
    category: item.category,
    headline: item.headline,
    context: item.context,
    originalUrl: item.originalUrl,
    embedUrl: item.embedUrl,
    embedId: item.embedId,
    oembedHtml: item.oembedHtml,
    timestamp: item.timestamp,
    mediaType: item.mediaType,
    verifiedOfficial: item.verifiedOfficial,
    expiresAt: item.expiresAt,
    pinned: item.pinned,
  };
}

export function sortBeatItems<T extends Pick<PublicBeatItem, "category" | "sourceTier" | "timestamp" | "pinned">>(
  items: T[],
): T[] {
  return [...items].sort((a, b) => {
    const pinA = a.pinned ? 0 : 1;
    const pinB = b.pinned ? 0 : 1;
    if (pinA !== pinB) return pinA - pinB;

    const bucketA = beatEditorialBucket(a);
    const bucketB = beatEditorialBucket(b);
    if (bucketA !== bucketB) return bucketA - bucketB;

    const tierA = TIER_RANK[a.sourceTier] ?? 9;
    const tierB = TIER_RANK[b.sourceTier] ?? 9;
    if (tierA !== tierB) return tierA - tierB;

    // Newer first within the same editorial slot.
    return ts(b.timestamp) - ts(a.timestamp);
  });
}

export function selectPublicBeatItems(items: BeatItem[], now: Date = new Date()): PublicBeatItem[] {
  return sortBeatItems(items.filter((item) => isBeatPubliclyVisible(item, now)).map(toPublicBeatItem));
}
