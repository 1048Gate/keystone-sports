/** Header-only auto-recap auth. Never accept or log the secret from the URL. */

export const RECAP_SECRET_URL_ERROR = "Send the secret as a header, not the URL.";
export const RECAP_SECRET_MISSING_ERROR =
  "Missing secret. Send Authorization: Bearer <secret> or X-Keystone-Secret.";
export const RECAP_SECRET_DENIED_ERROR = "Auto-recap is not enabled, or the secret is wrong.";

export function queryHasSecret(searchParams: URLSearchParams): boolean {
  return searchParams.has("secret");
}

export function secretFromHeaders(headers: Headers): string {
  const direct = headers.get("x-keystone-secret")?.trim() ?? "";
  if (direct) return direct;
  const auth = headers.get("authorization")?.trim() ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(auth);
  return match?.[1]?.trim() ?? "";
}

/** Constant-time compare. Empty expected never matches. */
export function secretsEqual(provided: string, expected: string): boolean {
  if (!expected || !provided) return false;
  const enc = new TextEncoder();
  const a = enc.encode(provided);
  const b = enc.encode(expected);
  const len = Math.max(a.length, b.length);
  let diff = a.length === b.length ? 0 : 1;
  for (let i = 0; i < len; i++) diff |= (a[i] ?? 0) ^ (b[i] ?? 0);
  return diff === 0;
}
