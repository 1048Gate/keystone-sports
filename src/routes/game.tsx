import { createFileRoute } from '@tanstack/react-router';
import { getGameDetail } from '@/lib/sports/api';
import { GameCard } from '@/components/game-card';
import { FeedStatus } from '@/components/feed-status';
export const Route = createFileRoute('/game')({
  validateSearch: (s: Record<string, unknown>) => ({ date: typeof s.date === 'string' ? s.date : '', id: typeof s.id === 'string' ? s.id : '' }),
  loaderDeps: ({ search }) => search,
  loader: ({ deps }) => getGameDetail({ data: deps }),
  head: () => ({ meta: [{ title: 'Game details — Keystone' }] }),
  component: GamePage,
});
function GamePage() {
  const { game, lines, players, warning, generatedAt } = Route.useLoaderData();
  if (!game) return <div className="mx-auto max-w-3xl px-4 py-8"><h1 className="font-display text-3xl">Game unavailable</h1><p className="mt-4">This game was not returned by the feed. Return to Scores and refresh.</p></div>;
  return <div className="mx-auto max-w-3xl space-y-6 px-4 py-8"><h1 className="font-display text-3xl">{game.name}</h1><FeedStatus at={generatedAt} warnings={warning ? [warning] : []} /><GameCard game={game} featured />
    {lines.length ? <section><h2 className="font-display text-2xl">Game statistics</h2><div className="mt-3 overflow-x-auto"><table className="w-full text-left"><thead><tr><th className="p-2">Statistic / period</th><th>{game.away.abbr}</th><th>{game.home.abbr}</th></tr></thead><tbody>{lines.map((line, i) => <tr key={`${line.label}-${i}`} className="border-t border-border"><th className="p-2 font-normal">{line.label}</th><td>{line.away}</td><td>{line.home}</td></tr>)}</tbody></table></div></section> : <p className="text-muted">Detailed statistics will appear when the feed provides them.</p>}
    {players.length ? <section><h2 className="font-display text-2xl">Key performers</h2><ul className="mt-3 space-y-2">{players.map((player, i) => <li key={i}>{player}</li>)}</ul></section> : null}
    {game.sourceUrl ? (
      <section className="rounded-md border border-border bg-surface p-4">
        <h2 className="font-display text-2xl">Game info</h2>
        <dl className="mt-2 space-y-1 text-sm">
          <div className="flex"><dt className="w-24 shrink-0 text-muted">League</dt><dd>{game.league}</dd></div>
          {game.venue ? <div className="flex"><dt className="w-24 shrink-0 text-muted">Venue</dt><dd>{game.venue}</dd></div> : null}
          {game.broadcast ? <div className="flex"><dt className="w-24 shrink-0 text-muted">TV</dt><dd>{game.broadcast}</dd></div> : null}
          {game.odds?.details || game.odds?.spread ? (
            <div className="flex"><dt className="w-24 shrink-0 text-muted">Line</dt><dd>{game.odds.details ?? game.odds.spread}</dd></div>
          ) : null}
        </dl>
        <a href={game.sourceUrl} target="_blank" rel="noreferrer" className="mt-3 inline-block rounded-sm bg-primary px-3 py-2 text-sm font-semibold">
          Open official {game.league} coverage
        </a>
      </section>
    ) : null}
  </div>;
}
