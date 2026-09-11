import { FeedStatus } from '@/components/feed-status';
import { useMemo, useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { FilterChips } from "@/components/filter-chips";
import { PendingScreen } from "@/components/pending-screen";
import { RouteError } from "@/components/route-error";

import { getTodayBoard } from "@/lib/sports/api";
import { applyView, sortFollowed } from "@/lib/sports/filter";
import { useFollows } from "@/lib/sports/follow-store";
import { parseRegion, writePrefs } from "@/lib/sports/prefs";
import { normalizeBookName } from "@/lib/sports/providers";
import { addDays, formatKick } from "@/lib/sports/time";

type Search = { region?: string };

export const Route = createFileRoute("/odds")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    region: typeof s.region === "string" ? s.region : undefined,
  }),
  loader: () => getTodayBoard({ data: {} }),
  staleTime: 20_000,
  pendingComponent: PendingScreen,
  errorComponent: RouteError,
  head: () => ({
    meta: [{ title: "Odds — Keystone Beat" }],
  }),
  component: OddsPage,
});

function OddsPage() {
  const initial = Route.useLoaderData();
  const [board, setBoard] = useState(initial);
  useEffect(() => { setBoard(initial); }, [initial]);
  useEffect(() => { let active = true;
    const timer = setInterval(() => { if (document.hidden) return;
      void getTodayBoard({ data: {} }).then(value => { if (active) setBoard(value); }).catch(() => { if (active) setBoard(b => ({ ...b, warnings: ['Odds refresh unavailable.'] })); });
    }, 60000);
    return () => { active = false; clearInterval(timer); };
  }, []);
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const region = parseRegion(search.region);
  const followed = useFollows((s) => s.slugs);
  const followHydrated = useFollows((s) => s.hydrated);
  const pool = useMemo(() => {
    const cutoff = addDays(board.date, 10);
    const lineSports = new Set(["NFL", "NCAAF", "MLB"]);
    const upcoming = [...board.games.filter((g) => g.status !== "post"), ...board.upcoming];
    const unique = applyView(upcoming, region, "all", followed, followHydrated).filter(
      (g, i, arr) => arr.findIndex((x) => x.id === g.id) === i,
    );
    const focused = unique.filter((g) => g.odds || (lineSports.has(g.league) && g.dateKey <= cutoff));
    return sortFollowed(focused, followed);
  }, [board, region, followed, followHydrated]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">Odds</h1>
        <p className="mt-3 max-w-2xl text-muted">
          Spreads, totals, and moneylines next to the games — not a sportsbook. Numbers come from ESPN's public
          board. 21+.
        </p>
        <FeedStatus at={board.generatedAt} warnings={board.warnings} />
        <div className="mt-6">
          <FilterChips
            region={region}
            showSports={false}
            onRegion={(id) => {
              writePrefs({ region: parseRegion(id), sport: "all" });
              void navigate({ search: { region: id } });
            }}
          />
        </div>

        <div className="mt-8 hidden overflow-x-auto rounded-md bg-surface shadow-[var(--shadow-border)] md:block">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-elevated text-xs font-semibold uppercase tracking-wider text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Game</th>
                <th className="px-4 py-3 font-medium">When</th>
                <th className="px-4 py-3 font-medium">Spread</th>
                <th className="px-4 py-3 font-medium">Total</th>
                <th className="px-4 py-3 font-medium">ML away</th>
                <th className="px-4 py-3 font-medium">ML home</th>
              </tr>
            </thead>
            <tbody>
              {pool.map((g) => (
                <tr key={g.id} className="border-t border-border">
                  <td className="px-4 py-3">
                    <p className="font-semibold">
                      {g.away.abbr} @ {g.home.abbr}
                    </p>
                    <p className="text-xs text-muted">{g.league} · {(g.odds?.provider && normalizeBookName(g.odds.provider)) || "No line posted"}</p>
                  </td>
                  <td className="px-4 py-3 text-xs tabular-nums text-muted">{formatKick(g.start)}</td>
                  <td className="px-4 py-3 tabular-nums">{g.odds?.spread ?? g.odds?.details ?? "—"}</td>
                  <td className="px-4 py-3 tabular-nums">{g.odds?.total ?? "—"}</td>
                  <td className="px-4 py-3 tabular-nums">{g.odds?.awayMl ?? "—"}</td>
                  <td className="px-4 py-3 tabular-nums">{g.odds?.homeMl ?? "—"}</td>
                </tr>
              ))}
              {pool.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-muted">
                    {region === "following" && followHydrated && !followed.length
                      ? "Star a club first — then lines for those games show up here."
                      : region === "following"
                        ? "None of your clubs have a line in this window."
                        : "No upcoming PA games with a line yet."}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className="mt-6 space-y-3 md:hidden">
          {pool.map((g) => (
            <article key={g.id} className="rounded-md bg-surface p-4 shadow-[var(--shadow-border)]">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">{g.league} · {(g.odds?.provider && normalizeBookName(g.odds.provider)) || "No line posted"}</p>
              <p className="mt-1 font-display text-xl tracking-wide">
                {g.away.abbr} @ {g.home.abbr}
              </p>
              <p className="text-xs text-muted">{formatKick(g.start)}</p>
              <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <div>
                  <dt className="text-xs uppercase tracking-wider text-subtle">Spread</dt>
                  <dd className="tabular-nums">{g.odds?.spread ?? g.odds?.details ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wider text-subtle">Total</dt>
                  <dd className="tabular-nums">{g.odds?.total ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wider text-subtle">ML away</dt>
                  <dd className="tabular-nums">{g.odds?.awayMl ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wider text-subtle">ML home</dt>
                  <dd className="tabular-nums">{g.odds?.homeMl ?? "—"}</dd>
                </div>
              </dl>
            </article>
          ))}
          {pool.length === 0 ? (
            <p className="py-10 text-center text-muted">
              {region === "following" && followHydrated && !followed.length
                ? "Star a club first — then lines for those games show up here."
                : region === "following"
                  ? "None of your clubs have a line in this window."
                  : "No upcoming PA games with a line yet."}
            </p>
          ) : null}
        </div>
        <p className="mt-4 text-xs text-subtle">
          Lines are from ESPN’s public board; the supplied provider is shown per game. Games farther out — especially later MLB dates — may
          not have a number yet. Not an offer to bet. 21+. If gambling is a problem, call 1-800-GAMBLER. Log a pick
          in the{" "}
          <Link to="/desk" className="text-fg underline-offset-2 hover:underline">
            editor
          </Link>{" "}
          if you want a private record.
        </p>
      </div>
  );
}
