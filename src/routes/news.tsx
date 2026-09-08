import { createFileRoute, Link } from "@tanstack/react-router";
import { PendingScreen } from "@/components/pending-screen";
import { TEAM_BY_SLUG } from "@/data/teams";
import { getNewsWire } from "@/lib/sports/api";
import { rankPaNews } from "@/lib/sports/filter";
import { useFollows } from "@/lib/sports/follow-store";
import { relativeWhen } from "@/lib/sports/time";

export const Route = createFileRoute("/news")({
  loader: () => getNewsWire(),
  staleTime: 60_000,
  pendingComponent: PendingScreen,
  head: () => ({
    meta: [{ title: "News — Keystone" }],
  }),
  component: NewsPage,
});

function NewsPage() {
  const wire = Route.useLoaderData();
  const followed = useFollows((s) => s.slugs);
  const ranked = rankPaNews(wire.articles, followed);
  const lead = ranked.find((a) => a.image) ?? ranked[0];
  const rest = ranked.filter((a) => a.id !== lead?.id);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">News</h1>
        <p className="mt-3 max-w-2xl text-muted">
          Headlines from the PA beat, plus fan-thread chatter. Pulled automatically.
        </p>

        {lead ? (
          <article className="mt-8 grid gap-6 border-b border-border pb-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
            {lead.image ? (
              <a href={lead.href} target="_blank" rel="noreferrer">
                <img src={lead.image} alt="" className="h-56 w-full rounded-md object-cover sm:h-72" />
              </a>
            ) : (
              <div className="rounded-md bg-elevated" />
            )}
            <div className="flex flex-col justify-center">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                {TEAM_BY_SLUG[lead.teamSlug ?? ""]?.shortName ?? lead.league}
                {lead.published ? ` · ${relativeWhen(lead.published)}` : ""}
              </p>
              <a href={lead.href} target="_blank" rel="noreferrer" className="mt-2 hover:text-accent">
                <h2 className="font-display text-3xl leading-tight tracking-wide sm:text-4xl">{lead.headline}</h2>
              </a>
              {lead.description ? (
                <p className="mt-3 text-base leading-relaxed text-muted">{lead.description}</p>
              ) : null}
            </div>
          </article>
        ) : null}

        <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1.4fr)_minmax(16rem,0.8fr)]">
          <section className="space-y-6">
            {rest.map((a) => {
              const team = a.teamSlug ? TEAM_BY_SLUG[a.teamSlug] : undefined;
              return (
                <article key={a.id} className="flex gap-4 border-b border-border pb-6">
                  {a.image ? (
                    <img
                      src={a.image}
                      alt=""
                      className="hidden h-24 w-36 shrink-0 rounded-sm object-cover sm:block"
                    />
                  ) : null}
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                      {team?.shortName ?? a.league}
                      {a.published ? ` · ${relativeWhen(a.published)}` : ""}
                    </p>
                    <a href={a.href} target="_blank" rel="noreferrer" className="mt-1 block hover:text-accent">
                      <h2 className="font-display text-2xl leading-tight tracking-wide">{a.headline}</h2>
                    </a>
                    {a.description ? <p className="mt-2 text-sm leading-relaxed text-muted">{a.description}</p> : null}
                  </div>
                </article>
              );
            })}
          </section>

          <aside>
            <h2 className="font-display text-2xl tracking-wide">Locker room</h2>
            <p className="mt-1 text-sm text-muted">Public fan threads, newest first.</p>
            <ul className="mt-4 space-y-3">
              {wire.buzz.map((b) => (
                <li key={b.id} className="rounded-md bg-surface p-3 shadow-[var(--shadow-border)]">
                  <p className="text-xs uppercase tracking-wider text-subtle">
                    r/{b.sub}
                    {b.updated ? ` · ${relativeWhen(b.updated)}` : ""}
                  </p>
                  <a href={b.href} target="_blank" rel="noreferrer" className="mt-1 block text-sm leading-snug hover:text-accent">
                    {b.title}
                  </a>
                  {TEAM_BY_SLUG[b.teamSlug] ? (
                    <Link
                      to="/teams/$slug"
                      params={{ slug: b.teamSlug }}
                      className="mt-2 inline-block text-xs text-muted hover:text-fg"
                    >
                      {TEAM_BY_SLUG[b.teamSlug].shortName}
                    </Link>
                  ) : null}
                </li>
              ))}
            </ul>
          </aside>
        </div>
      </div>
  );
}
