import type { BeatItem } from "./types";
import raw from "@/data/beat-poc.json";

/**
 * Dev/test fixtures ONLY.
 * Public `getBeatDesk` never loads this file — production reads D1 approved rows.
 * Keep for unit tests + local layout checks (`KEYSTONE_BEAT_USE_FIXTURES` is intentionally unused on the public path).
 */
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
    publicEligibleHint: "approved + not expired (see selectPublicBeatItems) — fixtures are not a prod source",
  };
}
