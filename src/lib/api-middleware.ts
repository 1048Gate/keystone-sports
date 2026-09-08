import { createMiddleware } from '@tanstack/react-start';
import { runtime } from '@/lib/publishing/runtime.server';
import { autoRecapDraft } from '@/lib/sports/server';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });

function checkSecret(provided: string): string | null {
  const env = runtime() as unknown as Record<string, unknown>;
  const expected = typeof env.KEYSTONE_AUTO_RECAP_SECRET === 'string' ? env.KEYSTONE_AUTO_RECAP_SECRET : '';
  if (!expected || provided !== expected) return 'Auto-recap is not enabled, or the secret is wrong.';
  return null;
}

export const apiMiddleware = createMiddleware({ type: 'request' }).server(async ({ request, next }) => {
  if (!request) return next({});
  const url = new URL(request.url);
  const { pathname, searchParams } = url;

  if (pathname === '/api/auto-recap') {
    const secret = searchParams.get('secret') ?? '';
    if (!secret) return json({ ok: false, error: 'Missing secret.' }, 400);
    const denied = checkSecret(secret);
    if (denied) return json({ ok: false, error: denied }, 422);
    try {
      const result = await autoRecapDraft(searchParams.get('date') ?? undefined);
      return json(result, result.ok ? 200 : 422);
    } catch (error) {
      return json({ ok: false, error: error instanceof Error ? error.message : 'Auto-recap failed.' }, 500);
    }
  }

  return next({});
});