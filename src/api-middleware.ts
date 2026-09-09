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

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });

const DEBUG_URLS: Record<string, string> = {
  mlb: 'https://site.web.api.espn.com/apis/v2/sports/baseball/mlb/standings',
  nfl: 'https://site.web.api.espn.com/apis/v2/sports/football/nfl/standings',
  nhl: 'https://site.web.api.espn.com/apis/v2/sports/hockey/nhl/standings',
};

function checkSecret(provided: string): string | null {
  const env = runtime() as unknown as Record<string, unknown>;
  const expected = typeof env.KEYSTONE_AUTO_RECAP_SECRET === 'string' ? env.KEYSTONE_AUTO_RECAP_SECRET : '';
  if (!expected || !secretsEqual(provided, expected)) return RECAP_SECRET_DENIED_ERROR;
  return null;
}

export const apiMiddleware = createMiddleware({ type: 'request' }).server(async ({ request, next }) => {
  if (!request) return next({});
  const url = new URL(request.url);
  const { pathname, searchParams } = url;

  if (pathname === '/api/auto-recap') {
    if (queryHasSecret(searchParams)) return json({ ok: false, error: RECAP_SECRET_URL_ERROR }, 400);
    const secret = secretFromHeaders(request.headers);
    if (!secret) return json({ ok: false, error: RECAP_SECRET_MISSING_ERROR }, 400);
    const denied = checkSecret(secret);
    if (denied) return json({ ok: false, error: denied }, 422);
    try {
      const result = await autoRecapDraft(searchParams.get('date') ?? undefined);
      return json(result, result.ok ? 200 : 422);
    } catch (error) {
      return json({ ok: false, error: error instanceof Error ? error.message : 'Auto-recap failed.' }, 500);
    }
  }

  if (pathname === '/api/standings-debug') {
    const league = searchParams.get('league') ?? 'mlb';
    const target = DEBUG_URLS[league] ?? DEBUG_URLS.mlb;
    try {
      const res = await fetch(target, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
          Accept: 'application/json',
        },
      });
      const text = await res.text();
      return json({
        league,
        url: target,
        status: res.status,
        bytes: text.length,
        head: text.slice(0, 200),
        hasEntries: text.includes('"entries"'),
        hasPhillies: text.includes('Phillies'),
        hasPirates: text.includes('Pirates'),
        hasErrors: text.includes('"error"'),
      });
    } catch (error) {
      return json({ league, url: target, error: error instanceof Error ? error.message : 'fetch failed' });
    }
  }

  return next({});
});
