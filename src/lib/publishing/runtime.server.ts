import { env } from 'cloudflare:workers';
import { getRequestHeader, setResponseHeader } from '@tanstack/react-start/server';
export interface Statement {
  bind(...values: unknown[]): Statement;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<{ results: T[] }>;
  run(): Promise<unknown>;
}
export interface Database { prepare(sql: string): Statement; batch(statements: Statement[]): Promise<unknown[]> }
type Runtime = { DB?: Database; AI_API_KEY?: string; AI_MODEL?: string; AI_BASE_URL?: string; KEYSTONE_ADMIN_EMAIL?: string; KEYSTONE_AI_ENABLED?: string; KEYSTONE_BEAT_M1?: string };
export function runtime(): Runtime { return env as Runtime; }
export function db(): Database {
  const binding = runtime().DB;
  if (!binding) throw new Error('Publishing storage is unavailable. Your draft has not been changed.');
  return binding;
}

/**
 * Resolve the signed-in owner for publishing / AI.
 * Preference order:
 * 1) Cloudflare Access email header (trusted when Access protects this Worker)
 * 2) Legacy ChatGPT/OpenAI host headers (only when hosted behind that gateway)
 */
export function identity() {
  setResponseHeader('Cache-Control', 'private, no-store');
  const owner = runtime().KEYSTONE_ADMIN_EMAIL?.trim().toLowerCase();

  const accessEmail = getRequestHeader('cf-access-authenticated-user-email')?.trim().toLowerCase();
  if (accessEmail) {
    return {
      id: `access:${accessEmail}`,
      admin: Boolean(owner && accessEmail === owner),
      adminConfigured: Boolean(owner),
    };
  }

  const id = getRequestHeader('oai-authenticated-user-id');
  const email = getRequestHeader('oai-authenticated-user-email')?.toLowerCase();
  return {
    id,
    admin: Boolean(id && owner && email === owner),
    adminConfigured: Boolean(owner),
  };
}
export function requireAdmin() {
  const user = identity();
  if (!user.id || !user.admin) throw new Error('Only the configured owner can publish updates.');
  return user.id;
}
export async function requireAiAccess() {
  const user = identity();
  if (!user.id) throw new Error('Sign in as the site owner to use AI features.');
  if (!user.admin) throw new Error('Only the configured owner can use AI features.');
  if (runtime().KEYSTONE_AI_ENABLED !== 'true' || !runtime().AI_API_KEY) throw new Error('AI features are not enabled. Scores and schedules still work.');
  const day = new Date().toISOString().slice(0, 10);
  const expires = Date.now() + 2 * 86400000;
  const row = await db().prepare('INSERT INTO ai_usage (key, count, expires_at) VALUES (?, 1, ?) ON CONFLICT(key) DO UPDATE SET count = count + 1 WHERE count < 5 RETURNING count').bind(`${day}:user:${user.id}`, expires).first();
  if (!row) throw new Error('Your daily AI limit has been reached. Try again tomorrow.');
  const globalRow = await db().prepare('INSERT INTO ai_usage (key, count, expires_at) VALUES (?, 1, ?) ON CONFLICT(key) DO UPDATE SET count = count + 1 WHERE count < 50 RETURNING count').bind(`${day}:site`, expires).first();
  if (!globalRow) throw new Error('The site’s daily AI limit has been reached.');
  await db().prepare('DELETE FROM ai_usage WHERE expires_at < ?').bind(Date.now()).run();
  return user.id;
}
