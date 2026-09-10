/** Duplicate fingerprints for Beat discovery vs existing Beat + News links. */

import { normalizeBeatUrl, extractXStatusId, extractYouTubeId } from "./allowlist";

function simplifyHeadline(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
}

/** Stable fingerprint used for dedupe (URL preferred; else team+headline). */
export function beatDuplicateFingerprint(input: {
  originalUrl: string;
  teamSlug?: string | null;
  headline?: string;
}): string {
  const xId = extractXStatusId(input.originalUrl);
  if (xId) return `x:${xId}`;
  const ytId = extractYouTubeId(input.originalUrl);
  if (ytId) return `yt:${ytId}`;
  const norm = normalizeBeatUrl(input.originalUrl);
  if (norm) return `url:${norm.toLowerCase()}`;
  const team = (input.teamSlug || "site").toLowerCase();
  return `hl:${team}:${simplifyHeadline(input.headline || "")}`;
}

export function urlsLikelySameStory(a: string, b: string): boolean {
  const na = normalizeBeatUrl(a)?.toLowerCase();
  const nb = normalizeBeatUrl(b)?.toLowerCase();
  if (na && nb && na === nb) return true;
  const xa = extractXStatusId(a);
  const xb = extractXStatusId(b);
  if (xa && xb && xa === xb) return true;
  const ya = extractYouTubeId(a);
  const yb = extractYouTubeId(b);
  return Boolean(ya && yb && ya === yb);
}
