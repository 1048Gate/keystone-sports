import type { BeatCategory, SourceTier } from "./types.ts";

/**
 * Relevance bands (desk guidance):
 *   90–100 breaking
 *   75–89  injury/trade
 *   55–74  strong reporting
 *   35–54  interview/highlight
 *   20–34  reaction
 *   <20    discard
 */
export type ScoreBand =
  | "breaking"
  | "injury_trade"
  | "strong_reporting"
  | "interview_highlight"
  | "reaction"
  | "discard";

export function scoreBandForRelevance(score: number): ScoreBand {
  if (score >= 90) return "breaking";
  if (score >= 75) return "injury_trade";
  if (score >= 55) return "strong_reporting";
  if (score >= 35) return "interview_highlight";
  if (score >= 20) return "reaction";
  return "discard";
}

const BREAKING_HINT =
  /\b(breaking|ruled out|activated|signed|traded|waived|injury report|\bir\b|\bpup\b|suspended|designated for assignment|\bdfa\b|claimed off waivers)\b/i;
const INJURY_TRADE =
  /\b(injury|injured|IL\b|injured list|out for|out indefinitely|surgery|ACL|concussion|trade deadline|acquired|dealt)\b/i;
const INTERVIEW_HIGHLIGHT =
  /\b(interview|press conference|highlights?|watch|full game|postgame|mic'?d up)\b/i;
const RUMOR_HINT = /\b(rumor|sources say|hearing|reportedly|per sources|could be)\b/i;

export function recommendCategory(text: string, fallback: BeatCategory = "from_the_beat"): BeatCategory {
  if (BREAKING_HINT.test(text)) return "breaking";
  if (INTERVIEW_HIGHLIGHT.test(text)) return "watch";
  if (/\b(locker|says|quote|react|reaction)\b/i.test(text)) return "locker_room";
  if (INJURY_TRADE.test(text)) return "from_the_beat";
  return fallback;
}

export function proposeExpiration(category: BeatCategory, timestampIso: string): string | undefined {
  const base = Date.parse(timestampIso);
  if (!Number.isFinite(base)) return undefined;
  const hours =
    category === "breaking" ? 24 : category === "from_the_beat" ? 72 : category === "reaction" ? 96 : 120;
  return new Date(base + hours * 3600_000).toISOString();
}

export function scoreTweet(input: {
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
  if (BREAKING_HINT.test(input.text)) score += 20;
  else if (INJURY_TRADE.test(input.text)) score += 12;
  else if (INTERVIEW_HIGHLIGHT.test(input.text)) score += 5;
  if (input.category === "breaking") score += 8;
  if (RUMOR_HINT.test(input.text)) score -= 20;
  if (input.sourceTier === "aggregator") score = Math.min(score, 50);
  return Math.max(0, Math.min(100, score));
}

export function shouldDiscardByScore(score: number): boolean {
  return scoreBandForRelevance(score) === "discard";
}
