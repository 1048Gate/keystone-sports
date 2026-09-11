/**
 * keystone-beat-jobs — background Beat ops (expire, metrics, optional Apify).
 * Does NOT serve the public site. Does NOT auto-publish.
 * Apify X discovery is OFF by default (KEYSTONE_APIFY_ENABLED=false).
 */
import type { Env } from "./types.ts";
import { requireJobsSecret } from "./auth.ts";
import { recentJobRuns } from "./metrics.ts";
import { runExpireJob, runXDiscoveryJob } from "./pipeline.ts";

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function apifyEnabled(env: Env): boolean {
  return (env.KEYSTONE_APIFY_ENABLED || "").trim().toLowerCase() === "true";
}

/** Cron "15 * * * *" → expire only. */
function isExpireOnlyCron(cron: string | undefined): boolean {
  if (!cron) return false;
  return cron.trim().startsWith("15 ") || cron === "15 * * * *";
}

const worker = {
  async fetch(req: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
    const url = new URL(req.url);
    const path = url.pathname.replace(/\/+$/, "") || "/";

    if (req.method === "GET" && (path === "/health" || path === "/")) {
      return json({
        ok: true,
        service: "keystone-beat-jobs",
        publicSite: false,
        autoPublish: false,
        apifyEnabled: apifyEnabled(env),
        crons: "expire-hourly",
      });
    }

    if (req.method === "POST" && path === "/run/x-discovery") {
      const denied = requireJobsSecret(req, env);
      if (denied) return denied;
      if (!apifyEnabled(env)) {
        return json(
          {
            error: "apify_disabled",
            message:
              "Apify X discovery is disabled (KEYSTONE_APIFY_ENABLED!=true). No API calls made.",
          },
          503,
        );
      }
      const report = await runXDiscoveryJob(env);
      return json(report, report.error ? 500 : 200);
    }

    if (req.method === "POST" && path === "/run/expire") {
      const denied = requireJobsSecret(req, env);
      if (denied) return denied;
      const report = await runExpireJob(env);
      return json(report, report.error ? 500 : 200);
    }

    if (req.method === "GET" && path === "/metrics/recent") {
      const denied = requireJobsSecret(req, env);
      if (denied) return denied;
      const limit = Number(url.searchParams.get("limit") || "20");
      try {
        const runs = await recentJobRuns(env, limit);
        return json({ runs });
      } catch (err) {
        return json(
          { error: err instanceof Error ? err.message : String(err), runs: [] },
          500,
        );
      }
    }

    return json({ error: "not_found", path }, 404);
  },

  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    const cron = event.cron;
    // Default production: only expire cron is registered. Extra safety: never call Apify unless flagged.
    if (isExpireOnlyCron(cron) || !apifyEnabled(env)) {
      ctx.waitUntil(runExpireJob(env).then(() => undefined));
      return;
    }
    ctx.waitUntil(runXDiscoveryJob(env).then(() => undefined));
  },
};

export default worker;
