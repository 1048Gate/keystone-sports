/** Official highlight pages, verified fetchable. Link out only — no embeds. */
export type HighlightHub = {
  slug: string;
  label: string;
  href: string;
};

export const HIGHLIGHT_HUBS: HighlightHub[] = [
  { slug: "eagles", label: "Eagles", href: "https://www.philadelphiaeagles.com/video/highlights" },
  { slug: "steelers", label: "Steelers", href: "https://www.steelers.com/video/" },
  { slug: "phillies", label: "Phillies", href: "https://www.mlb.com/phillies/video" },
  { slug: "pirates", label: "Pirates", href: "https://www.mlb.com/pirates/video" },
  { slug: "sixers", label: "76ers", href: "https://www.nba.com/sixers/videos" },
  { slug: "flyers", label: "Flyers", href: "https://www.nhl.com/flyers/video" },
  { slug: "penguins", label: "Penguins", href: "https://www.nhl.com/penguins/video/" },
  { slug: "union", label: "Union", href: "https://www.philadelphiaunion.com/video/" },
  { slug: "penn-state", label: "Penn State", href: "https://gopsusports.com/videos" },
  { slug: "pitt", label: "Pitt", href: "https://pittsburghpanthers.com/watch" },
  { slug: "temple", label: "Temple", href: "https://owlsports.com/watch" },
  { slug: "villanova", label: "Villanova", href: "https://villanova.com/watch/" },
  { slug: "duquesne", label: "Duquesne", href: "https://godukes.com/watch" },
  { slug: "drexel", label: "Drexel", href: "https://drexeldragons.com/watch" },
  { slug: "lehigh", label: "Lehigh", href: "https://lehighsports.com/watch" },
];

export const HIGHLIGHT_BY_SLUG = Object.fromEntries(HIGHLIGHT_HUBS.map((h) => [h.slug, h])) as Record<
  string,
  HighlightHub
>;
