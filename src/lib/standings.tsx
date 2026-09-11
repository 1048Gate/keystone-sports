import { createFileRoute, Link } from "@tanstack/react-router";
import { getStandings } from "@/lib/sports/api";
import { FeedStatus } from "@/components/feed-status";
import { TEAM_BY_SLUG } from "@/data/teams";
import { cn } from "@/lib/utils";
import type { StandingsLeague, StandingRow } from "@/lib/sports/types";

const LEAGUES: { key: StandingsLeague; label: string }[] = [
  { key: "nfl", label: "NFL" },
  { key: "nba", label: "NBA" },
  { key: "nhl", label: "NHL" },
  { key: "mlb", label: "MLB" },
  { key: "cfb", label: "College Football" },
  { key: "cbb", label: "College Basketball" },
];

const COLS: Record<StandingsLeague, string[]> = {
  nfl: ["W", "L", "T", "PCT"],
  nba: ["W", "L", "PCT"],
  mlb: ["W", "L", "PCT"],
  nhl: ["W", "L", "OT", "PTS"],
  cfb: ["W", "L", "PCT"],
  cbb: ["W", "L", "PCT"],
};

function cellValue(name: string, r: StandingRow): string {
  switch (name) {
    case "W": return String(r.wins);
    case "L": return String(r.losses);
    case "T": return String(r.ties ?? 0);
    case "OT": return String(r.otl ?? 0);
    case "PTS": return String(r.points ?? 0);
    case "PCT": return r.winPercent;
    default: return "";
  }
}

export const Route = createFileRoute("/standings")({
  validateSearch: (s: Record<string, unknown>) => ({ league: typeof s.league === "string" ? s.league : "nfl" }),
  loaderDeps: ({ search }) => search,
  loader: async ({ deps }) => getStandings({ data: { league: deps.league } }),
  staleTime: 60_000,
  head: () => ({ meta: [{ title: "Standings — Keystone Beat" }] }),
  component: StandingsPage,
});

function StandingsPage() {
  const board = Route.useLoaderData();
  const cols = COLS[board.league] ?? COLS.nfl;
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">Standings</h1>
      <p className="mt-3 max-w-xl text-muted">
        Conference tables for Pennsylvania clubs. Keystone teams are highlighted and linked.
      </p>
      <div className="mt-6 flex flex-wrap gap-2">
        {LEAGUES.map((l) => (
          <Link
            key={l.key}
            to="/standings"
            search={{ league: l.key }}
            className={cn(
              "inline-flex h-10 items-center rounded-sm border px-3 text-sm font-semibold",
              l.key === board.league ? "border-primary bg-surface text-fg" : "border-border text-muted hover:text-fg",
            )}
          >
            {l.label}
          </Link>
        ))}
      </div>
      <FeedStatus at={board.generatedAt} warnings={board.warnings ?? []} />
      {board.groups.length ? (
        <div className="mt-6 space-y-8">
          {board.groups.map((g) => (
            <section key={g.id}>
              <h2 className="font-display text-2xl tracking-wide">{g.name}</h2>
              <div className="mt-3 overflow-x-auto rounded-md border border-border bg-surface">
                <table className="w-full min-w-[32rem] text-left text-sm">
                  <thead>
                    <tr className="border-b border-border text-xs uppercase tracking-wider text-muted">
                      <th className="p-2 font-semibold">Team</th>
                      {cols.map((c) => (
                        <th key={c} className="p-2 font-semibold">{c}</th>
                      ))}
                      <th className="p-2 font-semibold">GB</th>
                      <th className="p-2 font-semibold">Streak</th>
                    </tr>
                  </thead>
                  <tbody>
                    {g.rows.map((r) => (
                      <tr key={`${g.id}-${r.teamId}`} className={r.slug ? "border-l-2 border-accent" : "border-t border-border"}>
                        <td className="p-2">
                          {r.slug && TEAM_BY_SLUG[r.slug] ? (
                            <Link to="/teams/$slug" params={{ slug: r.slug }} className="font-semibold hover:text-accent">
                              {r.name}
                            </Link>
                          ) : (
                            r.name
                          )}
                        </td>
                        {cols.map((c) => (
                          <td key={c} className="p-2 tabular-nums">{cellValue(c, r)}</td>
                        ))}
                        <td className="p-2 tabular-nums">{r.gamesBehind}</td>
                        <td className="p-2">{r.streak}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ))}
        </div>
      ) : null}
      <p className="mt-8 text-xs text-subtle">Lines are for information only. 21+ · If you gamble, call 1-800-GAMBLER.</p>
    </div>
  );
}