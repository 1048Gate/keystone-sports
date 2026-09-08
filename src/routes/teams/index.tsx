import { createFileRoute, Link } from "@tanstack/react-router";
import { FollowButton } from "@/components/follow-button";
import { TEAMS, TEAM_BY_SLUG, teamLogo } from "@/data/teams";
import { useFollows } from "@/lib/sports/follow-store";

export const Route = createFileRoute("/teams/")({
  head: () => ({
    meta: [{ title: "Teams — Keystone" }],
  }),
  component: TeamsPage,
});

function TeamCard({ slug }: { slug: string }) {
  const t = TEAM_BY_SLUG[slug];
  if (!t) return null;
  return (
    <div
      className="flex items-center gap-3 rounded-md bg-surface p-3 shadow-[var(--shadow-border)] transition-shadow hover:shadow-[var(--shadow-border-hover)]"
      style={{ borderLeft: `3px solid ${t.color}` }}
    >
      <Link
        to="/teams/$slug"
        params={{ slug: t.slug }}
        className="flex min-w-0 flex-1 items-center gap-4"
      >
        <img data-logo src={teamLogo(t)} alt="" className="h-12 w-12 object-contain" />
        <div className="min-w-0">
          <p className="font-display text-xl tracking-wide">{t.shortName}</p>
          <p className="text-sm text-muted">
            {t.league} · {t.city}
          </p>
        </div>
      </Link>
      <FollowButton slug={t.slug} name={t.shortName} variant="icon" />
    </div>
  );
}

function TeamsPage() {
  const followed = useFollows((s) => s.slugs);
  const groups = [
    { label: "Philadelphia", items: TEAMS.filter((t) => t.region === "philly") },
    { label: "Pittsburgh", items: TEAMS.filter((t) => t.region === "pittsburgh") },
    { label: "College", items: TEAMS.filter((t) => t.region === "college") },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">Teams</h1>
        <p className="mt-3 max-w-xl text-muted">
          Fifteen clubs. Star the ones you care about — they jump the ticker, the scores slate, and the Following
          filter. Open a club for schedule, beat news, X, and the locker room.
        </p>
        {followed.length ? (
          <section className="mt-10">
            <h2 className="font-display text-2xl tracking-wide">Your clubs</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {followed.map((slug) => (
                <TeamCard key={slug} slug={slug} />
              ))}
            </div>
          </section>
        ) : null}
        <div className="mt-10 space-y-10">
          {groups.map((g) => (
            <section key={g.label}>
              <h2 className="font-display text-2xl tracking-wide">{g.label}</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {g.items.map((t) => (
                  <TeamCard key={t.slug} slug={t.slug} />
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
  );
}
