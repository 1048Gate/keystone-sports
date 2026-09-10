/**
 * Beat Module Milestone 1 feature flag.
 *
 * Name: KEYSTONE_BEAT_M1
 * Values: "true" | "false" (anything other than "true" is OFF)
 * Default: OFF in wrangler.toml [vars] for production safety.
 *
 * Preview: set KEYSTONE_BEAT_M1=true in the Cloudflare preview Worker vars
 * (or `wrangler secret` / dashboard vars for the preview environment),
 * or export KEYSTONE_BEAT_M1=true for local `npm run dev`.
 */

export const BEAT_M1_FLAG = "KEYSTONE_BEAT_M1" as const;

export function isBeatM1Enabled(value: unknown): boolean {
  return value === true || value === "true" || value === "1";
}

/** Resolve from Worker runtime env and optional process.env (local/dev). */
export function readBeatM1Flag(env: Record<string, unknown> | undefined | null): boolean {
  const fromEnv = env?.[BEAT_M1_FLAG];
  if (isBeatM1Enabled(fromEnv)) return true;
  if (typeof process !== "undefined" && isBeatM1Enabled(process.env?.[BEAT_M1_FLAG])) return true;
  return false;
}
