import type { BeatItem } from "./types";
import raw from "@/data/beat-poc.json";

/** Statically imported fixtures — no network, no ESPN calls for Beat M1. */
export const BEAT_POC_FIXTURES = raw as BeatItem[];

export function beatFixtureInventory() {
  const byCategory: Record<string, number> = {};
  const byMedia: Record<string, number> = {};
  for (const item of BEAT_POC_FIXTURES) {
    byCategory[item.category] = (byCategory[item.category] ?? 0) + 1;
    byMedia[item.mediaType] = (byMedia[item.mediaType] ?? 0) + 1;
  }
  return {
    total: BEAT_POC_FIXTURES.length,
    byCategory,
    byMedia,
    publicEligibleHint: "approved + not expired (see selectPublicBeatItems)",
  };
}
