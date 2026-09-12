import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Soft remount fade for day-nav and score refresh. CSS, not a motion library. */
export function FadeSwap({
  id,
  children,
  className,
}: {
  id: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div key={id} className={cn("fade-swap", className)}>
      {children}
    </div>
  );
}
