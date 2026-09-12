import { Link } from "@tanstack/react-router";
import { Star } from "lucide-react";
import { teamsByFollowed, teamLogo } from "@/data/teams";
import { useFollows } from "@/lib/sports/follow-store";

export function TeamRail() {
  const followed = useFollows((s) => s.slugs);
  const teams = teamsByFollowed(followed);

  return (
    <section className="border-y border-border bg-surface">
      <div className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-3 py-2 sm:px-6">
        {teams.map((t) => {
          const on = followed.includes(t.slug);
          return (
            <Link
              key={t.slug}
              to="/teams/$slug"
              params={{ slug: t.slug }}
              className="relative flex h-14 w-16 shrink-0 flex-col items-center justify-center gap-0.5 rounded-md px-1 hover:bg-elevated"
              title={on ? `${t.name} · Following` : t.name}
              aria-label={on ? `${t.name}, following` : t.name}
            >
              {on ? (
                <Star className="absolute top-1 right-1 h-3 w-3 fill-current text-accent" aria-hidden />
              ) : null}
              <img data-logo src={teamLogo(t)} alt="" width={32} height={32} loading="lazy" decoding="async" className="h-8 w-8 object-contain" />
              <span className="w-full truncate text-center text-xs font-medium text-muted">{t.shortName}</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
