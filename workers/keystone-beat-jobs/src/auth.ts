import type { Env } from "./types.ts";

/** Constant-time-ish string compare for bearer secrets. */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

export function extractBearer(req: Request): string | null {
  const h = req.headers.get("authorization") || req.headers.get("Authorization");
  if (!h) return null;
  const m = /^Bearer\s+(.+)$/i.exec(h.trim());
  return m?.[1]?.trim() || null;
}

/** Require KEYSTONE_JOBS_SECRET on protected job endpoints. */
export function requireJobsSecret(req: Request, env: Env): Response | null {
  const expected = (env.KEYSTONE_JOBS_SECRET || "").trim();
  if (!expected) {
    return new Response(JSON.stringify({ error: "KEYSTONE_JOBS_SECRET not configured" }), {
      status: 503,
      headers: { "content-type": "application/json" },
    });
  }
  const token = extractBearer(req);
  if (!token || !timingSafeEqual(token, expected)) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }
  return null;
}
