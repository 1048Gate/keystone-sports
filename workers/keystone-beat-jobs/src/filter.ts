import type { BeatCandidate, SourceTier } from "./types.ts";

const MAX_AGE_MS = 36 * 3600_000;

const JUNK_RE =
  /\b(giveaway|raffle|sweepstakes|free tickets?|win tickets?|merch|merchandise|jersey giveaway|betting|odds|parlay|gambling|draftkings|fanduel|bet\s*\$|promo code|use code|affiliate|sponsored|retweet to enter|rt to win|follow.*(win|enter)|drop a like)\b/i;

const LOW_VALUE_REPLY_RE =
  /\b(this|that|lol|lmao|fire|goat|trash|mid|ratio|ratioed|who cares|cry more)\b/i;

export type FilterReason =
  | "retweet"
  | "old"
  | "junk_promo"
  | "gambling"
  | "low_value_reply"
  | "fan_spam"
  | "no_url"
  | "low_score"
  | "aggregator_bar"
  | "ok";

export function isRetweetText(text: string, flags?: { isRetweet?: boolean }): boolean {
  if (flags?.isRetweet) return true;
  return /^\s*RT\s+@/i.test(text) || /\bRT\s*@\w+/i.test(text.slice(0, 40));
}

export function isTooOld(timestampIso: string, now = Date.now()): boolean {
  const t = Date.parse(timestampIso);
  if (!Number.isFinite(t)) return true;
  return now - t > MAX_AGE_MS;
}

export function isJunkOrPromo(text: string): boolean {
  return JUNK_RE.test(text);
}

export function isFanSpam(text: string, sourceTier: SourceTier): boolean {
  if (sourceTier !== "aggregator") return false;
  const words = text.trim().split(/\s+/).length;
  if (words < 6) return true;
  if (/^[A-Z\s!?.]{8,}$/.test(text.trim()) && words < 12) return true;
  return false;
}

export function isLowValueReply(text: string, isReply?: boolean): boolean {
  if (!isReply) return false;
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  if (words <= 8 && LOW_VALUE_REPLY_RE.test(text)) return true;
  if (words <= 4) return true;
  return false;
}

/**
 * Returns reason if candidate should be discarded; "ok" if it passes.
 * Aggregator tier requires relevanceScore >= 55.
 */
export function filterCandidate(
  c: Pick<
    BeatCandidate,
    "text" | "timestamp" | "originalUrl" | "sourceTier" | "relevanceScore"
  > & { isRetweet?: boolean; isReply?: boolean },
  now = Date.now(),
): FilterReason {
  if (!c.originalUrl?.trim()) return "no_url";
  if (isRetweetText(c.text, { isRetweet: c.isRetweet })) return "retweet";
  if (isTooOld(c.timestamp, now)) return "old";
  if (/\b(betting|odds|parlay|gambling|draftkings|fanduel)\b/i.test(c.text)) return "gambling";
  if (isJunkOrPromo(c.text)) return "junk_promo";
  if (isLowValueReply(c.text, c.isReply)) return "low_value_reply";
  if (isFanSpam(c.text, c.sourceTier)) return "fan_spam";
  if (c.relevanceScore < 20) return "low_score";
  if (c.sourceTier === "aggregator" && c.relevanceScore < 55) return "aggregator_bar";
  return "ok";
}
