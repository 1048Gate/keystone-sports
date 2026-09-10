import { getSiteAccess, getPublishedPosts } from '@/lib/publishing/api';
import type { Post } from '@/lib/publishing/types';
import { FeedStatus } from '@/components/feed-status';
import { PublishedUpdates } from '@/components/published-updates';
import { FollowOnboarding } from '@/components/follow-onboarding';
import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Copy, PenLine, RefreshCw } from "lucide-react";
import { FilterChips } from "@/components/filter-chips";
import { GameCard, GameRow } from "@/components/game-card";
import { PendingScreen } from "@/components/pending-screen";
import { RouteError } from "@/components/route-error";

import { TeamRail } from "@/components/team-rail";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TEAM_BY_SLUG } from "@/data/teams";
import { getMonthBoard, getNewsFeed, getTodayBoard, generateBrief } from "@/lib/sports/api";
import { rememberBoard } from "@/lib/sports/board-cache";
import { useDesk } from "@/lib/sports/desk-store";
import { useFollows } from "@/lib/sports/follow-store";
import { applyView, featuredLabel, humanKicker, pickFeatured, rankPaNews } from "@/lib/sports/filter";
import { parseRegion, readPrefs, writePrefs } from "@/lib/sports/prefs";
import { addDays, dateKeyNY, formatKick, formatLongDate, relativeWhen, weekdayShort } from "@/lib/sports/time";
import type { NewsItem } from "@/lib/sports/types";
import { cn } from "@/lib/utils";

type Search = { date?: string; region?: string; sport?: string };

export const Route = createFileRoute("/")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    date: typeof s.date === "string" ? s.date : undefined,
    region: typeof s.region === "string" ? s.region : undefined,
    sport: typeof s.sport === "string" ? s.sport : undefined,
  }),
  loaderDeps: ({ search }) => ({ date: search.date }),
  loader: async ({ deps }) => {
    const board = await getTodayBoard({ data: { date: deps.date } });
    const posts = await getPublishedPosts({ data: { date: board.date } }).catch(() => [] as Post[]);
    return { board, posts };
  },
  staleTime: 20_000,
  pendingComponent: PendingScreen,
  errorComponent: RouteError,
  head: () => ({
    meta: [
      { title: "Scores — Keystone" },
      {
        name: "description",
        content:
          "Live Pennsylvania sports scores: Eagles, Steelers, Phillies, Pirates, Sixers, Flyers, Penguins, Union, Penn State, Pitt, Temple, Villanova.",
      },
    ],
  }),
  component: TodayPage,
});

