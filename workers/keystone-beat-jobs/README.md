# keystone-beat-jobs

**Production default: Apify OFF.** Cron is expire-only (`15 * * * *`). Re-enable with `KEYSTONE_APIFY_ENABLED=true` + paid plan + `APIFY_TOKEN`.


Separate Cloudflare Worker for **Keystone Beat** scheduled jobs:

1. Apify X discovery (actor `nfp1fpt5gUlBwPcor`)
2. Filter / score / dedupe
3. Write **PENDING-only** Beat candidates

This Worker **does not** serve the public site, **does not** auto-publish, and **does not** redesign Beat UI.

## Crons (UTC)

| Cron | ET (EDT) | Job |
|------|----------|-----|
| `0 11 * * *` | ~7:00 AM | X discovery |
| `0 18 * * *` | ~2:00 PM | X discovery |
| `0 23 * * *` | ~7:00 PM | X discovery |
| `15 * * * *` | :15 hourly | **Expire only** (no Apify) |

## HTTP (workers.dev)

- `GET /health` — public
- `POST /run/x-discovery` — Bearer `KEYSTONE_JOBS_SECRET`
- `POST /run/expire` — Bearer `KEYSTONE_JOBS_SECRET`
- `GET /metrics/recent` — Bearer `KEYSTONE_JOBS_SECRET`

## Secrets

Set with `wrangler secret put` from `workers/keystone-beat-jobs/` (never commit values):

| Secret | Required | Purpose |
|--------|----------|---------|
| `APIFY_TOKEN` | yes for discovery | Apify API |
| `KEYSTONE_JOBS_SECRET` | yes | Protect job HTTP endpoints |
| `KEYSTONE_BEAT_INGEST_SECRET` | preferred | POST PENDING via `https://keystonebeat.com/api/editor/beat/ingest` |

If ingest secret is missing, the Worker falls back to **direct D1 INSERT** into `beat_items` with `approval_status='pending'` / `approval_mode='manual'`.

## Deploy

```bash
export PATH="/home/box/.local/node22/bin:$PATH"
cd workers/keystone-beat-jobs
npm install
npx wrangler deploy

# secrets (pipe; do not echo)
printf '%s' "$APIFY_TOKEN" | npx wrangler secret put APIFY_TOKEN
openssl rand -hex 32 | npx wrangler secret put KEYSTONE_JOBS_SECRET
# optional ingest (same value as main site Worker)
cat /path/to/beat-ingest.secret | npx wrangler secret put KEYSTONE_BEAT_INGEST_SECRET
```

Apply metrics migration on the shared D1 DB (from repo root):

```bash
npx wrangler d1 migrations apply keystone-sports --remote
```

## Cost estimate

Similar Apify tweet scrapers ≈ **$0.40 / 1000 tweets**.

- Per run: `retrieved/1000 * 0.40`
- Monthly ≈ `3 discovery runs/day * 30 * cost/run` (expire cron has no Apify cost)

Default `maxItems` ≈ 50 per discovery pass.

## Filtering / scoring

- Reject: RTs, duplicate URLs, older than 36h, giveaways, tickets, merch, gambling, low-value replies, fan spam
- Aggregator tier needs relevance **≥ 55**
- Bands: 90–100 breaking · 75–89 injury/trade · 55–74 strong reporting · 35–54 interview/highlight · 20–34 reaction · &lt;20 discard
- Tweets use `media_type: x_embed` only (never download video)

## Workers AI

Prefer **deterministic-first** filter/score rules in this Worker. **Do not enable Workers AI** for discovery.

## Metrics

Table `beat_job_runs` (migration `drizzle/0003_beat_job_runs.sql`) records retrieved / discarded / deduped / pending_written / approx_cost_usd / summary_json.

## Manual test

```bash
curl -sS -X POST https://keystone-beat-jobs.<account>.workers.dev/run/x-discovery \
  -H "Authorization: Bearer $KEYSTONE_JOBS_SECRET"
```

Verify PENDING rows in D1 — **do not approve** from this Worker.


## Apify actor (apidojo/twitter-scraper-lite)

- Store: `apidojo/twitter-scraper-lite` (id `nfp1fpt5gUlBwPcor`)
- Input: `searchTerms` (≤5), `sort: Latest`, `maxItems`, `tweetLanguage: en`
- Paid-plan pricing: **$0.016/query** + first ~40 tweets included; extra items **$0.0004** (≤5 queries)
- Typical 5-query pass within included pages ≈ **~$0.08**; ~90 passes/month ≈ **~$7**
- Free Apify plan is demo-only (5 runs/month, 10 items) — paid plan required for production cadence
