export type Region = "philly" | "pittsburgh" | "college";

export type PaTeam = {
  slug: string;
  name: string;
  shortName: string;
  nick: string;
  city: string;
  region: Region;
  sport: string;
  league: string;
  espnSport: string;
  espnLeague: string;
  espnId: string;
  espnAbbr: string;
  color: string;
  reddit: string;
  xHandle: string;
  mlbId?: string;
  extraLeagues?: Array<{
    espnSport: string;
    espnLeague: string;
    espnId: string;
    sport: string;
    league: string;
  }>;
};

export const TEAMS: PaTeam[] = [
  {
    slug: "eagles",
    name: "Philadelphia Eagles",
    shortName: "Eagles",
    nick: "Birds",
    city: "Philadelphia",
    region: "philly",
    sport: "Football",
    league: "NFL",
    espnSport: "football",
    espnLeague: "nfl",
    espnId: "21",
    espnAbbr: "phi",
    color: "#004C54",
    reddit: "eagles",
    xHandle: "Eagles",
  },
  {
    slug: "steelers",
    name: "Pittsburgh Steelers",
    shortName: "Steelers",
    nick: "Black and Gold",
    city: "Pittsburgh",
    region: "pittsburgh",
    sport: "Football",
    league: "NFL",
    espnSport: "football",
    espnLeague: "nfl",
    espnId: "23",
    espnAbbr: "pit",
    color: "#FFB612",
    reddit: "steelers",
    xHandle: "Steelers",
  },
  {
    slug: "phillies",
    name: "Philadelphia Phillies",
    shortName: "Phillies",
    nick: "Phils",
    city: "Philadelphia",
    region: "philly",
    sport: "Baseball",
    league: "MLB",
    espnSport: "baseball",
    espnLeague: "mlb",
    espnId: "22",
    espnAbbr: "phi",
    color: "#E81828",
    reddit: "phillies",
    xHandle: "Phillies",
    mlbId: "143",
  },
  {
    slug: "pirates",
    name: "Pittsburgh Pirates",
    shortName: "Pirates",
    nick: "Bucs",
    city: "Pittsburgh",
    region: "pittsburgh",
    sport: "Baseball",
    league: "MLB",
    espnSport: "baseball",
    espnLeague: "mlb",
    espnId: "23",
    espnAbbr: "pit",
    color: "#FDB827",
    reddit: "buccos",
    xHandle: "Pirates",
    mlbId: "134",
  },
  {
    slug: "sixers",
    name: "Philadelphia 76ers",
    shortName: "76ers",
    nick: "Sixers",
    city: "Philadelphia",
    region: "philly",
    sport: "Basketball",
    league: "NBA",
    espnSport: "basketball",
    espnLeague: "nba",
    espnId: "20",
    espnAbbr: "phi",
    color: "#006BB6",
    reddit: "sixers",
    xHandle: "sixers",
  },
  {
    slug: "flyers",
    name: "Philadelphia Flyers",
    shortName: "Flyers",
    nick: "Orange and Black",
    city: "Philadelphia",
    region: "philly",
    sport: "Hockey",
    league: "NHL",
    espnSport: "hockey",
    espnLeague: "nhl",
    espnId: "4",
    espnAbbr: "phi",
    color: "#F74902",
    reddit: "flyers",
    xHandle: "NHLFlyers",
  },
  {
    slug: "penguins",
    name: "Pittsburgh Penguins",
    shortName: "Penguins",
    nick: "Pens",
    city: "Pittsburgh",
    region: "pittsburgh",
    sport: "Hockey",
    league: "NHL",
    espnSport: "hockey",
    espnLeague: "nhl",
    espnId: "5",
    espnAbbr: "pit",
    color: "#FCB514",
    reddit: "penguins",
    xHandle: "penguins",
  },
  {
    slug: "union",
    name: "Philadelphia Union",
    shortName: "Union",
    nick: "The U",
    city: "Chester",
    region: "philly",
    sport: "Soccer",
    league: "MLS",
    espnSport: "soccer",
    espnLeague: "usa.1",
    espnId: "10739",
    espnAbbr: "phi",
    color: "#002D62",
    reddit: "PhiladelphiaUnion",
    xHandle: "PhilaUnion",
  },
  {
    slug: "penn-state",
    name: "Penn State Nittany Lions",
    shortName: "Penn State",
    nick: "Nittany Lions",
    city: "University Park",
    region: "college",
    sport: "Football",
    league: "NCAA",
    espnSport: "football",
    espnLeague: "college-football",
    espnId: "213",
    espnAbbr: "psu",
    color: "#041E42",
    reddit: "PennStateFootball",
    xHandle: "PennStateFball",
    extraLeagues: [
      {
        espnSport: "basketball",
        espnLeague: "mens-college-basketball",
        espnId: "213",
        sport: "Basketball",
        league: "NCAAB",
      },
    ],
  },
  {
    slug: "pitt",
    name: "Pitt Panthers",
    shortName: "Pitt",
    nick: "Panthers",
    city: "Pittsburgh",
    region: "college",
    sport: "Football",
    league: "NCAA",
    espnSport: "football",
    espnLeague: "college-football",
    espnId: "221",
    espnAbbr: "pitt",
    color: "#003594",
    reddit: "PittsburghPanthers",
    xHandle: "Pitt_FB",
    extraLeagues: [
      {
        espnSport: "basketball",
        espnLeague: "mens-college-basketball",
        espnId: "221",
        sport: "Basketball",
        league: "NCAAB",
      },
    ],
  },
  {
    slug: "temple",
    name: "Temple Owls",
    shortName: "Temple",
    nick: "Owls",
    city: "Philadelphia",
    region: "college",
    sport: "Football",
    league: "NCAA",
    espnSport: "football",
    espnLeague: "college-football",
    espnId: "218",
    espnAbbr: "tem",
    color: "#9D2235",
    reddit: "Temple",
    xHandle: "TempleFB",
    extraLeagues: [
      {
        espnSport: "basketball",
        espnLeague: "mens-college-basketball",
        espnId: "218",
        sport: "Basketball",
        league: "NCAAB",
      },
    ],
  },
  {
    slug: "villanova",
    name: "Villanova Wildcats",
    shortName: "Villanova",
    nick: "Wildcats",
    city: "Villanova",
    region: "college",
    sport: "Basketball",
    league: "NCAAB",
    espnSport: "basketball",
    espnLeague: "mens-college-basketball",
    espnId: "222",
    espnAbbr: "vill",
    color: "#003366",
    reddit: "villanova",
    xHandle: "NovaMBB",
  },
  {
    slug: "duquesne",
    name: "Duquesne Dukes",
    shortName: "Duquesne",
    nick: "Dukes",
    city: "Pittsburgh",
    region: "college",
    sport: "Basketball",
    league: "NCAAB",
    espnSport: "basketball",
    espnLeague: "mens-college-basketball",
    espnId: "2184",
    espnAbbr: "DUQ",
    color: "#0033A0",
    reddit: "DuquesneBasketball",
    xHandle: "DuqMBB",
  },
  {
    slug: "drexel",
    name: "Drexel Dragons",
    shortName: "Drexel",
    nick: "Dragons",
    city: "Philadelphia",
    region: "college",
    sport: "Basketball",
    league: "NCAAB",
    espnSport: "basketball",
    espnLeague: "mens-college-basketball",
    espnId: "2182",
    espnAbbr: "DREX",
    color: "#F2A900",
    reddit: "Drexel",
    xHandle: "DrexelDragons_",
  },
  {
    slug: "lehigh",
    name: "Lehigh Mountain Hawks",
    shortName: "Lehigh",
    nick: "Mountain Hawks",
    city: "Bethlehem",
    region: "college",
    sport: "Football",
    league: "NCAA",
    espnSport: "football",
    espnLeague: "college-football",
    espnId: "2329",
    espnAbbr: "LEH",
    color: "#654321",
    reddit: "Lehigh",
    xHandle: "LehighMountainHawks",
    extraLeagues: [
      {
        espnSport: "basketball",
        espnLeague: "mens-college-basketball",
        espnId: "2329",
        sport: "Basketball",
        league: "NCAAB",
      },
    ],
  },
];

