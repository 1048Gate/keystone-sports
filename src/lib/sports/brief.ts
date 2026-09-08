import type { Game, NewsItem } from './types';
export type BriefInput = { date: string; note?: string; userId: string; games: Game[]; articles: NewsItem[] };
export function briefFacts(input: BriefInput): string {
  return JSON.stringify({ date: input.date, note: input.note ?? '',
    games: input.games.slice(0, 20).map(g => ({ id: g.id, date: g.dateKey, start: g.start, matchup: g.shortName,
      status: g.statusText, away: { team: g.away.name, score: g.away.score }, home: { team: g.home.name, score: g.home.score },
      broadcast: g.broadcast, source: g.sourceUrl })),
    headlines: input.articles.slice(0, 10).map(a => ({ title: a.headline, published: a.published, source: a.href })),
  });
}
export async function briefCacheKey(input: BriefInput): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${input.userId}\n${briefFacts(input)}`));
  return 'brief:' + Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
}
