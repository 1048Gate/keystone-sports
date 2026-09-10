/** Host / media classification for Beat write + render. */

import type { BeatMediaType } from "./types";

const X_HOSTS = new Set(["x.com", "www.x.com", "twitter.com", "www.twitter.com", "mobile.twitter.com"]);
const YT_HOSTS = new Set(["youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be", "www.youtu.be"]);

export function parseUrlSafe(raw: string): URL | null {
  try {
    const u = new URL(raw.trim());
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return u;
  } catch {
    return null;
  }
}

export function normalizeBeatUrl(raw: string): string | null {
  const u = parseUrlSafe(raw);
  if (!u) return null;
  u.hash = "";
  // Drop tracking params commonly seen on share links.
  for (const key of [...u.searchParams.keys()]) {
    if (key.startsWith("utm_") || key === "ref_src" || key === "s" || key === "t") {
      u.searchParams.delete(key);
    }
  }
  let out = u.toString();
  if (out.endsWith("/") && u.pathname !== "/") out = out.slice(0, -1);
  return out;
}

export function extractXStatusId(url: string): string | undefined {
  const u = parseUrlSafe(url);
  if (!u || !X_HOSTS.has(u.hostname.toLowerCase())) return undefined;
  const m = u.pathname.match(/\/status(?:es)?\/(\d{10,})/i);
  return m?.[1];
}

export function extractYouTubeId(url: string): string | undefined {
  const u = parseUrlSafe(url);
  if (!u) return undefined;
  const host = u.hostname.toLowerCase();
  if (host === "youtu.be" || host === "www.youtu.be") {
    const id = u.pathname.replace(/^\//, "").split("/")[0];
    return id && /^[\w-]{6,}$/.test(id) ? id : undefined;
  }
  if (!YT_HOSTS.has(host)) return undefined;
  const v = u.searchParams.get("v");
  if (v && /^[\w-]{6,}$/.test(v)) return v;
  const embed = u.pathname.match(/\/(?:embed|shorts)\/([\w-]{6,})/i);
  return embed?.[1];
}

/** Classify media; anything outside X/YouTube allowlist becomes link_out. */
export function classifyBeatMedia(url: string): {
  mediaType: BeatMediaType;
  embedUrl?: string;
  embedId?: string;
} {
  const xId = extractXStatusId(url);
  if (xId) {
    return {
      mediaType: "x_embed",
      embedId: xId,
      embedUrl: `https://x.com/i/status/${xId}`,
    };
  }
  const ytId = extractYouTubeId(url);
  if (ytId) {
    return {
      mediaType: "youtube_embed",
      embedId: ytId,
      embedUrl: `https://www.youtube-nocookie.com/embed/${ytId}`,
    };
  }
  return { mediaType: "link_out" };
}

export function isEmbedHostAllowed(url: string): boolean {
  const media = classifyBeatMedia(url);
  return media.mediaType !== "link_out" || Boolean(parseUrlSafe(url));
}
