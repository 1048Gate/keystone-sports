import type { Env, JobRunStats } from "./types.ts";

function newId(): string {
  return `bjr_${crypto.randomUUID().replace(/-/g, "").slice(0, 24)}`;
}

export async function recordJobRun(env: Env, stats: JobRunStats): Promise<string> {
  const id = newId();
  const finished = stats.finishedAt ?? new Date().toISOString();
  await env.DB.prepare(
    `INSERT INTO beat_job_runs (
      id, job_type, started_at, finished_at, apify_run_id,
      retrieved, discarded, deduped, pending_written, approx_cost_usd, error, summary_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      id,
      stats.jobType,
      stats.startedAt,
      finished,
      stats.apifyRunId ?? null,
      stats.retrieved,
      stats.discarded,
      stats.deduped,
      stats.pendingWritten,
      stats.approxCostUsd ?? null,
      stats.error ?? null,
      stats.summary ? JSON.stringify(stats.summary) : null,
    )
    .run();
  return id;
}

export async function recentJobRuns(
  env: Env,
  limit = 20,
): Promise<
  Array<{
    id: string;
    job_type: string;
    started_at: string;
    finished_at: string | null;
    apify_run_id: string | null;
    retrieved: number;
    discarded: number;
    deduped: number;
    pending_written: number;
    approx_cost_usd: number | null;
    error: string | null;
    summary_json: string | null;
  }>
> {
  const n = Math.max(1, Math.min(100, limit));
  const rows = await env.DB.prepare(
    `SELECT id, job_type, started_at, finished_at, apify_run_id,
            retrieved, discarded, deduped, pending_written, approx_cost_usd, error, summary_json
     FROM beat_job_runs
     ORDER BY started_at DESC
     LIMIT ?`,
  )
    .bind(n)
    .all();
  return (rows.results ?? []) as Array<{
    id: string;
    job_type: string;
    started_at: string;
    finished_at: string | null;
    apify_run_id: string | null;
    retrieved: number;
    discarded: number;
    deduped: number;
    pending_written: number;
    approx_cost_usd: number | null;
    error: string | null;
    summary_json: string | null;
  }>;
}
