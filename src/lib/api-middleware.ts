import { createMiddleware } from '@tanstack/react-start';
import { runtime } from '@/lib/publishing/runtime.server';
import { autoRecapDraft } from '@/lib/sports/server';
import {
  RECAP_SECRET_DENIED_ERROR,
  RECAP_SECRET_MISSING_ERROR,
  RECAP_SECRET_URL_ERROR,
  queryHasSecret,
  secretFromHeaders,
  secretsEqual,
} from '@/lib/sports/recap-secret';
import {
  INGEST_SECRET_DENIED_ERROR,
  INGEST_SECRET_MISSING_ERROR,
  INGEST_SECRET_URL_ERROR,
  queryHasSecret as ingestQueryHasSecret,
  secretFromHeaders as ingestSecretFromHeaders,
  secretsEqual as ingestSecretsEqual,
} from '@/lib/beat/ingest-secret';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });

function checkRecapSecret(provided: string): string | null {
  const env = runtime() as unknown as Record<string, unknown>;
  const expected = typeof env.KEYSTONE_AUTO_RECAP_SECRET === 'string' ? env.KEYSTONE_AUTO_RECAP_SECRET : '';
  if (!expected || !secretsEqual(provided, expected)) return RECAP_SECRET_DENIED_ERROR;
  return null;
}

function checkIngestSecret(provided: string): string | null {
  const env = runtime() as unknown as Record<string, unknown>;
  const expected = typeof env.KEYSTONE_BEAT_INGEST_SECRET === 'string' ? env.KEYSTONE_BEAT_INGEST_SECRET : '';
  if (!expected || !ingestSecretsEqual(provided, expected)) return INGEST_SECRET_DENIED_ERROR;
  return null;
}

/** Canonical host redirects → https://keystonebeat.com (preserve path + query). */
function canonicalHostRedirect(request: Request): Response | null {
  const url = new URL(request.url);
  const host = (request.headers.get('x-forwarded-host') ?? request.headers.get('host') ?? url.host)
    .split(',')[0]
    .trim()
    .split(':')[0]
    .toLowerCase();
  if (host !== 'www.keystonebeat.com' && host !== 'keystone.twohoundsrun.com') return null;
  const target = new URL(request.url);
  target.protocol = 'https:';
  target.host = 'keystonebeat.com';
  return Response.redirect(target.toString(), 301);
}

export const apiMiddleware = createMiddleware({ type: 'request' }).server(async ({ request, next }) => {
  if (!request) return next({});

  const apex = canonicalHostRedirect(request);
  if (apex) return apex;

  const url = new URL(request.url);
  const { pathname, searchParams } = url;
  const method = request.method.toUpperCase();

  if (pathname === '/api/auto-recap') {
    if (queryHasSecret(searchParams)) return json({ ok: false, error: RECAP_SECRET_URL_ERROR }, 400);
    const secret = secretFromHeaders(request.headers);
    if (!secret) return json({ ok: false, error: RECAP_SECRET_MISSING_ERROR }, 400);
    const denied = checkRecapSecret(secret);
    if (denied) return json({ ok: false, error: denied }, 422);
    try {
      const result = await autoRecapDraft(searchParams.get('date') ?? undefined);
      return json(result, result.ok ? 200 : 422);
    } catch (error) {
      return json({ ok: false, error: error instanceof Error ? error.message : 'Auto-recap failed.' }, 500);
    }
  }

  // Bot-only Beat ingest — PENDING only. GET/POST .../check for duplicate lookup.
  if (pathname === '/api/editor/beat/ingest/check') {
    if (ingestQueryHasSecret(searchParams)) return json({ ok: false, error: INGEST_SECRET_URL_ERROR }, 400);
    const secret = ingestSecretFromHeaders(request.headers);
    if (!secret) return json({ ok: false, error: INGEST_SECRET_MISSING_ERROR }, 400);
    const denied = checkIngestSecret(secret);
    if (denied) return json({ ok: false, error: denied }, 422);
    try {
      const { db } = await import('@/lib/publishing/runtime.server');
      const { findBeatDuplicate } = await import('@/lib/beat/ingest.server');
      let body: Record<string, unknown> = {};
      if (method === 'POST') {
        body = (await request.json()) as Record<string, unknown>;
      }
      const originalUrl = String(body.originalUrl ?? searchParams.get('originalUrl') ?? '').trim();
      if (!originalUrl) return json({ ok: false, error: 'originalUrl required' }, 400);
      const result = await findBeatDuplicate(db(), {
        originalUrl,
        teamSlug: typeof body.teamSlug === 'string' ? body.teamSlug : searchParams.get('teamSlug'),
        headline: typeof body.headline === 'string' ? body.headline : undefined,
        duplicateFingerprint:
          typeof body.duplicateFingerprint === 'string' ? body.duplicateFingerprint : undefined,
      });
      return json({ ok: true, ...result });
    } catch (error) {
      return json({ ok: false, error: error instanceof Error ? error.message : 'Ingest check failed.' }, 500);
    }
  }

  if (pathname === '/api/editor/beat/ingest') {
    if (method !== 'POST') return json({ ok: false, error: 'POST only' }, 405);
    if (ingestQueryHasSecret(searchParams)) return json({ ok: false, error: INGEST_SECRET_URL_ERROR }, 400);
    const secret = ingestSecretFromHeaders(request.headers);
    if (!secret) return json({ ok: false, error: INGEST_SECRET_MISSING_ERROR }, 400);
    const denied = checkIngestSecret(secret);
    if (denied) return json({ ok: false, error: denied }, 422);
    try {
      const { db } = await import('@/lib/publishing/runtime.server');
      const { ingestPendingCandidates, loadNewsUrlsForDedupe } = await import('@/lib/beat/ingest.server');
      const body = (await request.json()) as unknown;
      const database = db();
      const newsUrls = await loadNewsUrlsForDedupe(database);
      const result = await ingestPendingCandidates(database, body as never, {
        newsUrls,
        createdBy: 'ingest:bot',
      });
      return json({ ok: true, approvalStatus: 'pending', ...result });
    } catch (error) {
      return json({ ok: false, error: error instanceof Error ? error.message : 'Beat ingest failed.' }, 500);
    }
  }

  return next({});
});
