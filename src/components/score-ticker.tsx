import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { getTodayBoard } from "@/lib/sports/api";
import { peekBoard, rememberBoard } from "@/lib/sports/board-cache";
import { useFollows } from "@/lib/sports/follow-store";
import { sortFollowed } from "@/lib/sports/filter";
import { formatTime } from "@/lib/sports/time";
import type { Game } from "@/lib/sports/types";
import { cn } from "@/lib/utils";

let memGames: Game[] = [];
let memUpcoming: Game[] = [];
let memReady = false;
let lastAt = 0;

function TickerItem({ game }: { game: Game }) {
  const live = game.status === "in";
  const done = game.status === "post";
  const slug = game.paSlugs[0];
  const inner = (
    <>
      <img data-logo src={game.away.logo} alt="" className="h-6 w-6 object-contain" />
      <span className="font-display text-sm tracking-wide">
        {game.away.abbr}
        {game.status !== "pre" && game.away.score ? (
          <span className="ml-1.5 tabular-nums">{game.away.score}</span>
        ) : null}
      </span>
      <span className="text-xs text-scoreboard-fg/40">@</span>
      <img data-logo src={game.home.logo} alt="" className="h-6 w-6 object-contain" />
      <span className="font-display text-sm tracking-wide">
        {game.home.abbr}
        {game.status !== "pre" && game.home.score ? (
          <span className="ml-1.5 tabular-nums">{game.home.score}</span>
        ) : null}
      </span>
      <span
        className={cn(
          "ml-1 text-xs font-semibold uppercase tracking-wide",
          live ? "text-accent" : "text-scoreboard-fg/50",
        )}
      >
        {live ? (
          <>
            <span className="live-dot mr-1 inline-block h-1.5 w-1.5 rounded-full bg-accent" />
            {game.statusText}
          </>
        ) : done ? (
          "Final"
        ) : (
          formatTime(game.start)
        )}
      </span>
    </>
  );
  const cls = "flex h-12 shrink-0 items-center gap-3 border-r border-scoreboard-fg/10 px-4 text-scoreboard-fg";
  if (slug) {
    return (
      <Link to="/teams/$slug" params={{ slug }} className={cls}>
        {inner}
      </Link>
    );
  }
  return (
    <Link to="/" className={cls}>
      {inner}
    </Link>
  );
}

export function ScoreTicker() {
  const [games, setGames] = useState<Game[]>(memGames);
  const [upcoming, setUpcoming] = useState<Game[]>(memUpcoming);
  const [ready, setReady] = useState(memReady);
  const followed = useFollows((s) => s.slugs);

  useEffect(() => {
    let alive = true;
    const apply = (g: Game[], u: Game[]) => {
      memGames = g;
      memUpcoming = u;
      memReady = true;
      lastAt = Date.now();
      if (!alive) return;
      setGames(g);
      setUpcoming(u);
      setReady(true);
    };
    const snap = peekBoard();
    if (snap && !memReady) apply(snap.games, snap.upcoming);
    const load = () => {
      if (memReady && Date.now() - lastAt < 20_000) {
        apply(memGames, memUpcoming);
        return;
      }
      void getTodayBoard({ data: {} })
        .then((b) => {
          rememberBoard(b);
          apply(b.games, b.upcoming);
        })
        .catch(() => {
          if (alive && (memReady || snap)) setReady(true);
        });
    };
    load();
    const t = setInterval(() => void load(), 60_000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  const strip = useMemo(() => {
    const live = sortFollowed(
      games.filter((g) => g.status === "in"),
      followed,
    );
    const rest = sortFollowed(
      games.filter((g) => g.status !== "in"),
      followed,
    );
    const today = [...live, ...rest];
    if (today.length) return today;
    return sortFollowed(upcoming.slice(0, 8), followed);
  }, [games, upcoming, followed]);

  if (!ready) {
    return (
      <div className="flex h-12 items-center bg-scoreboard px-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-scoreboard-fg/50">Keystone · PA</p>
      </div>
    );
  }

  if (!strip.length) {
    return (
      <div className="bg-scoreboard text-scoreboard-fg">
        <p className="px-4 py-2.5 text-center text-xs tracking-wide text-scoreboard-fg/60">
          Off day across Pennsylvania — check the calendar for the next slate.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-scoreboard">
      <div className="no-scrollbar flex overflow-x-auto">
        <p className="flex h-12 shrink-0 items-center bg-accent px-3 text-xs font-semibold uppercase tracking-widest text-accent-fg">
          {games.some((g) => g.status === "in") ? "Live" : games.some((g) => g.status === "post") ? "Scores" : "Next"}
        </p>
        {strip.map((g) => (
          <TickerItem key={g.id} game={g} />
        ))}
      </div>
    </div>
  );
}
