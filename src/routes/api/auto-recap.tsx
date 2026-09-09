import { createFileRoute } from "@tanstack/react-router";
import { runAutoRecap } from "@/lib/sports/api";
import { RECAP_SECRET_URL_ERROR, queryHasSecret } from "@/lib/sports/recap-secret";

export const Route = createFileRoute("/api/auto-recap")({
  validateSearch: (s: Record<string, unknown>) => ({
    secretInUrl: Object.prototype.hasOwnProperty.call(s, "secret"),
    date: typeof s.date === "string" ? s.date : "",
  }),
  loaderDeps: ({ search }) => search,
  loader: async ({ deps }) => {
    const json = (body: unknown, status: number) =>
      new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
    if (deps.secretInUrl) return json({ ok: false, error: RECAP_SECRET_URL_ERROR }, 400);
    try {
      const { getRequest } = await import("@tanstack/react-start/server");
      const request = getRequest();
      if (request && queryHasSecret(new URL(request.url).searchParams)) {
        return json({ ok: false, error: RECAP_SECRET_URL_ERROR }, 400);
      }
    } catch {
      // Header check still happens inside runAutoRecap on the server.
    }
    try {
      const result = await runAutoRecap({ data: { date: deps.date || undefined } });
      return json(result, result.ok ? 200 : 422);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Auto-recap failed.";
      const status = /header, not the URL|Missing secret/i.test(message)
        ? 400
        : /not enabled|wrong/i.test(message)
          ? 422
          : 500;
      return json({ ok: false, error: message }, status);
    }
  },
  component: () => null,
});
