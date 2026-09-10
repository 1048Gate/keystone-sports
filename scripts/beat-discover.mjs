#!/usr/bin/env node
/**
 * Manual Beat discovery (candidate-only). Does not auto-publish.
 *
 * Usage:
 *   npm run beat:discover           # dry-run JSON to stdout
 *   npm run beat:discover -- --write-pending-sql > /tmp/beat-pending.sql
 *
 * CI: safe as dry-run; network to syndication.twitter.com + publish.twitter.com.
 * Production inserts: prefer admin POST discoverBeatCandidates (Access-gated) or
 * review dry-run then insert via editor / seed path.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { stripTypeScriptTypes } from "node:module";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const writeSql = process.argv.includes("--write-pending-sql");

function loadTs(path, exportNames) {
  const code = stripTypeScriptTypes(readFileSync(join(root, path), "utf8"), { mode: "transform" })
    .replace(/^import\s+[\s\S]*?from\s+['"][^'"]+['"];?\s*$/gm, "")
    .replace(/\bexport /g, "");
  const mod = new Function(`${code}\nreturn { ${exportNames.join(",")} };`)();
  return mod;
}

// Lightweight inline discovery without full TS graph: re-implement fetch loop using discovery helpers via dynamic import of compiled strip.
async function main() {
  const discoveryPath = join(root, "src/lib/beat/discovery.ts");
  const allowPath = join(root, "src/lib/beat/allowlist.ts");
  const fpPath = join(root, "src/lib/beat/fingerprint.ts");

  const allowCode = stripTypeScriptTypes(readFileSync(allowPath, "utf8"), { mode: "transform" })
    .replace(/^import\s+[\s\S]*?from\s+['"][^'"]+['"];?\s*$/gm, "")
    .replace(/\bexport /g, "")
    .replace(/import type[^;]+;/g, "");
  const allow = new Function(`${allowCode}\nreturn { classifyBeatMedia, normalizeBeatUrl, extractXStatusId, extractYouTubeId };`)();

  const fpCode = stripTypeScriptTypes(readFileSync(fpPath, "utf8"), { mode: "transform" })
    .replace(/^import\s+[\s\S]*?from\s+['"][^'"]+['"];?\s*$/gm, "")
    .replace(/\bexport /g, "");
  const fp = new Function("allow", `${fpCode}\nreturn { beatDuplicateFingerprint };`)(allow);

  const discCode = stripTypeScriptTypes(readFileSync(discoveryPath, "utf8"), { mode: "transform" })
    .replace(/^import\s+type[\s\S]*?from\s+['"][^'"]+['"];?\s*$/gm, "")
    .replace(/^import\s+[\s\S]*?from\s+['"][^'"]+['"];?\s*$/gm, "")
    .replace(/\bexport /g, "");
  const discovery = new Function(
    "beatDuplicateFingerprint",
    "classifyBeatMedia",
    `${discCode}\nreturn { discoverPaBeatCandidates, PA_BEAT_DISCOVERY_ACCOUNTS, scoreDiscoveryCandidate };`,
  )(fp.beatDuplicateFingerprint, allow.classifyBeatMedia);

  const result = await discovery.discoverPaBeatCandidates({ perAccountLimit: 2 });
  if (!writeSql) {
    console.log(JSON.stringify({ generatedAt: new Date().toISOString(), ...result }, null, 2));
    return;
  }
  const esc = (v) => (v == null ? "NULL" : `'${String(v).replace(/'/g, "''")}'`);
  for (const c of result.candidates) {
    const id = crypto.randomUUID();
    console.log(`INSERT OR IGNORE INTO beat_items (
  id, source, source_tier, author_account, team_slug, league, category, headline, context,
  original_url, embed_url, embed_id, oembed_html, timestamp, media_type, verified_official,
  expires_at, approval_status, approval_mode, approved_by, approved_at, pinned,
  relevance_score, duplicate_fingerprint, created_at, updated_at, created_by
) VALUES (
  ${esc(id)}, ${esc(c.source)}, ${esc(c.sourceTier)}, ${esc(c.account)}, ${esc(c.teamSlug)}, ${esc(c.league)},
  ${esc(c.categoryRecommendation)}, ${esc(c.headline)}, ${esc(c.suggestedContext)},
  ${esc(c.originalUrl)}, ${esc(c.embedUrl)}, ${esc(c.embedId)}, ${esc(c.oembedHtml)}, ${esc(c.timestamp)},
  ${esc(c.mediaType)}, ${c.verifiedOfficial ? 1 : 0}, ${esc(c.proposedExpiration)}, 'pending', 'manual',
  NULL, NULL, 0, ${c.relevanceScore}, ${esc(c.duplicateFingerprint)}, ${esc(c.timestamp)}, ${esc(c.timestamp)}, 'discover:cli'
);`);
  }
  console.error(`[beat:discover] ${result.candidates.length} pending SQL statements; skipped ${result.skippedDuplicates}; errors ${result.errors.length}`);
}

main().catch((err) => {
  console.error("[beat:discover] failed:", err?.message || err);
  process.exit(1);
});
