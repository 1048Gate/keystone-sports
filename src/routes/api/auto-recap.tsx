import { createFileRoute } from "@tanstack/react-router";
import { runAutoRecap } from "@/lib/sports/api";

export const Route = createFileRoute("/api/auto-recap")({
  validateSearch: (s: Record<string, unknown>) => ({
    secret: typeof s.secret === "string" ? s.secret : "",
    date: typeof s.date === "string" ? s.date : "",
  }),
  loaderDeps: ({ search }) => search,
  loader: async ({ deps }) => {
    const json = (body: unknown, status: number) =>
      new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
    if (!deps.secret) return json({ ok: false, error: "Missing secret." }, 400);
    try {
      const result = await runAutoRecap({ data: { secret: deps.secret, date: deps.date || undefined } });
      return json(result, result.ok ? 200 : 422);
    } catch (error) {
      return json({ ok: false, error: error instanceof Error ? error.message : "Auto-recap failed." }, 500);
    }
  },
  component: () => null,
});