export const TEAM_BY_SLUG = Object.fromEntries(TEAMS.map((t) => [t.slug, t])) as Record<
  string,
  PaTeam
>;

export const ESPN_INDEX: Record<string, string> = {};
for (const team of TEAMS) {
  ESPN_INDEX[`${team.espnLeague}:${team.espnId}`] = team.slug;
  ESPN_INDEX[`${team.espnLeague}:${team.espnAbbr.toLowerCase()}`] = team.slug;
  if (team.extraLeagues) {
    for (const extra of team.extraLeagues) {
      ESPN_INDEX[`${extra.espnLeague}:${extra.espnId}`] = team.slug;
    }
  }
}

export const MLB_INDEX: Record<string, string> = {};
for (const team of TEAMS) {
  if (team.mlbId) MLB_INDEX[team.mlbId] = team.slug;
}

export const REGIONS: { id: "all" | "following" | Region; label: string }[] = [
  { id: "all", label: "All PA" },
  { id: "following", label: "Following" },
  { id: "philly", label: "Philly" },
  { id: "pittsburgh", label: "Pittsburgh" },
  { id: "college", label: "College" },
];

export const SPORTS: { id: string; label: string }[] = [
  { id: "all", label: "All sports" },
  { id: "Football", label: "Football" },
  { id: "Baseball", label: "Baseball" },
  { id: "Basketball", label: "Basketball" },
  { id: "Hockey", label: "Hockey" },
  { id: "Soccer", label: "Soccer" },
];

export function teamLogo(team: PaTeam): string {
  return espnLogo(team.espnLeague, team.espnAbbr, team.espnId);
}

export function espnLogo(league: string, abbr: string, id: string): string {
  const a = abbr.toLowerCase();
  if (league === "nfl") return `https://a.espncdn.com/i/teamlogos/nfl/500/${a}.png`;
  if (league === "mlb") return `https://a.espncdn.com/i/teamlogos/mlb/500/${a}.png`;
  if (league === "nba") return `https://a.espncdn.com/i/teamlogos/nba/500/${a}.png`;
  if (league === "nhl") return `https://a.espncdn.com/i/teamlogos/nhl/500/${a}.png`;
  if (league === "usa.1") return `https://a.espncdn.com/i/teamlogos/soccer/500/${id}.png`;
  return `https://a.espncdn.com/i/teamlogos/ncaa/500/${id}.png`;
}

export function lookupSlug(league: string, idOrAbbr: string): string | undefined {
  return ESPN_INDEX[`${league}:${idOrAbbr}`] ?? ESPN_INDEX[`${league}:${idOrAbbr.toLowerCase()}`];
}

export function teamsByFollowed(followed: string[]): PaTeam[] {
  if (!followed.length) return TEAMS;
  const rank = new Map(followed.map((slug, i) => [slug, i]));
  return [...TEAMS].sort((a, b) => {
    const ai = rank.get(a.slug) ?? 100;
    const bi = rank.get(b.slug) ?? 100;
    return ai - bi;
  });
}
