import { lazy, Suspense } from "react";
import { Link } from "@tanstack/react-router";
import { TEAM_BY_SLUG } from "@/data/teams";
import { BEAT_CATEGORY_LABELS, SOURCE_TIER_LABELS, type PublicBeatItem } from "@/lib/beat/types";
import { relativeWhen } from "@/lib/sports/time";
import { BeatErrorBoundary } from "./beat-boundaries";

const BeatEmbed = lazy(() => import("./beat-embed").then((m) => ({ default: m.BeatEmbed })));

function CardFallback({ item }: { item: PublicBeatItem }) {
  return (
    <div className="rounded-md bg-surface p-4 shadow-[var(--shadow-border)]">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted">{BEAT_CATEGORY_LABELS[item.category]}</p>
      <p className="mt-2 text-sm leading-relaxed text-muted">{item.context ?? item.headline}</p>
      <a
        href={item.originalUrl}
        target="_blank"
        rel="noreferrer"
        className="mt-3 inline-block text-sm font-semibold text-accent hover:underline"
      >
        Open original · {item.source}
      </a>
    </div>
  );
}

function BeatCardInner({ item }: { item: PublicBeatItem }) {
  const team = item.teamSlug ? TEAM_BY_SLUG[item.teamSlug] : undefined;

  return (
    <article className="flex h-full flex-col rounded-md bg-surface p-4 shadow-[var(--shadow-border)]">
      <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted">
        <span className="rounded-sm bg-elevated px-1.5 py-0.5 text-fg">{BEAT_CATEGORY_LABELS[item.category]}</span>
        {item.verifiedOfficial || item.sourceTier === "official_team_league" ? (
          <span className="rounded-sm bg-primary px-1.5 py-0.5 text-primary-fg">Official</span>
        ) : null}
        {item.pinned ? <span className="rounded-sm bg-accent px-1.5 py-0.5 text-accent-fg">Pinned</span> : null}
        <span className="text-subtle">{SOURCE_TIER_LABELS[item.sourceTier]}</span>
      </div>

      <p className="mt-3 font-display text-xl leading-tight tracking-wide">{item.headline}</p>
      {item.context ? <p className="mt-2 text-sm leading-relaxed text-muted">{item.context}</p> : null}

      <p className="mt-3 text-xs text-subtle">
        {item.source}
        {item.authorAccount ? ` · ${item.authorAccount}` : ""}
        {team ? ` · ${team.shortName}` : item.league ? ` · ${item.league}` : ""}
        {item.timestamp ? ` · ${relativeWhen(item.timestamp)}` : ""}
      </p>

      <Suspense fallback={<p className="mt-3 text-sm text-muted">Preparing media…</p>}>
        <BeatEmbed item={item} />
      </Suspense>

      <div className="mt-auto flex flex-wrap items-center gap-3 pt-4 text-sm">
        <a href={item.originalUrl} target="_blank" rel="noreferrer" className="font-semibold text-accent hover:underline">
          Open original
        </a>
        {item.teamSlug && TEAM_BY_SLUG[item.teamSlug] ? (
          <Link to="/teams/$slug" params={{ slug: item.teamSlug }} className="text-muted hover:text-fg">
            {TEAM_BY_SLUG[item.teamSlug].shortName} hub
          </Link>
        ) : null}
      </div>
    </article>
  );
}

export function BeatCard({ item }: { item: PublicBeatItem }) {
  return (
    <BeatErrorBoundary label={`card:${item.id}`} fallback={<CardFallback item={item} />}>
      <BeatCardInner item={item} />
    </BeatErrorBoundary>
  );
}
