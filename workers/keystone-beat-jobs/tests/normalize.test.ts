import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { normalizeApifyItem, fingerprintForUrl, normalizeXUrl } from "../src/normalize.ts";

describe("normalize", () => {
  it("maps Apify-like item to Beat candidate with x_embed", () => {
    const c = normalizeApifyItem({
      id: "1234567890123456789",
      url: "https://twitter.com/Eagles/status/1234567890123456789?s=20",
      text: "The Eagles have activated a player from IR.",
      createdAt: new Date().toISOString(),
      author: { userName: "Eagles", verified: true },
      isRetweet: false,
    });
    assert.ok(c);
    assert.equal(c!.mediaType, "x_embed");
    assert.equal(c!.sourceTier, "official_team_league");
    assert.equal(c!.teamSlug, "eagles");
    assert.equal(c!.duplicateFingerprint, "x:1234567890123456789");
    assert.match(c!.originalUrl, /x\.com\/Eagles\/status\/1234567890123456789/);
  });

  it("normalizes twitter.com → x.com and strips tracking", () => {
    const u = normalizeXUrl("https://twitter.com/steelers/status/1111111111111111111?utm_source=share&s=20");
    assert.equal(u, "https://x.com/steelers/status/1111111111111111111");
  });

  it("fingerprints by status id", () => {
    assert.equal(fingerprintForUrl("https://x.com/a/status/9999999999999999999"), "x:9999999999999999999");
  });

  it("marks unknown handles as aggregator", () => {
    const c = normalizeApifyItem({
      id_str: "2222222222222222222",
      text: "Random fan take about the Phillies bullpen today",
      createdAt: new Date().toISOString(),
      author: { userName: "randomfan99" },
    });
    assert.ok(c);
    assert.equal(c!.sourceTier, "aggregator");
    assert.equal(c!.mediaType, "x_embed");
  });
});
