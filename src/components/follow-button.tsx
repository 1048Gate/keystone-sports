import { Star } from "lucide-react";
import { useFollows } from "@/lib/sports/follow-store";
import { cn } from "@/lib/utils";

export function FollowButton({
  slug,
  name,
  variant = "full",
}: {
  slug: string;
  name?: string;
  variant?: "full" | "icon";
}) {
  const on = useFollows((s) => s.slugs.includes(slug));
  const toggle = useFollows((s) => s.toggle);
  const label = on ? "Following" : "Follow";
  const aria = on ? `Unfollow ${name ?? slug}` : `Follow ${name ?? slug}`;

  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={aria}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle(slug);
      }}
      className={cn(
        "inline-flex shrink-0 items-center justify-center gap-1.5 rounded-sm border text-sm font-medium transition-colors",
        variant === "icon" ? "h-11 w-11" : "h-11 px-3",
        on
          ? "border-primary bg-primary text-primary-fg"
          : "border-border-strong bg-surface text-fg hover:bg-elevated",
      )}
    >
      <Star className={cn("h-4 w-4", on && "fill-current")} />
      {variant === "full" ? label : null}
    </button>
  );
}
