import { z } from 'zod';
import { validDate } from './time';
import type { StandingsLeague } from "./types";
import { createServerFn } from "@tanstack/react-start";

export const getGameDetail = createServerFn({ method: 'GET' })
  .validator(input => z.object({ date: z.string().refine(validDate), id: z.string().min(1).max(80) }).parse(input))
  .handler(async ({ data }) => {
    const { loadGameDetail } = await import('./server');
    return loadGameDetail(data.date, data.id);
  });

export const getTodayBoard = createServerFn({ method: "GET" })
  .validator((input: { date?: string } | undefined) => ({
    date: typeof input?.date === "string" ? input.date : undefined,
  }))
  .handler(async ({ data }) => {
    const { loadToday } = await import("./server");
    return loadToday(data.date);
  });

export const getMonthBoard = createServerFn({ method: "GET" })
  .validator((input: { month?: string } | undefined) => ({
    month: typeof input?.month === "string" ? input.month : undefined,
  }))
  .handler(async ({ data }) => {
    const { loadMonth } = await import("./server");
    return loadMonth(data.month);
  });

export const getNewsFeed = createServerFn({ method: "GET" }).handler(async () => {
  const { loadNews } = await import("./server");
  return loadNews();
});

export const getNewsWire = createServerFn({ method: "GET" }).handler(async () => {
  const { loadNewsWire } = await import("./server");
  return loadNewsWire();
});

export const getTeamPage = createServerFn({ method: "GET" })
  .validator((input: { slug: string }) => ({ slug: String(input.slug) }))
  .handler(async ({ data }) => {
    const { loadTeamPage } = await import("./server");
    return loadTeamPage(data.slug);
  });

export const generateBrief = createServerFn({ method: 'POST' })
  .validator(input => z.object({ date: z.string().refine(validDate), note: z.string().max(600).optional(),
    region: z.enum(['all','philly','pittsburgh','college','following']).default('all'), sport: z.string().max(40).default('all'), followed: z.array(z.string().max(40)).max(20).default([]),
  }).parse(input))
  .handler(async ({ data }) => {
    const { requireAiAccess } = await import('../publishing/runtime.server'); const userId = await requireAiAccess();
    const { writeBrief, loadToday, loadNews } = await import('./server'); const { applyView } = await import('./filter');
    const [board, news] = await Promise.all([loadToday(data.date), loadNews()]);
    if (board.warnings?.length) return { ok: false as const, error: 'Feeds are delayed. Please wait for fresh data before generating a recap.' };
    const games = applyView([...board.games, ...board.upcoming.slice(0, 6)], data.region, data.sport, data.followed, true);
    const articles = news.articles.filter(a => a.published?.slice(0, 10) <= data.date);
    return writeBrief({ date: data.date, note: data.note, userId, games, articles });
  });

export const getStandings = createServerFn({ method: "GET" })
  .validator((input: { league?: string } | undefined) => ({
    league: (
      ["nfl", "mlb", "nhl", "nba", "cfb", "cbb"] as readonly StandingsLeague[]
    ).includes((input?.league ?? "nfl") as StandingsLeague)
      ? (input!.league as StandingsLeague)
      : "nfl",
  }))
  .handler(async ({ data }) => {
    const { loadStandings } = await import("./server");
    return loadStandings(data.league);
  });

export const runAutoRecap = createServerFn({ method: "POST" })
  .validator(input => z.object({ date: z.string().refine(validDate).optional() }).parse(input ?? {}))
  .handler(async ({ data }) => {
    const { getRequest } = await import("@tanstack/react-start/server");
    const { runtime } = await import("../publishing/runtime.server");
    const {
      RECAP_SECRET_DENIED_ERROR,
      RECAP_SECRET_MISSING_ERROR,
      RECAP_SECRET_URL_ERROR,
      queryHasSecret,
      secretFromHeaders,
      secretsEqual,
    } = await import("./recap-secret");
    const request = getRequest();
    const url = new URL(request.url);
    if (queryHasSecret(url.searchParams)) throw new Error(RECAP_SECRET_URL_ERROR);
    const provided = secretFromHeaders(request.headers);
    if (!provided) throw new Error(RECAP_SECRET_MISSING_ERROR);
    const env = runtime() as unknown as Record<string, unknown>;
    const expected = typeof env.KEYSTONE_AUTO_RECAP_SECRET === "string" ? env.KEYSTONE_AUTO_RECAP_SECRET : "";
    if (!expected || !secretsEqual(provided, expected)) throw new Error(RECAP_SECRET_DENIED_ERROR);
    const { autoRecapDraft } = await import("./server");
    return autoRecapDraft(data.date);
  });
