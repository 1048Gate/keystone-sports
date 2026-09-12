import { describe, it, after } from "node:test";
import assert from "node:assert/strict";
import { writePendingCandidates } from "../src/write.ts";
import type { BeatCandidate, Env } from "../src/types.ts";

/** Minimal D1Database mock for testing. */
function makeMockDb(opts: { existingUrl?: string; existingFingerprint?: string } = {}) {
  const rows: Record<string, unknown>[] = [];
  if (opts.existingUrl) {
    rows.push({ id: "existing_1", original_url: opts.existingUrl, duplicate_fingerprint: null });
  }
  if (opts.existingFingerprint) {
    rows.push({ id: "existing_2", original_url: "https://example.com/other", duplicate_fingerprint: opts.existingFingerprint });
  }

  return {
    prepare: (sql: string) => ({
      bind: (..._vals: unknown[]) => ({
        first: async <T = Record<string, unknown>>(): Promise<T | null> => {
          // Check for existing URL or fingerprint
          if (/original_url = \?/.test(sql) && /duplicate_fingerprint = \?/.test(sql)) {
            // Worker's writeViaD1 dedupe check
            for (const r of rows) {
              if (r.original_url === _vals[0] || r.duplicate_fingerprint === _vals[1]) {
                return r as T;
              }
            }
            return null;
          }
          return null;
        },
        all: async <T = Record<string, unknown>>() => ({ results: [] as T[] }),
        run: async () => {
          rows.push({ id: "new_1", original_url: _vals[0], duplicate_fingerprint: _vals[1] });
          return {};
        },
      }),
      first: async <T = Record<string, unknown>>(): Promise<T | null> => null,
      all: async <T = Record<string, unknown>>() => ({ results: [] as T[] }),
      run: async () => ({}),
    }),
    batch: async (stmts: unknown[]) => stmts.map(() => ({})),
  };
}

function makeCandidate(overrides: Partial<BeatCandidate> = {}): BeatCandidate {
  return {
    originalUrl: "https://x.com/Eagles/status/1234567890123456789",
    account: "@Eagles",
    teamSlug: "eagles",
    league: "NFL",
    category: "breaking",
    headline: "Test headline",
    suggestedContext: "Test context",
    source: "@Eagles",
    sourceTier: "official_team_league",
    verifiedOfficial: true,
    timestamp: new Date().toISOString(),
    mediaType: "x_embed",
    embedUrl: "https://x.com/i/status/1234567890123456789",
    embedId: "1234567890123456789",
    relevanceScore: 85,
    duplicateFingerprint: "x:1234567890123456789",
    text: "Test text",
    ...overrides,
  };
}

const originalFetch = globalThis.fetch;

