import { useEffect, useMemo, type ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { CalendarDays, Newspaper, Shield, Table2, Trophy } from "lucide-react";
import { ScoreTicker } from "@/components/score-ticker";
import { teamsByFollowed } from "@/data/teams";
import { useDesk } from "@/lib/sports/desk-store";
import { useFollows } from "@/lib/sports/follow-store";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "Scores" },
  { to: "/calendar", label: "Calendar" },
  { to: "/odds", label: "Odds" },
  { to: "/news", label: "News" },
  { to: "/teams", label: "Teams" },
  { to: "/standings", label: "Standings" },
] as const;

const TABS = [
  { to: "/", label: "Scores", icon: Trophy },
  { to: "/calendar", label: "Calendar", icon: CalendarDays },
  { to: "/odds", label: "Odds", icon: Table2 },
  { to: "/news", label: "News", icon: Newspaper },
  { to: "/teams", label: "Teams", icon: Shield },
] as const;

function KeystoneMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <rect width="32" height="32" rx="3" fill="currentColor" className="text-primary" />
      <path d="M8 8h16v7.2L16 24 8 15.2V8z" fill="currentColor" className="text-bg" />
      <path d="M11.2 10.2h9.6v4.4L16 20.4l-4.8-5.8v-4.4z" fill="currentColor" className="text-primary" />
    </svg>
  );
}

export function DeskShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const hydrateDesk = useDesk((s) => s.hydrate);
  const hydrateFollows = useFollows((s) => s.hydrate);
  const followed = useFollows((s) => s.slugs);
  const footerTeams = useMemo(() => teamsByFollowed(followed), [followed]);

  useEffect(() => {
    hydrateDesk();
    hydrateFollows();
  }, [hydrateDesk, hydrateFollows]);

  return (
    <div className="min-h-dvh bg-bg text-fg">
      <div className="sticky top-0 z-20">
        <ScoreTicker />
        <header className="border-b border-border bg-bg/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3 sm:px-6">
          <Link to="/" className="flex h-11 shrink-0 items-center gap-2.5">
            <KeystoneMark className="h-9 w-9" />
            <span className="leading-none">
              <span className="block font-display text-2xl font-semibold tracking-widest">KEYSTONE</span>
              <span className="block text-xs font-semibold uppercase tracking-widest text-accent">
                Pennsylvania Sports
              </span>
            </span>
          </Link>
          <nav className="hidden min-w-0 flex-1 items-center justify-end gap-1 md:flex">
            {NAV.map((item) => {
              const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "inline-flex h-11 shrink-0 items-center px-3 text-sm font-semibold",
                    active
                      ? "border-b-2 border-accent text-fg"
                      : "text-muted hover:text-fg",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
            <Link
              to="/desk"
              className={cn(
                "ml-2 inline-flex h-10 items-center rounded-sm border border-border bg-surface px-3 text-sm font-medium",
                pathname.startsWith("/desk") ? "border-primary text-fg" : "text-muted hover:text-fg",
              )}
            >
              My Notes
            </Link>
          </nav>
        </div>
        </header>
      </div>
      <main className="pb-20 md:pb-0">{children}</main>
      <footer className="mt-12 border-t border-border bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
          <div className="flex flex-col gap-8 lg:flex-row lg:justify-between">
            <div>
              <p className="font-display text-2xl tracking-widest">KEYSTONE</p>
              <p className="mt-1 max-w-sm text-sm text-muted">
                A small Pennsylvania desk — Philly, Pittsburgh, and the colleges. Scores, lines, and the beat, written
                like the sports page, not a dashboard.
              </p>
              <Link to="/desk" className="mt-3 inline-block text-sm font-medium text-fg underline-offset-2 hover:underline">
                My Notes
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-x-10 gap-y-2 sm:grid-cols-3">
              {footerTeams.map((t) => (
                <Link
                  key={t.slug}
                  to="/teams/$slug"
                  params={{ slug: t.slug }}
                  className="text-sm text-muted hover:text-fg"
                >
                  {t.shortName}
                </Link>
              ))}
            </div>
          </div>
          <div className="mt-8 flex flex-col gap-3 border-t border-border pt-6 text-xs text-subtle sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
              <p>Keystone · a small desk for a big state.</p>
              <a
                href="https://twohoundsrun.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-subtle hover:text-muted"
              >
                <img
                  src="/brand/two-hounds-mark.png"
                  alt=""
                  width={28}
                  height={28}
                  className="h-7 w-7 rounded-full opacity-90"
                />
                <span>A Two Hounds Run site</span>
              </a>
            </div>
            <p>Lines are for information only. 21+ · If you gamble, call 1-800-GAMBLER.</p>
          </div>
        </div>
      </footer>
      <a
        href="https://twohoundsrun.com"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Two Hounds Run"
        className="pointer-events-auto fixed bottom-4 right-4 z-20 hidden h-11 w-11 rounded-full opacity-70 shadow-md transition-opacity hover:opacity-100 focus-visible:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent md:block"
      >
        <img
          src="/brand/two-hounds-mark.png"
          alt=""
          width={44}
          height={44}
          className="h-11 w-11 rounded-full"
        />
      </a>
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-bg/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-sm md:hidden">
        <div className="grid grid-cols-5">
          {TABS.map((item) => {
            const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex min-h-14 flex-col items-center justify-center gap-0.5 text-xs font-semibold",
                  active ? "text-accent" : "text-muted",
                )}
              >
                <Icon className="h-5 w-5" strokeWidth={active ? 2.4 : 1.8} />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
