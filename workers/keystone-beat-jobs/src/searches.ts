/**
 * Conservative PA sports X searchTerms for Apify actor nfp1fpt5gUlBwPcor.
 * Small batch — prefer official / beat reporters over fan firehose.
 * Total maxItems across a pass is capped in apify.ts (~40–60).
 */

export type SearchBucket = {
  /** Human label for metrics */
  label: string;
  /** X advanced-search style query */
  query: string;
  teamSlug?: string;
  league?: string;
};

/** Strong PA sports queries — keep this list short to control Apify cost. */
export const PA_SPORTS_SEARCHES: SearchBucket[] = [
  {
    label: "eagles_official_reporters",
    teamSlug: "eagles",
    league: "NFL",
    query:
      '(from:Eagles OR from:Jeff_McLane OR from:DZangaroNBCS OR from:Tim_McManus OR from:EliotShorr OR ("Eagles" (injury OR IR OR signed OR traded OR "ruled out" OR activated))) -filter:retweets lang:en',
  },
  {
    label: "steelers_official_reporters",
    teamSlug: "steelers",
    league: "NFL",
    query:
      '(from:steelers OR from:MarkKaboly OR from:DaleLolley OR ("Steelers" (injury OR IR OR signed OR traded OR "ruled out" OR activated))) -filter:retweets lang:en',
  },
  {
    label: "phillies_pirates",
    teamSlug: "phillies",
    league: "MLB",
    query:
      '(from:Phillies OR from:Pirates OR from:M_Gelb OR ("Phillies" OR "Pirates") (injury OR IL OR signed OR traded OR DFA OR activated)) -filter:retweets lang:en',
  },
  {
    label: "sixers_flyers_penguins",
    teamSlug: "sixers",
    league: "NBA",
    query:
      '(from:sixers OR from:NHLFlyers OR from:penguins OR (("Sixers" OR "76ers" OR Flyers OR Penguins) (injury OR traded OR signed OR "ruled out"))) -filter:retweets lang:en',
  },
  {
    label: "penn_state_pitt_union",
    teamSlug: "penn-state",
    league: "NCAAF",
    query:
      '(from:PennStateFball OR from:Pitt_FB OR from:PhilaUnion OR (("Penn State" OR "Nittany Lions" OR Pitt) (injury OR transfer OR signed OR starting))) -filter:retweets lang:en',
  },
];

/** Flatten to searchTerms string array for Apify input. */
export function searchTermsForApify(): string[] {
  return PA_SPORTS_SEARCHES.map((s) => s.query);
}

/** Heuristic team/league from tweet text + handle. */
export function inferTeamFromText(
  text: string,
  handle: string,
): { teamSlug?: string; league?: string } {
  const h = handle.replace(/^@/, "").toLowerCase();
  const t = text.toLowerCase();
  const byHandle: Record<string, { teamSlug: string; league: string }> = {
    eagles: { teamSlug: "eagles", league: "NFL" },
    steelers: { teamSlug: "steelers", league: "NFL" },
    phillies: { teamSlug: "phillies", league: "MLB" },
    pirates: { teamSlug: "pirates", league: "MLB" },
    sixers: { teamSlug: "sixers", league: "NBA" },
    nhlflyers: { teamSlug: "flyers", league: "NHL" },
    penguins: { teamSlug: "penguins", league: "NHL" },
    philaunion: { teamSlug: "union", league: "MLS" },
    pennstatefball: { teamSlug: "penn-state", league: "NCAAF" },
    pitt_fb: { teamSlug: "pitt", league: "NCAAF" },
    jeff_mclane: { teamSlug: "eagles", league: "NFL" },
    dzangaronbcs: { teamSlug: "eagles", league: "NFL" },
    tim_mcmanus: { teamSlug: "eagles", league: "NFL" },
    eliotshorr: { teamSlug: "eagles", league: "NFL" },
    markkaboly: { teamSlug: "steelers", league: "NFL" },
    dalelolley: { teamSlug: "steelers", league: "NFL" },
    m_gelb: { teamSlug: "phillies", league: "MLB" },
  };
  if (byHandle[h]) return byHandle[h];

  if (/\beagles?\b|philadelphia eagles/.test(t)) return { teamSlug: "eagles", league: "NFL" };
  if (/\bsteelers?\b/.test(t)) return { teamSlug: "steelers", league: "NFL" };
  if (/\bphillies\b/.test(t)) return { teamSlug: "phillies", league: "MLB" };
  if (/\bpirates\b/.test(t)) return { teamSlug: "pirates", league: "MLB" };
  if (/\b(sixers|76ers)\b/.test(t)) return { teamSlug: "sixers", league: "NBA" };
  if (/\bflyers\b/.test(t)) return { teamSlug: "flyers", league: "NHL" };
  if (/\bpenguins\b/.test(t)) return { teamSlug: "penguins", league: "NHL" };
  if (/\bunion\b|philadelphia union/.test(t)) return { teamSlug: "union", league: "MLS" };
  if (/\bpenn state\b|nittany/.test(t)) return { teamSlug: "penn-state", league: "NCAAF" };
  if (/\bpitt\b|panthers\b/.test(t) && /\b(fb|football|ncaaf)\b/.test(t))
    return { teamSlug: "pitt", league: "NCAAF" };
  return {};
}