describe("writePendingCandidates", () => {
  after(() => {
    globalThis.fetch = originalFetch;
  });

  describe("no D1 fallback when fallback disabled (secret configured)", () => {
    it("returns failed (not d1_direct) when HTTP returns 401", async () => {
      globalThis.fetch = (async () =>
        new Response(JSON.stringify({ ok: false, code: "AUTH_FAILED" }), {
          status: 401,
          headers: { "content-type": "application/json" },
        })) as typeof fetch;

      const env = {
        DB: makeMockDb() as unknown as D1Database,
        KEYSTONE_BEAT_INGEST_SECRET: "test-secret",
      } as Env;

      const result = await writePendingCandidates(env, [makeCandidate()]);

      assert.equal(result.path, "failed");
      assert.equal(result.pendingWritten, 0);
      assert.equal(result.errors.length, 1);
      assert.match(result.errors[0], /INGEST_REJECTED/);
    });

    it("returns failed (not d1_direct) when HTTP returns 422", async () => {
      globalThis.fetch = (async () =>
        new Response(JSON.stringify({ ok: false, code: "VALIDATION_FAILED" }), {
          status: 422,
          headers: { "content-type": "application/json" },
        })) as typeof fetch;

      const env = {
        DB: makeMockDb() as unknown as D1Database,
        KEYSTONE_BEAT_INGEST_SECRET: "test-secret",
      } as Env;

      const result = await writePendingCandidates(env, [makeCandidate()]);

      assert.equal(result.path, "failed");
      assert.equal(result.pendingWritten, 0);
    });

    it("returns failed (not d1_direct) when HTTP returns 500", async () => {
      globalThis.fetch = (async () =>
        new Response(JSON.stringify({ ok: false, code: "INGEST_UNAVAILABLE" }), {
          status: 500,
          headers: { "content-type": "application/json" },
        })) as typeof fetch;

      const env = {
        DB: makeMockDb() as unknown as D1Database,
        KEYSTONE_BEAT_INGEST_SECRET: "test-secret",
      } as Env;

      const result = await writePendingCandidates(env, [makeCandidate()]);

      assert.equal(result.path, "failed");
      assert.equal(result.pendingWritten, 0);
      assert.match(result.errors[0], /INGEST_UNAVAILABLE/);
    });

    it("does not write to D1 when HTTP ingest fails and fallback is disabled", async () => {
      let d1WriteCount = 0;
      const mockDb = makeMockDb();
      mockDb.prepare = (sql: string) => ({
        bind: (..._vals: unknown[]) => ({
          first: async <T = Record<string, unknown>>(): Promise<T | null> => {
            if (/original_url = \?/.test(sql) && /duplicate_fingerprint = \?/.test(sql)) {
              return null;
            }
            return null;
          },
          all: async <T = Record<string, unknown>>() => ({ results: [] as T[] }),
          run: async () => {
            d1WriteCount += 1;
            return {};
          },
        }),
        first: async <T = Record<string, unknown>>(): Promise<T | null> => null,
        all: async <T = Record<string, unknown>>() => ({ results: [] as T[] }),
        run: async () => { d1WriteCount += 1; return {}; },
      });

      globalThis.fetch = (async () =>
        new Response(JSON.stringify({ ok: false, code: "AUTH_FAILED" }), {
          status: 401,
          headers: { "content-type": "application/json" },
        })) as typeof fetch;

      const env = {
        DB: mockDb as unknown as D1Database,
        KEYSTONE_BEAT_INGEST_SECRET: "test-secret",
      } as Env;

      const result = await writePendingCandidates(env, [makeCandidate()]);

      assert.equal(result.path, "failed", "path must be exactly 'failed', not 'd1_direct'");
      assert.equal(d1WriteCount, 0, "D1 must not be written when HTTP fails and fallback is disabled");
    });
  });

  describe("D1 fallback when KEYSTONE_ALLOW_DIRECT_D1_FALLBACK=true (secret configured)", () => {
    it("falls back to D1 on HTTP 401 when fallback is enabled", async () => {
      let d1WriteCount = 0;
      const mockDb = makeMockDb();
      mockDb.prepare = (sql: string) => ({
        bind: (..._vals: unknown[]) => ({
          first: async <T = Record<string, unknown>>(): Promise<T | null> => {
            if (/original_url = \?/.test(sql) && /duplicate_fingerprint = \?/.test(sql)) {
              return null;
            }
            return null;
          },
          all: async <T = Record<string, unknown>>() => ({ results: [] as T[] }),
          run: async () => { d1WriteCount += 1; return {}; },
        }),
        first: async <T = Record<string, unknown>>(): Promise<T | null> => null,
        all: async <T = Record<string, unknown>>() => ({ results: [] as T[] }),
        run: async () => { d1WriteCount += 1; return {}; },
      });

      globalThis.fetch = (async () =>
        new Response(JSON.stringify({ ok: false, code: "AUTH_FAILED" }), {
          status: 401,
          headers: { "content-type": "application/json" },
        })) as typeof fetch;

      const env = {
        DB: mockDb as unknown as D1Database,
        KEYSTONE_BEAT_INGEST_SECRET: "test-secret",
        KEYSTONE_ALLOW_DIRECT_D1_FALLBACK: "true",
      } as Env;

      const result = await writePendingCandidates(env, [makeCandidate()]);

      assert.equal(result.path, "d1_direct", "path must be exactly 'd1_direct' when fallback is enabled and HTTP fails");
      assert.ok(d1WriteCount > 0, "D1 must be written when fallback is enabled and HTTP fails");
    });

    it("falls back to D1 on HTTP 500 when fallback is enabled", async () => {
      globalThis.fetch = (async () =>
        new Response(JSON.stringify({ ok: false, code: "INGEST_UNAVAILABLE" }), {
          status: 500,
          headers: { "content-type": "application/json" },
        })) as typeof fetch;

      const env = {
        DB: makeMockDb() as unknown as D1Database,
        KEYSTONE_BEAT_INGEST_SECRET: "test-secret",
        KEYSTONE_ALLOW_DIRECT_D1_FALLBACK: "true",
      } as Env;

      const result = await writePendingCandidates(env, [makeCandidate()]);

      assert.equal(result.path, "d1_direct", "path must be exactly 'd1_direct' when fallback is enabled and HTTP 500");
    });

    it("falls back to D1 on network error when fallback is enabled", async () => {
      globalThis.fetch = (async () => {
        throw new TypeError("fetch failed");
      }) as typeof fetch;

      const env = {
        DB: makeMockDb() as unknown as D1Database,
        KEYSTONE_BEAT_INGEST_SECRET: "test-secret",
        KEYSTONE_ALLOW_DIRECT_D1_FALLBACK: "true",
      } as Env;

      const result = await writePendingCandidates(env, [makeCandidate()]);

      assert.equal(result.path, "d1_direct", "path must be exactly 'd1_direct' when fallback is enabled and network error");
    });

    it("falls back to D1 on timeout when fallback is enabled", async () => {
      globalThis.fetch = (async (_url: string, opts: RequestInit) => {
        const signal = opts.signal as AbortSignal;
        if (signal) {
          throw new DOMException("Aborted", "AbortError");
        }
        throw new Error("No signal");
      }) as typeof fetch;

      const env = {
        DB: makeMockDb() as unknown as D1Database,
        KEYSTONE_BEAT_INGEST_SECRET: "test-secret",
        KEYSTONE_ALLOW_DIRECT_D1_FALLBACK: "true",
        KEYSTONE_INGEST_TIMEOUT_MS: "3000",
      } as Env;

      const result = await writePendingCandidates(env, [makeCandidate()]);

      assert.equal(result.path, "d1_direct", "path must be exactly 'd1_direct' when fallback is enabled and timeout");
    });
  });

  describe("no ingest secret configured", () => {
    it("fails closed with INGEST_NOT_CONFIGURED when fallback is disabled", async () => {
      const env = {
        DB: makeMockDb() as unknown as D1Database,
      } as Env;

      const result = await writePendingCandidates(env, [makeCandidate()]);

      assert.equal(result.path, "failed", "path must be exactly 'failed' when no secret and no fallback");
      assert.equal(result.pendingWritten, 0);
      assert.equal(result.errors.length, 1);
      assert.equal(result.errors[0], "INGEST_NOT_CONFIGURED");
    });

    it("uses D1 directly when no secret but KEYSTONE_ALLOW_DIRECT_D1_FALLBACK=true", async () => {
      const env = {
        DB: makeMockDb() as unknown as D1Database,
        KEYSTONE_ALLOW_DIRECT_D1_FALLBACK: "true",
      } as Env;

      const result = await writePendingCandidates(env, [makeCandidate()]);

      assert.equal(result.path, "d1_direct", "path must be exactly 'd1_direct' when no secret but fallback enabled");
      assert.ok(result.pendingWritten > 0, "should have written at least one candidate");
    });
  });

  describe("timeout handling (fallback disabled)", () => {
    it("returns INGEST_TIMEOUT when fetch is aborted", async () => {
      globalThis.fetch = (async (_url: string, opts: RequestInit) => {
        const signal = opts.signal as AbortSignal;
        if (signal) {
          throw new DOMException("Aborted", "AbortError");
        }
        throw new Error("No signal");
      }) as typeof fetch;

      const env = {
        DB: makeMockDb() as unknown as D1Database,
        KEYSTONE_BEAT_INGEST_SECRET: "test-secret",
        KEYSTONE_INGEST_TIMEOUT_MS: "3000",
      } as Env;

      const result = await writePendingCandidates(env, [makeCandidate()]);

      assert.equal(result.path, "failed");
      assert.equal(result.errors.length, 1);
      assert.equal(result.errors[0], "INGEST_TIMEOUT");
    });
  });

  describe("stable error codes", () => {
    it("classifies 401 as INGEST_REJECTED", async () => {
      globalThis.fetch = (async () =>
        new Response("{}", { status: 401, headers: { "content-type": "application/json" } })) as typeof fetch;

      const env = {
        DB: makeMockDb() as unknown as D1Database,
        KEYSTONE_BEAT_INGEST_SECRET: "test-secret",
      } as Env;

      const result = await writePendingCandidates(env, [makeCandidate()]);
      assert.match(result.errors[0], /INGEST_REJECTED/);
    });

    it("classifies 500 as INGEST_UNAVAILABLE", async () => {
      globalThis.fetch = (async () =>
        new Response("{}", { status: 500, headers: { "content-type": "application/json" } })) as typeof fetch;

      const env = {
        DB: makeMockDb() as unknown as D1Database,
        KEYSTONE_BEAT_INGEST_SECRET: "test-secret",
      } as Env;

      const result = await writePendingCandidates(env, [makeCandidate()]);
      assert.match(result.errors[0], /INGEST_UNAVAILABLE/);
    });

    it("classifies network error as INGEST_UNAVAILABLE", async () => {
      globalThis.fetch = (async () => {
        throw new TypeError("fetch failed");
      }) as typeof fetch;

      const env = {
        DB: makeMockDb() as unknown as D1Database,
        KEYSTONE_BEAT_INGEST_SECRET: "test-secret",
      } as Env;

      const result = await writePendingCandidates(env, [makeCandidate()]);
      assert.match(result.errors[0], /INGEST_UNAVAILABLE/);
    });
  });

  describe("successful HTTP ingest", () => {
    it("returns http_ingest path on success", async () => {
      globalThis.fetch = (async () =>
        new Response(
          JSON.stringify({
            ok: true,
            inserted: 1,
            skippedDuplicates: 0,
            discarded: 0,
            errors: [],
            items: [{ originalUrl: "https://x.com/Eagles/status/1234567890123456789", relevanceScore: 85 }],
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        )) as typeof fetch;

      const env = {
        DB: makeMockDb() as unknown as D1Database,
        KEYSTONE_BEAT_INGEST_SECRET: "test-secret",
      } as Env;

      const result = await writePendingCandidates(env, [makeCandidate()]);

      assert.equal(result.path, "http_ingest");
      assert.equal(result.pendingWritten, 1);
    });

    it("does not fall back to D1 on HTTP success even with fallback enabled", async () => {
      globalThis.fetch = (async () =>
        new Response(
          JSON.stringify({
            ok: true,
            inserted: 1,
            skippedDuplicates: 0,
            discarded: 0,
            errors: [],
            items: [{ originalUrl: "https://x.com/Eagles/status/1234567890123456789", relevanceScore: 85 }],
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        )) as typeof fetch;

      const env = {
        DB: makeMockDb() as unknown as D1Database,
        KEYSTONE_BEAT_INGEST_SECRET: "test-secret",
        KEYSTONE_ALLOW_DIRECT_D1_FALLBACK: "true",
      } as Env;

      const result = await writePendingCandidates(env, [makeCandidate()]);

      assert.equal(result.path, "http_ingest", "should not fall back to D1 when HTTP succeeds");
    });
  });

  describe("empty candidates", () => {
    it("returns http_ingest with zero result for empty list (secret configured)", async () => {
      const env = {
        DB: makeMockDb() as unknown as D1Database,
        KEYSTONE_BEAT_INGEST_SECRET: "test-secret",
      } as Env;

      const result = await writePendingCandidates(env, []);

      assert.equal(result.pendingWritten, 0);
      assert.equal(result.errors.length, 0);
      assert.equal(result.path, "http_ingest");
    });

    it("returns failed for empty list when no secret configured (fail closed)", async () => {
      const env = {
        DB: makeMockDb() as unknown as D1Database,
      } as Env;

      const result = await writePendingCandidates(env, []);

      assert.equal(result.path, "failed", "empty list with no secret should fail closed");
    });
  });
});