function WeekStrip({
  origin,
  selected,
  counts,
  liveDays,
  onSelect,
}: {
  origin: string;
  selected: string;
  counts: Record<string, number>;
  liveDays: Set<string>;
  onSelect: (date: string) => void;
}) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(origin, i));
  return (
    <div className="-mx-1 mt-5 flex gap-1.5 overflow-x-auto px-1 pb-1">
      {days.map((key, i) => {
        const active = key === selected;
        const n = counts[key] ?? 0;
        const live = liveDays.has(key);
        return (
          <button
            key={key}
            type="button"
            onClick={() => onSelect(key)}
            className={cn(
              "flex h-16 min-w-16 shrink-0 flex-col items-center justify-center rounded-md border px-3",
              active ? "border-primary bg-primary text-primary-fg" : "border-border bg-surface text-fg hover:bg-elevated",
            )}
          >
            <span className={cn("text-xs font-semibold uppercase tracking-wider", active ? "text-primary-fg/80" : "text-muted")}>
              {i === 0 ? "Today" : weekdayShort(key)}
            </span>
            <span className="font-display text-lg leading-none">{Number(key.slice(8))}</span>
            <span className={cn("mt-0.5 text-xs uppercase tracking-wide", live ? "text-accent" : active ? "text-primary-fg/70" : "text-subtle")}>
              {live ? "Live" : n ? `${n}` : "—"}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function TodayPage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const loader = Route.useLoaderData();
  const [board, setBoard] = useState(loader.board);
  const [news, setNews] = useState<{ articles: NewsItem[] }>({ articles: [] });
  const [brief, setBrief] = useState<string | null>(null);
  const [briefError, setBriefError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [aiAccess, setAiAccess] = useState({ signedIn: false, aiEnabled: false });
  useEffect(() => { let active = true; void getSiteAccess().then(a => { if (active) setAiAccess(a); }).catch(() => {}); return () => { active = false; }; }, []);
  const [copied, setCopied] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const date = search.date ?? board.date;
  const region = parseRegion(search.region);
  const sport = search.sport ?? "all";
  const today = dateKeyNY();

  const noteMap = useDesk((s) => s.notes);
  const featuredNote = useDesk((s) => s.featured);
  const allPicks = useDesk((s) => s.picks);
  const allEvents = useDesk((s) => s.events);
  const deskHydrated = useDesk((s) => s.hydrated);
  const followed = useFollows((s) => s.slugs);
  const followHydrated = useFollows((s) => s.hydrated);
  const note = deskHydrated ? (noteMap[date] ?? "") : "";
  const picks = useMemo(
    () => (deskHydrated ? allPicks.filter((p) => p.date === date) : []),
    [deskHydrated, allPicks, date],
  );
  const custom = useMemo(
    () => (deskHydrated ? allEvents.filter((e) => e.date === date) : []),
    [deskHydrated, allEvents, date],
  );

  useEffect(() => {
    setBoard(loader.board);
    rememberBoard(loader.board);
  }, [loader]);

  useEffect(() => {
    void getNewsFeed()
      .then(setNews)
      .catch(() => undefined);
    void getMonthBoard({ data: {} }).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (search.region || search.sport) return;
    const prefs = readPrefs();
    if (prefs.region === "all" && prefs.sport === "all") return;
    void navigate({
      search: { date: search.date, region: prefs.region, sport: prefs.sport },
      replace: true,
    });
  }, [navigate, search.date, search.region, search.sport]);

  useEffect(() => {
    let active = true;
    const t = setInterval(() => {
      if (document.hidden) return;
      void getTodayBoard({ data: { date } }).then((b) => {
        if (!active) return;
        rememberBoard(b);
        setBoard(b);
      }).catch(() => { if (active) setBoard(b => ({ ...b, warnings: ["Could not refresh scores."] })); });
    }, 60_000);
    return () => { active = false; clearInterval(t); };
  }, [date]);

  useEffect(() => { setBrief(null); setBriefError(null); }, [date, region, sport, note]);

  const waitingFollows = region === "following" && !followHydrated;
  const games = useMemo(
    () => applyView(board.games, region, sport, followed, followHydrated),
    [board.games, region, sport, followed, followHydrated],
  );
  const upcomingAll = useMemo(
    () => applyView(board.upcoming, region, sport, followed, followHydrated),
    [board.upcoming, region, sport, followed, followHydrated],
  );
  const recent = useMemo(
    () => applyView(board.recent, region, sport, followed, followHydrated),
    [board.recent, region, sport, followed, followHydrated],
  );
  const live = games.filter((g) => g.status === "in");
  const feature = pickFeatured(games, followed, upcomingAll);
  const rest = games.filter((g) => g.id !== feature?.id);
  const upcoming = upcomingAll.filter((g) => g.id !== feature?.id).slice(0, 8);
  const recap = (loader.posts ?? []).find((p) => p.kind === "recap") ?? null;
  const nextUp = upcomingAll.find((g) => g.status !== "post") ?? board.upcoming.find((g) => g.status !== "post");
  const desk = humanKicker({
    date,
    recap,
    slateCount: board.games.length,
    next: nextUp
      ? { away: nextUp.away.abbr, home: nextUp.home.abbr, when: formatKick(nextUp.start) }
      : null,
  });
  const rankedNews = useMemo(() => rankPaNews(news.articles, followed), [news.articles, followed]);
  const lead = rankedNews.find((a) => a.image) ?? rankedNews[0];
  const moreNews = rankedNews.filter((a) => a.id !== lead?.id).slice(0, 6);

  const weekSource = useMemo(() => [...board.games, ...board.upcoming], [board.games, board.upcoming]);
  const weekCounts = useMemo(() => {
    const map: Record<string, number> = {};
    const viewed = applyView(weekSource, region, sport, followed, followHydrated);
    for (const g of viewed) map[g.dateKey] = (map[g.dateKey] ?? 0) + 1;
    return map;
  }, [weekSource, region, sport, followed, followHydrated]);
  const liveDays = useMemo(() => {
    const set = new Set<string>();
    for (const g of weekSource) if (g.status === "in") set.add(g.dateKey);
    return set;
  }, [weekSource]);

  function patch(next: Search) {
    const regionNext = (next.region ?? search.region) as string | undefined;
    const sportNext = next.sport ?? search.sport;
    if (regionNext || sportNext) {
      writePrefs({
        region: parseRegion(regionNext),
        sport: sportNext || "all",
      });
    }
    void navigate({
      search: {
        date: next.date ?? search.date,
        region: next.region ?? search.region,
        sport: next.sport ?? search.sport,
      },
    });
  }

  async function refresh() {
    setRefreshing(true);
    try {
      const [b, n] = await Promise.all([getTodayBoard({ data: { date } }), getNewsFeed()]);
      rememberBoard(b);
      setBoard(b);
      setNews(n);
    } catch {
      setBoard(b => ({ ...b, warnings: ["Could not refresh scores. Please try again."] }));
    } finally {
      setRefreshing(false);
    }
  }

  async function runBrief() {
    setBusy(true);
    setBriefError(null);
    try {
      const res = await generateBrief({
        data: {
          date,
          note,
          region, sport, followed,
        },
      });
      if (res.ok) setBrief(res.text);
      else setBriefError(res.error);
    } catch (error) {
      setBriefError(error instanceof Error ? error.message : "Could not write the recap.");
    } finally {
      setBusy(false);
    }
  }

  async function copyBrief() {
    if (!brief) return;
    try {
      await navigator.clipboard.writeText(brief);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Keystone",
    description: "Pennsylvania sports scores, calendars, and news.",
    about: games.slice(0, 8).map((g) => ({
      "@type": "SportsEvent",
      name: g.name,
      startDate: g.start,
      location: g.venue,
      homeTeam: g.home.name,
      awayTeam: g.away.name,
    })),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
      <section className="home-summary border-b border-border bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-4 sm:px-6 sm:py-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-accent">Pennsylvania</p>
          <div className="mt-1 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
            <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              {formatLongDate(date)}
            </h1>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => patch({ date: addDays(date, -1) })}>
                Prev
              </Button>
              <Button variant="outline" size="sm" onClick={() => patch({ date: today })}>
                Today
              </Button>
              <Button variant="outline" size="sm" onClick={() => patch({ date: addDays(date, 1) })}>
                Next
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => void refresh()}
                disabled={refreshing}
                aria-label="Refresh scores"
              >
                <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
                <span className="hidden sm:inline">Refresh</span>
              </Button>
            </div>
          </div>
          <p className="mt-2 max-w-2xl text-base leading-snug text-fg sm:text-lg">{desk.line}</p>
          {desk.lede ? <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted">{desk.lede}</p> : null}
          <div className="mt-3 flex flex-wrap gap-3 text-sm">
            {followed.length ? <button className="font-semibold text-accent underline" onClick={() => patch({ region: 'following' })}>My Teams ({followed.length})</button> : <Link to="/teams" className="font-semibold text-accent underline">Choose your teams</Link>}
            <Link to="/desk" className="underline">My Notes</Link>
          </div>
          <FeedStatus at={board.generatedAt} warnings={board.warnings} />
          <WeekStrip
            origin={today}
            selected={date}
            counts={weekCounts}
            liveDays={liveDays}
            onSelect={(d) => patch({ date: d })}
          />
          {live.length ? (
            <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
              {live.map((g) => (
                <div key={g.id} className="flex shrink-0 items-center gap-2 rounded-full bg-elevated px-3 py-2 text-sm">
                  <Badge variant="live">Live</Badge>
                  <span className="font-semibold">
                    {g.away.abbr} {g.away.score} · {g.home.abbr} {g.home.score}
                  </span>
                  <span className="text-muted">{g.statusText}</span>
                </div>
              ))}
            </div>
          ) : null}
          {waitingFollows ? (
            <div className="mt-5 h-40 animate-pulse rounded-md bg-elevated" aria-hidden />
          ) : feature ? (
            <div className="mt-5">
              <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted">
                {featuredLabel(feature)}
              </p>
              <GameCard game={feature} featured />
            </div>
          ) : null}
          <PublishedUpdates date={date} />
        </div>
      </section>

      <FollowOnboarding />
      <TeamRail />

      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1.65fr)_minmax(18rem,0.85fr)]">
        <div>
          <FilterChips
            region={region}
            sport={sport}
            onRegion={(id) => patch({ region: id })}
            onSport={(id) => patch({ sport: id })}
          />

          {custom.length ? (
            <div className="mt-6 rounded-md border border-dashed border-border-strong bg-surface p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-accent">Your private notes</p>
              <ul className="mt-2 space-y-2">
                {custom.map((e) => (
                  <li key={e.id}>
                    <p className="font-semibold">
                      {e.time ? `${e.time} · ` : ""}
                      {e.title}
                    </p>
                    <p className="text-sm text-muted">
                      {e.sport}
                      {e.notes ? ` — ${e.notes}` : ""}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {waitingFollows ? null : rest.length ? (
            <div className={cn("grid gap-3 sm:grid-cols-2", feature ? "mt-4" : "mt-6")}>
              {rest.map((g) => (
                <GameCard key={g.id} game={g} />
              ))}
            </div>
          ) : !feature ? (
            <div className="mt-6 rounded-md bg-surface px-5 py-10 text-center shadow-[var(--shadow-border)]">
              <p className="font-display text-2xl">
                {region === "following" && followHydrated && !followed.length ? "No clubs pinned" : "Off day"}
              </p>
              <p className="mt-2 text-sm text-muted">
                {region === "following" && followHydrated && !followed.length
                  ? "Star a club on Teams or a team page to pin it here."
                  : region === "following"
                    ? upcoming.length
                      ? "None of your clubs play on this date. Next slate is below."
                      : "None of your clubs play on this date. Check the calendar for the next one."
                    : "No PA games on this date. Next slate is below."}
              </p>
            </div>
          ) : null}

          {upcoming.length ? (
            <section className="mt-10">
              <div className="mb-3 flex items-baseline justify-between">
                <h2 className="font-display text-2xl tracking-wide">Coming up</h2>
                <Link to="/calendar" className="inline-flex items-center gap-1 text-sm text-muted hover:text-fg">
                  Full calendar <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
              <div className="rounded-md bg-surface px-4 shadow-[var(--shadow-border)]">
                {upcoming.map((g) => (
                  <GameRow key={g.id} game={g} />
                ))}
              </div>
            </section>
          ) : null}

          {recent.length ? (
            <section className="mt-10">
              <h2 className="mb-3 font-display text-2xl tracking-wide">Last night</h2>
              <div className="rounded-md bg-surface px-4 shadow-[var(--shadow-border)]">
                {recent.map((g) => (
                  <GameRow key={g.id} game={g} />
                ))}
              </div>
            </section>
          ) : null}
        </div>

        <aside className="space-y-6">
          {lead ? (
            <article>
              {lead.image ? (
                <a href={lead.href} target="_blank" rel="noreferrer" className="block">
                  <img
                    src={lead.image}
                    alt=""
                    className="h-44 w-full rounded-md object-cover"
                  />
                </a>
              ) : null}
              <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-muted">
                {TEAM_BY_SLUG[lead.teamSlug ?? ""]?.shortName ?? lead.league}
                {lead.published ? ` · ${relativeWhen(lead.published)}` : ""}
              </p>
              <a href={lead.href} target="_blank" rel="noreferrer" className="mt-1 block hover:text-accent">
                <h2 className="font-display text-2xl leading-tight tracking-wide">{lead.headline}</h2>
              </a>
              {lead.description ? (
                <p className="mt-2 text-sm leading-relaxed text-muted">{lead.description}</p>
              ) : null}
            </article>
          ) : null}

          {moreNews.length ? (
            <section>
              <div className="mb-3 flex items-baseline justify-between">
                <h2 className="font-display text-xl tracking-wide">Headlines</h2>
                <Link to="/news" className="text-sm text-muted hover:text-fg">
                  All
                </Link>
              </div>
              <ul className="space-y-3">
                {moreNews.map((a) => (
                  <li key={a.id} className="border-t border-border pt-3 first:border-0 first:pt-0">
                    <a href={a.href} target="_blank" rel="noreferrer" className="group block">
                      <p className="text-sm font-semibold leading-snug group-hover:text-accent">{a.headline}</p>
                      <p className="mt-1 text-xs uppercase tracking-wider text-subtle">
                        {TEAM_BY_SLUG[a.teamSlug ?? ""]?.shortName ?? a.league}
                        {a.published ? ` · ${relativeWhen(a.published)}` : ""}
                      </p>
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {featuredNote || note || picks.length ? (
            <section className="rounded-md bg-surface p-5 shadow-[var(--shadow-border)]">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted">Your private notes</p>
                <Link to="/desk" className="text-sm text-muted hover:text-fg">
                  Edit
                </Link>
              </div>
              {featuredNote ? <p className="mt-3 text-sm leading-relaxed">{featuredNote}</p> : null}
              {note ? <p className="mt-3 text-sm leading-relaxed text-muted">{note}</p> : null}
              {picks.map((p) => (
                <div key={p.id} className="mt-3 border-t border-border pt-3">
                  <p className="font-semibold">{p.title}</p>
                  <p className="text-sm text-accent">{p.pick}</p>
                  {p.notes ? <p className="text-sm text-muted">{p.notes}</p> : null}
                </div>
              ))}
            </section>
          ) : null}

          <section className="rounded-md bg-surface p-5 shadow-[var(--shadow-border)]">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">Column</p>
            <h2 className="mt-1 font-display text-2xl tracking-wide">Today's take</h2>
            <p className="mt-2 text-sm text-muted">
              An AI-assisted recap from dated scores and headlines. Your private note is included only when you choose to generate. Check the sources before sharing.
            </p>
            <Button className="mt-4 w-full" onClick={() => void runBrief()} disabled={busy || !aiAccess.aiEnabled || !aiAccess.signedIn}>
              <PenLine className="h-4 w-4" />
              {busy ? "Writing…" : !aiAccess.aiEnabled ? "Recaps not enabled yet" : "Write the recap"}
            </Button>
            {aiAccess.aiEnabled && !aiAccess.signedIn ? <p className="mt-2 text-sm text-muted">Owner AI unlocks after Cloudflare Access sign-in.</p> : null}
            {briefError ? <p className="mt-3 text-sm text-danger">{briefError}</p> : null}
            {brief ? (
              <div className="mt-4 space-y-3 border-t border-border pt-4 text-sm leading-relaxed text-fg">
                {brief.split(/\n\n+/).map((para) => (
                  <p key={para.slice(0, 24)}>{para}</p>
                ))}
                <Button variant="outline" size="sm" onClick={() => void copyBrief()}>
                  <Copy className="h-4 w-4" />
                  {copied ? "Copied" : "Copy recap"}
                </Button>
              </div>
            ) : null}
          </section>
        </aside>
      </div>
    </>
  );
}
