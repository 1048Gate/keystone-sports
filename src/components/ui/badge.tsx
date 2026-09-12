import type { ComponentProps } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-pill px-ds-2 py-ds-1 font-display text-t1 font-semibold uppercase tracking-label",
  {
    variants: {
      variant: {
        default: "bg-elevated text-muted",
        live: "bg-live text-live-fg",
        final: "bg-primary text-primary-fg",
        outline: "border border-border text-muted",
        ok: "bg-ok/15 text-ok",
        breaking: "bg-badge-breaking text-badge-breaking-fg",
        reaction: "bg-badge-reaction text-badge-reaction-fg",
        watch: "bg-badge-watch text-badge-watch-fg",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export function Badge({
  className,
  variant,
  ...props
}: ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
