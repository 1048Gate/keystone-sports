import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  filterCandidate,
  isRetweetText,
  isTooOld,
  isJunkOrPromo,
} from "../src/filter.ts";

describe("filter", () => {
  it("rejects retweets", () => {
    assert.equal(isRetweetText("RT @Eagles: big news"), true);
    assert.equal(
      filterCandidate({
        text: "RT @Eagles: hello",
        timestamp: new Date().toISOString(),
        originalUrl: "https://x.com/x/status/1234567890123456789",
        sourceTier: "aggregator",
        relevanceScore: 60,
        isRetweet: true,
      }),
      "retweet",
    );
  });

  it("rejects old tweets (>36h)", () => {
    const old = new Date(Date.now() - 40 * 3600_000).toISOString();
    assert.equal(isTooOld(old), true);
    assert.equal(
      filterCandidate({
        text: "Eagles activate star WR",
        timestamp: old,
        originalUrl: "https://x.com/Eagles/status/1234567890123456789",
        sourceTier: "official_team_league",
        relevanceScore: 90,
      }),
      "old",
    );
  });

  it("rejects giveaways / merch / gambling", () => {
    assert.equal(isJunkOrPromo("RT to win free tickets and merch"), true);
    assert.equal(
      filterCandidate({
        text: "DraftKings odds for Eagles this week",
        timestamp: new Date().toISOString(),
        originalUrl: "https://x.com/spam/status/1234567890123456789",
        sourceTier: "aggregator",
        relevanceScore: 60,
      }),
      "gambling",
    );
  });

  it("requires aggregator relevance >= 55", () => {
    assert.equal(
      filterCandidate({
        text: "Interesting Eagles note from practice today about the offensive line",
        timestamp: new Date().toISOString(),
        originalUrl: "https://x.com/fan/status/1234567890123456789",
        sourceTier: "aggregator",
        relevanceScore: 40,
      }),
      "aggregator_bar",
    );
  });

  it("passes strong recent official tweet", () => {
    assert.equal(
      filterCandidate({
        text: "The Eagles have activated WR on the 53-man roster",
        timestamp: new Date().toISOString(),
        originalUrl: "https://x.com/Eagles/status/1234567890123456789",
        sourceTier: "official_team_league",
        relevanceScore: 92,
      }),
      "ok",
    );
  });
});
