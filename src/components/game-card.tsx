import type { CSSProperties } from "react";
import { Link } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Game } from "@/lib/sports/types";
import { formatKick, untilWhen } from "@/lib/sports/time";
import { matchupLine } from "@/lib/sports/filter";
import { TEAM_BY_SLUG } from "@/data/teams";
import { downloadGameCalendar } from '@/lib/sports/calendar';

function Side({
  logo,
  abbr,
  name,
  score,
  winner,
  slug,
  muted,
  big,
}: {
  logo: string;
  abbr: string;
  name: string;
  score?: string;
  winner?: boolean;
  slug?: string;
  muted?: boolean;
  big?: boolean;
}) {
  const inner = (
    <>
      <img data-logo src={logo} alt="" className={cn("object-contain", big ? "h-11 w-11" : "h-8 w-8")} />
      <div className="min-w-0 flex-1">
        <p className={cn("truncate font-display tracking-wide", big ? "text-2xl" : "text-lg", muted && "text-muted")}>
          {abbr}
        </p>
        <p className="truncate text-xs text-muted">{name}</p>
      </div>
      {score !== undefined && score !== "" ? (
        <p
          className={cn(
            "font-display tabular-nums leading-none",
            big ? "text-4xl" : "text-2xl",
            winner || !muted ? "text-fg" : "text-muted",
          )}
        >
          {score}
        </p>
      ) : null}
    </>
  );
  const cls = "flex items-center gap-3";
  if (slug) {
    return (
      <Link to="/teams/$slug" params={{ slug }} className={cn(cls, "rounded-sm hover:bg-elevated/70")}>
        {inner}
      </Link>
    );
  }
  return <div className={cls}>{inner}</div>;
}

export function GameCard({ game, featured }: { game: Game; featured?: boolean }) {
  const pa = TEAM_BY_SLUG[game.paSlugs[0] ?? ""];
  const live = game.status === "in";
  const done = game.status === "post";
  const watch = untilWhen(game.start);

  return (
    <article
      className={cn(
        "bg-surface p-4 shadow-[var(--shadow-border)]",
        featured ? "rounded-lg p-5 sm:p-6" : "rounded-md",
      )}
      style={pa ? ({ borderLeft: `3px solid ${pa.color}` } as CSSProperties) : undefined}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted">
          {game.league}
          {game.broadcast ? ` · ${game.broadcast}` : ""}
        </p>
        {live ? (
          <Badge variant="live">Live · {game.statusText}</Badge>
        ) : done ? (
          <Badge variant="final">{game.statusText}</Badge>
        ) : (
          <Badge variant="outline">{formatKick(game.start)}</Badge>
        )}
      </div>
      {featured ? (
        <p className="mb-3 font-display text-xl leading-tight tracking-wide sm:text-2xl">{matchupLine(game)}</p>
      ) : null}
      <div className={cn("space-y-2.5", featured && "space-y-3")}>
        <Side {...game.away} muted={done && !game.away.winner} big={featured} />
        <Side {...game.home} muted={done && !game.home.winner} big={featured} />
      </div>
      {game.odds || game.venue ? (
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-border pt-3 text-xs text-muted">
          {game.odds?.spread || game.odds?.details ? (
            <span className="font-medium text-fg">{game.odds.spread ?? game.odds.details}</span>
          ) : null}
          {game.odds?.total ? <span>O/U {game.odds.total.replace(/^o/i, "")}</span> : null}
          {game.odds?.awayMl || game.odds?.homeMl ? (
            <span>
              ML {game.odds.awayMl ?? "—"} / {game.odds.homeMl ?? "—"}
            </span>
          ) : null}
          {game.venue ? <span className="truncate">{game.venue}</span> : null}
        </div>
      ) : null}
      {featured && live ? (
        <p className="mt-3 text-sm font-medium text-accent">Live now · {game.statusText}</p>
      ) : null}
      {featured && !live && !done ? (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-sm bg-primary px-3 py-2.5 text-primary-fg">
          <p className="text-xs font-semibold uppercase tracking-widest">Watch</p>
          <p className="text-sm font-medium">
            {watch || formatKick(game.start)}
            {game.broadcast ? ` · ${game.broadcast}` : ""}
          </p>
        </div>
      ) : null}
      <div className="mt-3 flex flex-wrap gap-4 border-t border-border pt-2 text-sm">
        <Link to="/game" search={{ date: game.dateKey, id: game.id }} className="inline-flex min-h-11 items-center font-semibold underline">Game details</Link>
        {game.status === 'pre' && !/postpon|cancel|tbd/i.test(game.statusText) ? <button type="button" className="min-h-11 underline" onClick={() => downloadGameCalendar(game)}>Add to calendar</button> : null}
      </div>
    </article>
  );
}

export function GameRow({ game }: { game: Game }) {
  const live = game.status === "in";
  const slug = game.paSlugs[0];
  const line = game.odds?.spread ?? game.odds?.details ?? game.odds?.total;
  const inner = (
    <div className="grid grid-cols-[1fr_auto] items-center gap-3 py-3 sm:grid-cols-[4.5rem_1fr_auto_auto]">
      <p className="hidden text-xs font-semibold uppercase tracking-wider text-muted sm:block">{game.league}</p>
      <p className="min-w-0 truncate text-sm">
        <span className="font-semibold">{game.away.abbr}</span>
        {game.status !== "pre" && game.away.score ? (
          <span className="ml-1 tabular-nums text-muted">{game.away.score}</span>
        ) : null}
        <span className="mx-1.5 text-subtle">@</span>
        <span className="font-semibold">{game.home.abbr}</span>
        {game.status !== "pre" && game.home.score ? (
          <span className="ml-1 tabular-nums text-muted">{game.home.score}</span>
        ) : null}
      </p>
      <p className="text-xs tabular-nums text-muted">
        {live ? game.statusText : game.status === "post" ? "Final" : formatKick(game.start)}
      </p>
      {line ? <p className="hidden text-xs text-muted sm:block">{line}</p> : <span className="hidden sm:block" />}
    </div>
  );
  if (slug) {
    return (
      <Link
        to="/game"
        search={{ date: game.dateKey, id: game.id }}
        className="block border-b border-border last:border-0 hover:bg-elevated/60"
      >
        {inner}
      </Link>
    );
  }
  return <div className="border-b border-border last:border-0">{inner}</div>;
}
