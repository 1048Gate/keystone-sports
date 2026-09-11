import type { Env, BeatCandidate } from "./types.ts";

export type DedupeResult = {
  unique: BeatCandidate[];
  deduped: number;
};

/** Load existing fingerprints + original_urls from beat_items. */
export async function loadExistingKeys(db: D1Database): Promise<Set<string>> {
  const keys = new Set<string>();
  try {
    const rows = await db
      .prepare(
        `SELECT original_url AS url, duplicate_fingerprint AS fp FROM beat_items`,
      )
      .all<{ url: string | null; fp: string | null }>();
    for (const r of rows.results ?? []) {
      if (r.url) {
        keys.add(`url:${r.url.toLowerCase()}`);
        const m = r.url.match(/status(?:es)?\/(\d{10,})/i);
        if (m) keys.add(`x:${m[1]}`);
      }
      if (r.fp) keys.add(r.fp);
    }
  } catch {
    // table missing in local — treat as empty
  }
  return keys;
}

export function dedupeAgainstExisting(
  candidates: BeatCandidate[],
  existing: Set<string>,
): DedupeResult {
  const unique: BeatCandidate[] = [];
  let deduped = 0;
  const seen = new Set(existing);
  for (const c of candidates) {
    const urlKey = `url:${c.originalUrl.toLowerCase()}`;
    if (seen.has(c.duplicateFingerprint) || seen.has(urlKey)) {
      deduped += 1;
      continue;
    }
    unique.push(c);
    seen.add(c.duplicateFingerprint);
    seen.add(urlKey);
  }
  return { unique, deduped };
}

export async function dedupeCandidates(
  env: Env,
  candidates: BeatCandidate[],
): Promise<DedupeResult> {
  const existing = await loadExistingKeys(env.DB);
  return dedupeAgainstExisting(candidates, existing);
}
