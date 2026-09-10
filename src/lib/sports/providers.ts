/**
 * Canonical sportsbook / odds-provider labels for Keystone.
 *
 * ESPN (and other feeds) spell the same book many ways — "Draft Kings",
 * "draftkings", "DRAFTKINGS". Route every inbound name through
 * `normalizeBookName` so the odds UI, game cards, and parsers stay consistent.
 *
 * Only maps books that actually appear (or commonly appear) in feed data —
 * do not invent books Keystone never shows.
 */

/** Collapse internal whitespace and trim. */
function tidy(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}

/**
 * Match patterns → canonical display label.
 * Order matters only when patterns could overlap; keep tighter aliases first.
 */
const BOOK_CANONICAL: ReadonlyArray<{ test: RegExp; label: string }> = [
  { test: /^draft\s*kings$/i, label: "DraftKings" },
  { test: /^fan\s*duel$/i, label: "FanDuel" },
  { test: /^bet\s*m\.?\s*g\.?\s*m\.?$/i, label: "BetMGM" },
  { test: /^mgm(\s*resorts?)?$/i, label: "BetMGM" },
  { test: /^caesars(\s*sportsbook)?$/i, label: "Caesars" },
  { test: /^points?\s*bet$/i, label: "PointsBet" },
  { test: /^bet\s*365$/i, label: "Bet365" },
  { test: /^espn\s*bet$/i, label: "ESPN BET" },
  { test: /^william\s*hill$/i, label: "William Hill" },
  { test: /^bovada$/i, label: "Bovada" },
  { test: /^betrivers?$/i, label: "BetRivers" },
  { test: /^sugar\s*house$/i, label: "BetRivers" },
  { test: /^unibet$/i, label: "Unibet" },
  { test: /^hard\s*rock(\s*bet)?$/i, label: "Hard Rock" },
  { test: /^fanatics(\s*sportsbook)?$/i, label: "Fanatics" },
];

/**
 * Normalize a sportsbook/provider name to Keystone's canonical spelling.
 * Unknown names are returned tidy-trimmed (not dropped).
 */
export function normalizeBookName(name: string): string {
  const trimmed = tidy(name);
  if (!trimmed) return trimmed;
  for (const { test, label } of BOOK_CANONICAL) {
    if (test.test(trimmed)) return label;
  }
  return trimmed;
}

/** Alias used at ESPN parse sites and in older call sites. */
export function normalizeProvider(name: string): string {
  return normalizeBookName(name);
}

export const canonicalizeProvider = normalizeBookName;
