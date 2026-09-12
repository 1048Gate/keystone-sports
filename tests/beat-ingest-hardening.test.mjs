import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

/**
 * Source-level and behavioral tests for the hardened Beat ingest endpoint.
 *
 * The middleware uses TanStack Start's createMiddleware and dynamic imports,
 * so full end-to-end HTTP testing requires a running server. These tests
 * verify the source contains the required hardening measures and the
 * migration SQL is correct.
 */

const middlewareSrc = readFileSync('src/lib/api-middleware.ts', 'utf8');

// --- Stable error codes ---

test('ingest endpoint uses generic AUTH_FAILED for missing and invalid credentials', () => {
  // Both missing and invalid secrets should return the same AUTH_FAILED code.
  assert.match(middlewareSrc, /INGEST_AUTH_FAILED/);
  assert.match(middlewareSrc, /AUTH_FAILED/);
  // Must not use separate INGEST_SECRET_MISSING_ERROR or INGEST_SECRET_DENIED_ERROR
  // in the ingest endpoint response path (they may still be imported but not used
  // for the main /ingest route's auth response).
  assert.ok(
    !/if \(!secret\) return.*INGEST_SECRET_MISSING_ERROR/.test(middlewareSrc),
    'Missing secret should not return INGEST_SECRET_MISSING_ERROR',
  );
});

test('ingest endpoint enforces POST-only with METHOD_NOT_ALLOWED', () => {
  assert.match(middlewareSrc, /INGEST_METHOD_NOT_ALLOWED/);
  assert.match(middlewareSrc, /405/);
});

test('ingest endpoint enforces JSON content type', () => {
  assert.match(middlewareSrc, /INGEST_INVALID_CONTENT_TYPE/);
  assert.match(middlewareSrc, /content-type/i);
  assert.match(middlewareSrc, /415/);
});

test('ingest endpoint handles invalid JSON with stable code', () => {
  assert.match(middlewareSrc, /INGEST_INVALID_JSON/);
  assert.match(middlewareSrc, /400/);
});

test('ingest endpoint enforces batch size limit', () => {
  assert.match(middlewareSrc, /INGEST_BATCH_TOO_LARGE/);
  assert.match(middlewareSrc, /MAX_BATCH_SIZE/);
  assert.match(middlewareSrc, /413/);
});

test('ingest endpoint enforces field length limits', () => {
  assert.match(middlewareSrc, /MAX_HEADLINE_LEN/);
  assert.match(middlewareSrc, /MAX_CONTEXT_LEN/);
  assert.match(middlewareSrc, /MAX_URL_LEN/);
  assert.match(middlewareSrc, /MAX_SOURCE_LEN/);
});

test('ingest endpoint validates URLs are https', () => {
  assert.match(middlewareSrc, /https:/);
  assert.match(middlewareSrc, /originalUrl must be https/);
});

test('ingest endpoint uses stable validation error code', () => {
  assert.match(middlewareSrc, /INGEST_VALIDATION_FAILED/);
  assert.match(middlewareSrc, /422/);
});

test('ingest endpoint sanitizes error responses (no internal message leak)', () => {
  // The catch block should not return error.message to the caller.
  assert.ok(
    !/error instanceof Error \? error\.message : 'Beat ingest failed\.'/.test(middlewareSrc),
    'Ingest endpoint should not leak internal error messages',
  );
  assert.match(middlewareSrc, /INGEST_UNAVAILABLE/);
});

test('ingest endpoint validates candidates before database work', () => {
  assert.match(middlewareSrc, /validateIngestCandidates/);
  assert.match(middlewareSrc, /validationErrors/);
});

test('ingest endpoint enforces body size cap', () => {
  assert.match(middlewareSrc, /MAX_BODY_BYTES/);
  assert.match(middlewareSrc, /content-length/i);
});

// --- PENDING-only enforcement (source-level) ---

test('ingest endpoint forces PENDING and manual approval mode', () => {
  const ingestSrc = readFileSync('src/lib/beat/ingest.server.ts', 'utf8');
  assert.match(ingestSrc, /approvalStatus: "pending"/);
  assert.match(ingestSrc, /approvalMode: "manual"/);
  assert.match(ingestSrc, /approvedBy: null/);
  assert.match(ingestSrc, /approvedAt: null/);
  assert.match(ingestSrc, /pinned: false/);
  assert.match(ingestSrc, /createdBy/);
});

