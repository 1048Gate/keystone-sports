import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { BeatItem, PublicBeatItem, BeatCategory } from "./types";
import { BEAT_CATEGORIES } from "./types";
import { selectPublicBeatItems } from "./order";
import { readBeatM1Flag } from "./flag";
import { classifyBeatMedia, normalizeBeatUrl } from "./allowlist";
import { beatDuplicateFingerprint } from "./fingerprint";

export type BeatDeskPayload = {
  enabled: boolean;
  generatedAt: string;
  items: PublicBeatItem[];
  /** Admin desk rows from D1 (pending + approved + rejected). Fixtures never appear here in prod. */
  adminItems?: BeatItem[];
  source: "d1" | "empty";
};

const categorySchema = z.enum(["breaking", "from_the_beat", "watch", "locker_room", "reaction"]);

/** Accept Z or offset ISO timestamps from desk prompts / seed. */
const isoTimestamp = z.string().refine((v) => Number.isFinite(Date.parse(v)), "Invalid timestamp");
const isoTimestampOrNull = z.union([isoTimestamp, z.null()]);

async function tryDb() {
  const { db } = await import("../publishing/runtime.server");
  try {
    return db();
  } catch {
    return null;
  }
}

/** Public Beat strip — D1 approved/unexpired only. Never fixtures. */
export const getBeatDesk = createServerFn({ method: "GET" }).handler(async (): Promise<BeatDeskPayload> => {
  const { runtime } = await import("../publishing/runtime.server");
  const enabled = readBeatM1Flag(runtime() as unknown as Record<string, unknown>);
  const generatedAt = new Date().toISOString();
  if (!enabled) {
    return { enabled: false, generatedAt, items: [], source: "empty" };
  }
  const database = await tryDb();
  if (!database) {
    return { enabled: true, generatedAt, items: [], source: "empty" };
  }
  try {
    const { listPublicBeatRows } = await import("./db.server");
    const rows = await listPublicBeatRows(database);
    return {
      enabled: true,
      generatedAt,
      items: selectPublicBeatItems(rows),
      source: "d1",
    };
  } catch {
    // Missing table / migration not applied yet → empty, never fixtures.
    return { enabled: true, generatedAt, items: [], source: "empty" };
  }
});

export const getBeatAdminDesk = createServerFn({ method: "GET" }).handler(async (): Promise<BeatDeskPayload> => {
  const { runtime, identity } = await import("../publishing/runtime.server");
  const user = identity();
  const generatedAt = new Date().toISOString();
  if (!user.admin) {
    return { enabled: false, generatedAt, items: [], source: "empty" };
  }
  const enabled = readBeatM1Flag(runtime() as unknown as Record<string, unknown>);
  const database = await tryDb();
  if (!database) {
    return { enabled, generatedAt, items: [], adminItems: [], source: "empty" };
  }
  try {
    const { listBeatItems, listPublicBeatRows } = await import("./db.server");
    const adminItems = await listBeatItems(database);
    const publicRows = await listPublicBeatRows(database);
    return {
      enabled,
      generatedAt,
      items: selectPublicBeatItems(publicRows),
      adminItems,
      source: "d1",
    };
  } catch {
    return { enabled, generatedAt, items: [], adminItems: [], source: "empty" };
  }
});

const mutateSchema = z.object({
  id: z.string().min(1).max(80),
  action: z.enum(["approve", "reject", "pin", "unpin", "set_expiration", "edit_context", "change_category"]),
  context: z.string().trim().max(2000).optional(),
  category: categorySchema.optional(),
  expiresAt: isoTimestampOrNull.optional(),
});

export const mutateBeatItem = createServerFn({ method: "POST" })
  .validator((input) => mutateSchema.parse(input))
  .handler(async ({ data }) => {
    const { db, requireAdmin, identity } = await import("../publishing/runtime.server");
    const adminId = requireAdmin();
    const database = db();
    const { patchBeatItem, getBeatItemById } = await import("./db.server");
    const existing = await getBeatItemById(database, data.id);
    if (!existing) throw new Error("Beat item not found.");

    const now = new Date().toISOString();
    if (data.action === "approve") {
      if (existing.category === "breaking" && !existing.expiresAt && data.expiresAt == null) {
        throw new Error("Breaking items require an expiration before approve.");
      }
      await patchBeatItem(database, data.id, {
        approvalStatus: "approved",
        approvedBy: identity().id ?? adminId,
        approvedAt: now,
        expiresAt: data.expiresAt !== undefined ? data.expiresAt : existing.expiresAt ?? null,
      });
    } else if (data.action === "reject") {
      await patchBeatItem(database, data.id, {
        approvalStatus: "rejected",
        approvedBy: null,
        approvedAt: null,
      });
    } else if (data.action === "pin") {
      await patchBeatItem(database, data.id, { pinned: true });
    } else if (data.action === "unpin") {
      await patchBeatItem(database, data.id, { pinned: false });
    } else if (data.action === "set_expiration") {
      if (data.expiresAt === undefined) throw new Error("expiresAt required.");
      await patchBeatItem(database, data.id, { expiresAt: data.expiresAt });
    } else if (data.action === "edit_context") {
      if (data.context === undefined) throw new Error("context required.");
      await patchBeatItem(database, data.id, { context: data.context });
    } else if (data.action === "change_category") {
      if (!data.category || !BEAT_CATEGORIES.includes(data.category)) throw new Error("category required.");
      await patchBeatItem(database, data.id, { category: data.category as BeatCategory });
    }
    return { ok: true as const, id: data.id };
  });

