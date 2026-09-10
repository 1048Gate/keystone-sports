import type { ErrorComponentProps } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { TriangleAlert } from "lucide-react";

/** In-layout error so pending screens never stick after a failed loader. */
export function RouteError({ error }: ErrorComponentProps) {
  const message =
    error instanceof Error && error.message
      ? error.message
      : "Something went wrong loading this page.";
  return (
    <div className="mx-auto max-w-6xl px-4 py-16 text-center sm:px-6">
      <TriangleAlert className="mx-auto size-10 text-accent" aria-hidden="true" />
      <h1 className="mt-4 font-display text-3xl tracking-wide">Couldn't load this page</h1>
      <p className="mx-auto mt-3 max-w-md text-sm text-muted">{message}</p>
      <p className="mt-2 text-sm text-subtle">Try again in a moment, or head back to today’s slate.</p>
      <p className="mt-6">
        <Link to="/" className="font-semibold text-fg hover:text-accent">
          Back to scores
        </Link>
      </p>
    </div>
  );
}
