import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  scoreTweet,
  scoreBandForRelevance,
  recommendCategory,
  shouldDiscardByScore,
} from "../src/score.ts";

describe("score", () => {
  it("maps bands correctly", () => {
    assert.equal(scoreBandForRelevance(95), "breaking");
    assert.equal(scoreBandForRelevance(80), "injury_trade");
    assert.equal(scoreBandForRelevance(60), "strong_reporting");
    assert.equal(scoreBandForRelevance(40), "interview_highlight");
    assert.equal(scoreBandForRelevance(25), "reaction");
    assert.equal(scoreBandForRelevance(10), "discard");
  });

  it("scores official breaking high", () => {
    const s = scoreTweet({
      sourceTier: "official_team_league",
      verifiedOfficial: true,
      text: "BREAKING: Eagles have signed free agent WR",
      category: "breaking",
    });
    assert.ok(s >= 90, `expected >=90 got ${s}`);
    assert.equal(recommendCategory("BREAKING: signed free agent"), "breaking");
  });

  it("caps aggregators and discards low scores", () => {
    const s = scoreTweet({
      sourceTier: "aggregator",
      verifiedOfficial: false,
      text: "lol eagles fire",
      category: "reaction",
    });
    assert.ok(s <= 50);
    assert.equal(shouldDiscardByScore(15), true);
  });

  it("penalizes rumor language", () => {
    const base = scoreTweet({
      sourceTier: "reporter_original",
      verifiedOfficial: false,
      text: "Eagles injury report notes key player limited",
      category: "from_the_beat",
    });
    const rumor = scoreTweet({
      sourceTier: "reporter_original",
      verifiedOfficial: false,
      text: "Hearing rumor sources say Eagles could trade star",
      category: "from_the_beat",
    });
    assert.ok(rumor < base);
  });
});
