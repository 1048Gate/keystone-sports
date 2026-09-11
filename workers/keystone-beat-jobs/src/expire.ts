import type { Env } from "./types.ts";

export type ExpireResult = {
  expired: number;
  checkedAt: string;
};

/**
 * Mark pending/approved items past expires_at as expired.
 * Does NOT delete rows. Does NOT approve anything.
 */
export async function expireStale(env: Env, nowIso = new Date().toISOString()): Promise<ExpireResult> {
  const res = await env.DB.prepare(
    `UPDATE beat_items
     SET approval_status = 'expired', updated_at = ?
     WHERE expires_at IS NOT NULL
       AND expires_at <= ?
       AND approval_status IN ('pending', 'approved')`,
  )
    .bind(nowIso, nowIso)
    .run();
  const expired = res.meta?.changes ?? 0;
  return { expired, checkedAt: nowIso };
}
