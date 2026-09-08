import { createFileRoute } from "@tanstack/react-router";

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });

const URLS: Record<string, string> = {
  mlb: "https://site.web.api.espn.com/apis/v2/sports/baseball/mlb/standings",
  nfl: "https://site.web.api.espn.com/apis/v2/sports/football/nfl/standings",
  nhl: "https://site.web.api.espn.com/apis/v2/sports/hockey/nhl/standings",
};

export const Route = createFileRoute("/api/standings-debug")({
  validateSearch: (s: Record<string, unknown>) => ({ league: typeof s.league === "string" ? s.league : "mlb" }),
  loaderDeps: ({ search }) => search,
  loader: async ({ deps }) => {
    const url = URLS[deps.league as string] ?? URLS.mlb;
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
          Accept: "application/json",
        },
      });
      const text = await res.text();
      return json({
        league: deps.league,
        url,
        status: res.status,
        bytes: text.length,
        head: text.slice(0, 200),
        hasEntries: text.includes('"entries"'),
        hasPhillies: text.includes("Phillies"),
        hasPirates: text.includes("Pirates"),
        hasPenguins: text.includes("Penguins"),
        hasErrors: text.includes('"error"'),
      });
    } catch (error) {
      return json({ league: deps.league, url, throw: error instanceof Error ? error.message : "fetch failed" });
    }
  },
  component: () => null,
});