const createSchema = z.object({
  source: z.string().trim().min(1).max(120),
  sourceTier: z.enum(["official_team_league", "reporter_original", "broadcaster_publication", "aggregator"]),
  authorAccount: z.string().trim().min(1).max(120),
  teamSlug: z.string().trim().max(40).nullable().optional(),
  league: z.string().trim().max(20).nullable().optional(),
  category: categorySchema,
  headline: z.string().trim().min(1).max(240),
  context: z.string().trim().max(2000).optional(),
  originalUrl: z.string().url().max(500),
  timestamp: isoTimestamp.optional(),
  verifiedOfficial: z.boolean().optional(),
  expiresAt: isoTimestampOrNull.optional(),
  pinned: z.boolean().optional(),
  /** Always pending unless explicitly approved later via mutate. */
  approveNow: z.boolean().optional(),
});

export const createBeatItem = createServerFn({ method: "POST" })
  .validator((input) => createSchema.parse(input))
  .handler(async ({ data }) => {
    const { db, requireAdmin, identity } = await import("../publishing/runtime.server");
    const adminId = requireAdmin();
    const database = db();
    const { upsertBeatItem } = await import("./db.server");
    const originalUrl = normalizeBeatUrl(data.originalUrl) ?? data.originalUrl;
    const media = classifyBeatMedia(originalUrl);
    const approveNow = Boolean(data.approveNow);
    if (approveNow && data.category === "breaking" && !data.expiresAt) {
      throw new Error("Breaking items require expiresAt before approve.");
    }
    const now = new Date().toISOString();
    const result = await upsertBeatItem(database, {
      source: data.source,
      sourceTier: data.sourceTier,
      authorAccount: data.authorAccount,
      teamSlug: data.teamSlug,
      league: data.league,
      category: data.category,
      headline: data.headline,
      context: data.context,
      originalUrl,
      embedUrl: media.embedUrl,
      embedId: media.embedId,
      timestamp: data.timestamp ?? now,
      mediaType: media.mediaType,
      verifiedOfficial: data.verifiedOfficial,
      expiresAt: data.expiresAt ?? null,
      approvalStatus: approveNow ? "approved" : "pending",
      approvalMode: "manual",
      approvedBy: approveNow ? identity().id ?? adminId : null,
      approvedAt: approveNow ? now : null,
      pinned: data.pinned,
      duplicateFingerprint: beatDuplicateFingerprint({
        originalUrl,
        teamSlug: data.teamSlug,
        headline: data.headline,
      }),
      createdBy: adminId,
    });
    return result;
  });

/** Manual discovery — inserts pending candidates only (never auto-publishes). */
export const discoverBeatCandidates = createServerFn({ method: "POST" })
  .validator((input) => z.object({ dryRun: z.boolean().optional(), perAccountLimit: z.number().int().min(1).max(5).optional() }).parse(input ?? {}))
  .handler(async ({ data }) => {
    const { db, requireAdmin } = await import("../publishing/runtime.server");
    const adminId = requireAdmin();
    const database = db();
    const { existingBeatFingerprints, upsertBeatItem } = await import("./db.server");
    const { discoverPaBeatCandidates } = await import("./discovery");
    const fingerprints = await existingBeatFingerprints(database);
    // Dedupe vs recent Keystone News links when available.
    let newsUrls: string[] = [];
    try {
      const news = await database
        .prepare(`SELECT body FROM posts WHERE published = 1 ORDER BY updated_at DESC LIMIT 50`)
        .all<{ body: string }>();
      newsUrls = news.results
        .flatMap((r) => r.body.match(/https?:\/\/[^\s)]+/g) ?? [])
        .slice(0, 100);
    } catch {
      /* posts table may lack matching rows — fine */
    }
    const discovered = await discoverPaBeatCandidates({
      existingFingerprints: fingerprints,
      newsUrls,
      perAccountLimit: data.perAccountLimit ?? 2,
    });
    if (data.dryRun) {
      return {
        dryRun: true as const,
        inserted: 0,
        candidates: discovered.candidates,
        skippedDuplicates: discovered.skippedDuplicates,
        errors: discovered.errors,
      };
    }
    let inserted = 0;
    for (const c of discovered.candidates) {
      try {
        await upsertBeatItem(database, {
          source: c.source,
          sourceTier: c.sourceTier,
          authorAccount: c.account,
          teamSlug: c.teamSlug,
          league: c.league,
          category: c.categoryRecommendation,
          headline: c.headline,
          context: c.suggestedContext,
          originalUrl: c.originalUrl,
          embedUrl: c.embedUrl,
          embedId: c.embedId,
          oembedHtml: c.oembedHtml,
          timestamp: c.timestamp,
          mediaType: c.mediaType,
          verifiedOfficial: c.verifiedOfficial,
          expiresAt: c.proposedExpiration ?? null,
          approvalStatus: "pending",
          approvalMode: "manual",
          relevanceScore: c.relevanceScore,
          duplicateFingerprint: c.duplicateFingerprint,
          createdBy: `discover:${adminId}`,
        });
        inserted += 1;
      } catch (err) {
        discovered.errors.push(err instanceof Error ? err.message : String(err));
      }
    }
    return {
      dryRun: false as const,
      inserted,
      candidates: discovered.candidates,
      skippedDuplicates: discovered.skippedDuplicates,
      errors: discovered.errors,
    };
  });
