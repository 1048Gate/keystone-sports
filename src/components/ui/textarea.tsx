import { cn } from "@/lib/utils";

export function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      className={cn(
        "min-h-32 w-full rounded-[var(--radius-md)] border border-border bg-surface px-3 py-2.5 text-sm leading-relaxed text-fg placeholder:text-subtle outline-none transition-colors focus-visible:border-border-strong focus-visible:ring-2 focus-visible:ring-primary/40",
        className,
      )}
      {...props}
    />
  );
}
