import { REGIONS, SPORTS } from "@/data/teams";
import { cn } from "@/lib/utils";

function Chip({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-11 shrink-0 items-center rounded-full border px-3.5 text-sm font-medium",
        active
          ? "border-primary bg-primary text-primary-fg"
          : "border-border bg-surface text-muted hover:border-border-strong hover:text-fg",
      )}
    >
      {children}
    </button>
  );
}

export function FilterChips({
  region,
  sport,
  onRegion,
  onSport,
  showSports = true,
}: {
  region: string;
  sport?: string;
  onRegion: (id: string) => void;
  onSport?: (id: string) => void;
  showSports?: boolean;
}) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {REGIONS.map((r) => (
          <Chip key={r.id} active={region === r.id} onClick={() => onRegion(r.id)}>
            {r.label}
          </Chip>
        ))}
      </div>
      {showSports && onSport ? (
        <div className="flex flex-wrap gap-2">
          {SPORTS.map((s) => (
            <Chip key={s.id} active={sport === s.id} onClick={() => onSport(s.id)}>
              {s.label}
            </Chip>
          ))}
        </div>
      ) : null}
    </div>
  );
}
