/**
 * Beat Module feature flag (M1 name retained for continuity).
 *
 * Name: KEYSTONE_BEAT_M1
 * Values: "true" | "false" (anything other than "true"/"1" is OFF)
 * Default: OFF in wrangler.toml [vars] for production safety.
 *
 * When ON: public /news loads approved+unexpired rows from D1 (never fixtures).
 * Empty D1 → minimal empty Beat state. Preview: set KEYSTONE_BEAT_M1=true on the
 * preview Worker / local env only — parent enables production after verify.
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
