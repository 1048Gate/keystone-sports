import type { Env, JobRunStats } from "./types.ts";
import { runXDiscovery, estimateCostUsd } from "./apify.ts";
import { normalizeApifyItems } from "./normalize.ts";
import { filterCandidate } from "./filter.ts";
import { dedupeCandidates } from "./dedupe.ts";
import { writePendingCandidates } from "./write.ts";
import { expireStale } from "./expire.ts";
import { recordJobRun } from "./metrics.ts";

export type DiscoveryReport = JobRunStats & {
  topCandidates: Array<{ headline: string; url: string; score: number; team?: string }>;
  teams: Record<string, number>;
  writePath?: string;
};

export async function runExpireJob(env: Env): Promise<JobRunStats> {
  const startedAt = new Date().toISOString();
  try {
    const result = await expireStale(env);
    const stats: JobRunStats = {
      jobType: "expire",
      startedAt,
      finishedAt: new Date().toISOString(),
      retrieved: 0,
      discarded: 0,
      deduped: 0,
      pendingWritten: 0,
      summary: { expired: result.expired, checkedAt: result.checkedAt },
    };
    await recordJobRun(env, stats).catch(() => undefined);
    return stats;
  } catch (err) {
    const stats: JobRunStats = {
      jobType: "expire",
      startedAt,
      finishedAt: new Date().toISOString(),
      retrieved: 0,
      discarded: 0,
      deduped: 0,
      pendingWritten: 0,
      error: err instanceof Error ? err.message : String(err),
    };
    await recordJobRun(env, stats).catch(() => undefined);
    return stats;
  }
}

export async function runXDiscoveryJob(env: Env): Promise<DiscoveryReport> {
  const startedAt = new Date().toISOString();
  const token = (env.APIFY_TOKEN || "").trim();
  if (!token) {
    const stats: DiscoveryReport = {
      jobType: "x-discovery",
      startedAt,
      finishedAt: new Date().toISOString(),
      retrieved: 0,
      discarded: 0,
      deduped: 0,
      pendingWritten: 0,
      error: "APIFY_TOKEN not configured",
      topCandidates: [],
      teams: {},
    };
    await recordJobRun(env, stats).catch(() => undefined);
    return stats;
  }

  try {
    const apify = await runXDiscovery(token, { maxItems: 50 });
    const normalized = normalizeApifyItems(apify.items);
    let discarded = 0;
    const discardReasons: Record<string, number> = {};
    const passed = [];
    for (const c of normalized) {
      const reason = filterCandidate(c);
      if (reason !== "ok") {
        discarded += 1;
        discardReasons[reason] = (discardReasons[reason] ?? 0) + 1;
        continue;
      }
      passed.push(c);
    }

    const { unique, deduped } = await dedupeCandidates(env, passed);
    const write = await writePendingCandidates(env, unique);

    const teams: Record<string, number> = {};
    for (const c of unique) {
      const t = c.teamSlug || "unknown";
      teams[t] = (teams[t] ?? 0) + 1;
    }

    const topCandidates = [...unique]
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, 10)
      .map((c) => ({
        headline: c.headline,
        url: c.originalUrl,
        score: c.relevanceScore,
        team: c.teamSlug,
      }));

    const stats: DiscoveryReport = {
      jobType: "x-discovery",
      startedAt,
      finishedAt: new Date().toISOString(),
      apifyRunId: apify.runId,
      retrieved: apify.items.length,
      discarded: discarded + write.discarded,
      deduped: deduped + write.skippedDuplicates,
      pendingWritten: write.pendingWritten,
      approxCostUsd: apify.approxCostUsd || estimateCostUsd(apify.items.length),
      writePath: write.path,
      topCandidates,
      teams,
      summary: {
        discardReasons,
        writePath: write.path,
        writeErrors: write.errors.slice(0, 5),
        topCandidates,
        teams,
        monthlyEstimateUsd:
          Math.round(3 * 30 * (apify.approxCostUsd || estimateCostUsd(apify.items.length)) * 1000) /
          1000,
      },
    };
    await recordJobRun(env, stats).catch(() => undefined);
    return stats;
  } catch (err) {
    const stats: DiscoveryReport = {
      jobType: "x-discovery",
      startedAt,
      finishedAt: new Date().toISOString(),
      retrieved: 0,
      discarded: 0,
      deduped: 0,
      pendingWritten: 0,
      error: err instanceof Error ? err.message : String(err),
      topCandidates: [],
      teams: {},
    };
    await recordJobRun(env, stats).catch(() => undefined);
    return stats;
  }
}