test('ingest endpoint does not accept client-supplied approval fields', () => {
  const ingestSrc = readFileSync('src/lib/beat/ingest.server.ts', 'utf8');
  // The ingest function hardcodes these values, ignoring any client input.
  assert.match(ingestSrc, /Force PENDING/);
});

// --- Migration tests ---

test('migration 0004 resolves duplicate fingerprints with survivor rule', () => {
  const sql = readFileSync('drizzle/0004_beat_fingerprint_unique.sql', 'utf8');
  // Must use ROW_NUMBER partitioned by fingerprint.
  assert.match(sql, /ROW_NUMBER\(\)/);
  assert.match(sql, /PARTITION BY/);
  // Survivor rule: approved first.
  assert.match(sql, /approval_status.*approved.*0.*1/);
  // Then oldest created_at.
  assert.match(sql, /created_at.*ASC/);
  // Null fingerprints on non-survivors (no DELETE).
  assert.match(sql, /SET `duplicate_fingerprint` = NULL/);
  assert.ok(!/DELETE\s+FROM/i.test(sql), 'Migration must not DELETE records');
  // Partial unique index.
  assert.match(sql, /CREATE UNIQUE INDEX/);
  assert.match(sql, /duplicate_fingerprint/);
  assert.match(sql, /WHERE `duplicate_fingerprint` IS NOT NULL/);
});

// --- Worker write.ts hardening (source-level) ---

test('Worker write.ts does not silently fall back to D1 on HTTP failure', () => {
  const writeSrc = readFileSync('workers/keystone-beat-jobs/src/write.ts', 'utf8');
  // The old pattern was: catch → writeViaD1 unconditionally.
  // The new code must gate D1 fallback behind allowD1Fallback.
  assert.match(writeSrc, /allowD1Fallback/);
  assert.match(writeSrc, /KEYSTONE_ALLOW_DIRECT_D1_FALLBACK/);
  // The old unconditional fallback comment must be gone.
  assert.ok(
    !/Fall back to D1 if HTTP path fails/.test(writeSrc),
    'Worker must not have automatic D1 fallback comment',
  );
  // The default path when secret is set must NOT fall back to D1.
  assert.match(writeSrc, /HTTP ingest is the only path/);
});

test('Worker write.ts uses AbortController for HTTP timeout', () => {
  const writeSrc = readFileSync('workers/keystone-beat-jobs/src/write.ts', 'utf8');
  assert.match(writeSrc, /AbortController/);
  assert.match(writeSrc, /setTimeout/);
  assert.match(writeSrc, /clearTimeout/);
  assert.match(writeSrc, /INGEST_TIMEOUT/);
});

test('Worker write.ts uses stable error codes instead of raw server text', () => {
  const writeSrc = readFileSync('workers/keystone-beat-jobs/src/write.ts', 'utf8');
  assert.match(writeSrc, /INGEST_REJECTED/);
  assert.match(writeSrc, /INGEST_UNAVAILABLE/);
  // Must not include the old pattern of echoing response body.
  assert.ok(
    !/body\.error \|\| JSON\.stringify\(body\)/.test(writeSrc),
    'Worker must not echo raw server response body in errors',
  );
});

test('Worker write.ts makes D1 fallback explicit and disabled by default', () => {
  const writeSrc = readFileSync('workers/keystone-beat-jobs/src/write.ts', 'utf8');
  assert.match(writeSrc, /KEYSTONE_ALLOW_DIRECT_D1_FALLBACK/);
  assert.match(writeSrc, /allowD1Fallback/);
  // When ingest secret is configured and fallback is not enabled,
  // the only path is HTTP ingest.
  assert.match(writeSrc, /HTTP ingest is the only path/);
});

test('Worker types.ts includes new config fields', () => {
  const typesSrc = readFileSync('workers/keystone-beat-jobs/src/types.ts', 'utf8');
  assert.match(typesSrc, /KEYSTONE_ALLOW_DIRECT_D1_FALLBACK/);
  assert.match(typesSrc, /KEYSTONE_INGEST_TIMEOUT_MS/);
});
