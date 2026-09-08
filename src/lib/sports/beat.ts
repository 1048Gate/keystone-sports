import type { HighlightItem, NewsItem } from "./types";

export type BeatFeed = {
  id: string;
  label: string;
  url: string;
  teamSlug?: string;
  league?: string;
};

/** Real RSS endpoints checked before this pass. Do not add unfetched URLs. */
export const BEAT_FEEDS: BeatFeed[] = [
  { id: "eagles-site", label: "Eagles.com", url: "https://www.philadelphiaeagles.com/rss/news", teamSlug: "eagles", league: "NFL" },
  { id: "steelers-site", label: "Steelers.com", url: "https://www.steelers.com/rss/news", teamSlug: "steelers", league: "NFL" },
  { id: "phillies-mlb", label: "Phillies", url: "https://www.mlb.com/phillies/feeds/news/rss.xml", teamSlug: "phillies", league: "MLB" },
  { id: "pirates-mlb", label: "Pirates", url: "https://www.mlb.com/pirates/feeds/news/rss.xml", teamSlug: "pirates", league: "MLB" },
  { id: "gopsu", label: "GoPSU", url: "https://gopsusports.com/rss", teamSlug: "penn-state", league: "NCAA" },
  {
    id: "pennlive-psu",
    label: "PennLive",
    url: "https://www.pennlive.com/arc/outboundfeeds/rss/category/pennstate/?outputType=xml",
    teamSlug: "penn-state",
    league: "NCAA",
  },
  {
    id: "inquirer",
    label: "Inquirer",
    url: "https://www.inquirer.com/arc/outboundfeeds/rss/category/sports/?outputType=xml",
  },
  { id: "nbcphilly", label: "NBC Sports Philadelphia", url: "https://www.nbcsportsphiladelphia.com/feed/" },
  { id: "crossingbroad", label: "Crossing Broad", url: "https://www.crossingbroad.com/feed" },
];

const PA_PHRASES = [
  "eagles",
  "steelers",
  "phillies",
  "phils",
  "pirates",
  "buccos",
  "sixers",
  "76ers",
  "flyers",
  "penguins",
  "philadelphia union",
  "penn state",
  "nittany",
  "pitt panthers",
  "temple owls",
  "villanova",
  "duquesne",
  "drexel",
  "lehigh",
  "birds",
];

function decodeXml(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => {
      const code = Number(n);
      return Number.isFinite(code) ? String.fromCharCode(code) : _;
    });
}

function stripTags(s: string): string {
  return decodeXml(s)
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tag(block: string, name: string): string {
  const m = block.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, "i"));
  return m ? m[1].trim() : "";
}

function linkOf(block: string): string {
  const atom = block.match(/<link\b[^>]*href="([^"]+)"/i)?.[1];
  if (atom && !atom.includes("rss")) return decodeXml(atom.trim());
  const inner = stripTags(tag(block, "link"));
  if (inner.startsWith("http")) return inner;
  return "";
}

function toIso(raw: string): string {
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString();
}

export function mentionsPa(text: string): boolean {
  const h = text.toLowerCase();
  return PA_PHRASES.some((p) => h.includes(p));
}

export function isFilmHref(href: string): boolean {
  try {
    const path = new URL(href).pathname.toLowerCase();
    return /\/videos?(?:\/|$)/.test(path) || path.includes("/highlights") || path.includes("/watch");
  } catch {
    return false;
  }
}

export type RssItem = { title: string; href: string; published: string; description: string };

export function parseRssItems(xml: string): RssItem[] {
  if (!xml || /<!doctype html|<html[\s>]/i.test(xml.slice(0, 200))) return [];
  const blocks = [...xml.matchAll(/<item\b[^>]*>[\s\S]*?<\/item>/gi)].map((m) => m[0]);
  const use = blocks.length ? blocks : [...xml.matchAll(/<entry\b[^>]*>[\s\S]*?<\/entry>/gi)].map((m) => m[0]);
  const out: RssItem[] = [];
  for (const block of use) {
    const title = stripTags(tag(block, "title"));
    const href = linkOf(block);
    if (!title || title.length < 12 || /^news$/i.test(title)) continue;
    if (!href.startsWith("http")) continue;
    const published = toIso(stripTags(tag(block, "pubDate") || tag(block, "published") || tag(block, "updated") || tag(block, "dc:date")));
    const description = stripTags(tag(block, "description") || tag(block, "summary")).slice(0, 280);
    out.push({ title, href, published, description });
  }
  return out;
}

function tokens(s: string): Set<string> {
  return new Set(
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .split(" ")
      .filter((w) => w.length > 2),
  );
}

export function similarHeadlines(a: string, b: string): boolean {
  const A = tokens(a);
  const B = tokens(b);
  if (A.size < 4 || B.size < 4) return false;
  let inter = 0;
  for (const t of A) if (B.has(t)) inter += 1;
  return inter / (A.size + B.size - inter) >= 0.72;
}

function canonUrl(href: string): string {
  try {
    const u = new URL(href);
    return `${u.hostname.replace(/^www\./, "")}${u.pathname}`.replace(/\/$/, "").toLowerCase();
  } catch {
    return href.toLowerCase();
  }
}

function headlineKey(headline: string): string {
  return headline.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function prefer(a: NewsItem, b: NewsItem): NewsItem {
  const score = (x: NewsItem) => (x.image ? 2 : 0) + (x.teamSlug ? 1 : 0) + (x.description ? 1 : 0);
  return score(b) > score(a) ? b : a;
}

export function dedupeNews(items: NewsItem[]): NewsItem[] {
  const byUrl = new Map<string, NewsItem>();
  const ordered: NewsItem[] = [];
  for (const item of items) {
    const url = canonUrl(item.href);
    const key = headlineKey(item.headline);
    const existingUrl = byUrl.get(url);
    if (existingUrl) {
      const kept = prefer(existingUrl, item);
      const idx = ordered.indexOf(existingUrl);
      if (idx >= 0) ordered[idx] = kept;
      byUrl.set(url, kept);
      continue;
    }
    const twin = ordered.find((prev) => headlineKey(prev.headline) === key || similarHeadlines(prev.headline, item.headline));
    if (twin) {
      const kept = prefer(twin, item);
      const idx = ordered.indexOf(twin);
      if (idx >= 0) ordered[idx] = kept;
      byUrl.set(canonUrl(kept.href), kept);
      continue;
    }
    byUrl.set(url, item);
    ordered.push(item);
  }
  return ordered;
}

export function rssToNews(feed: BeatFeed, item: RssItem): NewsItem {
  return {
    id: `${feed.id}:${item.href}`,
    headline: item.title,
    description: item.description,
    published: item.published,
    href: item.href,
    teamSlug: feed.teamSlug,
    league: feed.league,
    source: feed.label,
  };
}

export function filmFromNews(items: NewsItem[]): HighlightItem[] {
  const out: HighlightItem[] = [];
  const seen = new Set<string>();
  for (const item of items) {
    if (!isFilmHref(item.href)) continue;
    const key = canonUrl(item.href);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      id: `film:${item.id}`,
      title: item.headline,
      href: item.href,
      teamSlug: item.teamSlug,
      league: item.league,
      label: item.source || item.league || "Film",
    });
  }
  return out.slice(0, 12);
}
