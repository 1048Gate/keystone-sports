import type { RawApifyTweet } from "./types.ts";
import { searchTermsForApify } from "./searches.ts";

export const APIFY_ACTOR_ID = "nfp1fpt5gUlBwPcor";
const API_BASE = "https://api.apify.com/v2";

/** Conservative total items per discovery pass. */
export const DEFAULT_MAX_ITEMS = 50;

export type ApifyRunResult = {
  runId: string;
  datasetId: string;
  items: RawApifyTweet[];
  status: string;
  approxCostUsd: number;
};

function authHeaders(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    "content-type": "application/json",
  };
}

/**
 * Actor input for apidojo/twitter-scraper-lite (id nfp1fpt5gUlBwPcor).
 * Keep ≤5 searchTerms for cheapest per-item tier ($0.0004).
 * Query cost: $0.016 each; first ~40 tweets/query included.
 */
export function buildActorInput(opts?: {
  searchTerms?: string[];
  maxItems?: number;
}): Record<string, unknown> {
  const searchTerms = (opts?.searchTerms ?? searchTermsForApify()).slice(0, 5);
  const maxItems = opts?.maxItems ?? DEFAULT_MAX_ITEMS;
  return {
    searchTerms,
    sort: "Latest",
    maxItems,
    tweetLanguage: "en",
  };
}

/** Estimate USD from Apify pay-per-event pricing (paid plan). */
export function estimateApifyCostUsd(queryCount: number, itemCount: number): number {
  const q = Math.max(0, queryCount);
  const included = q * 40;
  const extra = Math.max(0, itemCount - included);
  // Tier 1 (≤5 queries): $0.0004/item beyond included pages
  const perItem = q <= 5 ? 0.0004 : q <= 10 ? 0.0008 : 0.0012;
  return Number((q * 0.016 + extra * perItem).toFixed(4));
}

export async function startActorRun(
  token: string,
  input: Record<string, unknown> = buildActorInput(),
): Promise<{ runId: string; datasetId?: string }> {
  const url = `${API_BASE}/acts/${APIFY_ACTOR_ID}/runs?waitForFinish=0`;
  const res = await fetch(url, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Apify start failed: ${res.status} ${body.slice(0, 300)}`);
  }
  const data = (await res.json()) as {
    data?: { id?: string; defaultDatasetId?: string };
  };
  const runId = data.data?.id;
  if (!runId) throw new Error("Apify start: missing run id");
  return { runId, datasetId: data.data?.defaultDatasetId };
}

export async function pollRun(
  token: string,
  runId: string,
  opts?: { timeoutMs?: number; intervalMs?: number },
): Promise<{ status: string; datasetId: string }> {
  const timeoutMs = opts?.timeoutMs ?? 180_000;
  const intervalMs = opts?.intervalMs ?? 4_000;
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const res = await fetch(`${API_BASE}/actor-runs/${runId}`, {
      headers: authHeaders(token),
    });
    if (!res.ok) throw new Error(`Apify poll failed: ${res.status}`);
    const data = (await res.json()) as {
      data?: { status?: string; defaultDatasetId?: string };
    };
    const status = data.data?.status || "UNKNOWN";
    const datasetId = data.data?.defaultDatasetId || "";
    if (["SUCCEEDED", "FAILED", "ABORTED", "TIMED-OUT"].includes(status)) {
      return { status, datasetId };
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error(`Apify run ${runId} timed out after ${timeoutMs}ms`);
}

export async function fetchDatasetItems(
  token: string,
  datasetId: string,
  limit = DEFAULT_MAX_ITEMS,
): Promise<RawApifyTweet[]> {
  if (!datasetId) return [];
  const url = `${API_BASE}/datasets/${datasetId}/items?format=json&clean=true&limit=${limit}`;
  const res = await fetch(url, { headers: authHeaders(token) });
  if (!res.ok) throw new Error(`Apify dataset fetch failed: ${res.status}`);
  const items = (await res.json()) as RawApifyTweet[];
  return Array.isArray(items) ? items : [];
}

/** @deprecated use estimateApifyCostUsd */
export function estimateCostUsd(retrieved: number): number {
  return estimateApifyCostUsd(5, retrieved);
}

/**
 * Full discovery pass: start → poll (~3 min max) → dataset items.
 */
export async function runXDiscovery(
  token: string,
  opts?: { maxItems?: number; searchTerms?: string[] },
): Promise<ApifyRunResult> {
  const input = buildActorInput(opts);
  const queryCount = Array.isArray(input.searchTerms) ? (input.searchTerms as string[]).length : 5;
  const { runId, datasetId: earlyDs } = await startActorRun(token, input);
  const { status, datasetId } = await pollRun(token, runId, { timeoutMs: 180_000 });
  if (status !== "SUCCEEDED") {
    throw new Error(`Apify run ${runId} ended with status ${status}`);
  }
  const ds = datasetId || earlyDs || "";
  const items = await fetchDatasetItems(token, ds, opts?.maxItems ?? DEFAULT_MAX_ITEMS);
  return {
    runId,
    datasetId: ds,
    items,
    status,
    approxCostUsd: estimateApifyCostUsd(queryCount, items.length),
  };
}

/** Optional: fetch actor input schema when token works (ops / debugging). */
export async function fetchActorInfo(token: string): Promise<unknown> {
  const res = await fetch(`${API_BASE}/acts/${APIFY_ACTOR_ID}`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error(`Actor info failed: ${res.status}`);
  return res.json();
}
