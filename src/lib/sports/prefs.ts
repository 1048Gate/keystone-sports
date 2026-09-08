import type { Region } from "@/data/teams";

const KEY = "keystone-filters";

export type ViewRegion = "all" | "following" | Region;

export type SportsPrefs = {
  region: ViewRegion;
  sport: string;
};

export function parseRegion(v: unknown): ViewRegion {
  if (v === "philly" || v === "pittsburgh" || v === "college" || v === "following" || v === "all") {
    return v;
  }
  return "all";
}

export function readPrefs(): SportsPrefs {
  if (typeof window === "undefined") return { region: "all", sport: "all" };
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return { region: "all", sport: "all" };
    const data = JSON.parse(raw) as Partial<SportsPrefs>;
    const sport = typeof data.sport === "string" && data.sport ? data.sport : "all";
    return { region: parseRegion(data.region), sport };
  } catch {
    return { region: "all", sport: "all" };
  }
}

export function writePrefs(prefs: SportsPrefs) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(prefs));
}
