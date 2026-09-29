import { describe, expect, it } from "vitest";
import { applyResult, expectedScore, kFactor } from "@/lib/domain/elo";

describe("expectedScore", () => {
  it("is even when ratings match and about 0.2403 when 1500 faces 1700", () => {
    expect(expectedScore(1500, 1500)).toBe(0.5);
    expect(expectedScore(1500, 1700)).toBeCloseTo(0.2403, 3);
  });
});

describe("kFactor", () => {
  it("stays at 40 until the fifth rated match", () => {
    for (const ratedMatches of [0, 1, 2, 3, 4]) expect(kFactor(ratedMatches)).toBe(40);
    expect(kFactor(5)).toBe(24);
  });
});

describe("applyResult", () => {
  it("matches the reference singles results", () => {
    expect(applyResult({ ratingA: 1500, ratingB: 1500, ratedMatchesA: 5, ratedMatchesB: 5, winner: "A", format: "singles" })).toMatchObject({ ratingA: 1512, ratingB: 1488 });
    expect(applyResult({ ratingA: 1500, ratingB: 1700, ratedMatchesA: 5, ratedMatchesB: 5, winner: "A", format: "singles" })).toMatchObject({ ratingA: 1518, ratingB: 1682 });
    expect(applyResult({ ratingA: 1500, ratingB: 1700, ratedMatchesA: 5, ratedMatchesB: 5, winner: "B", format: "singles" })).toMatchObject({ ratingA: 1494, ratingB: 1706 });
    expect(applyResult({ ratingA: 1500, ratingB: 1500, ratedMatchesA: 0, ratedMatchesB: 5, winner: "A", format: "singles" })).toMatchObject({ ratingA: 1520, ratingB: 1488 });
  });

  it("sums to zero when both players use the same K", () => {
    const applied = applyResult({ ratingA: 1500, ratingB: 1500, ratedMatchesA: 5, ratedMatchesB: 5, winner: "A", format: "singles" });
    expect(applied.deltaA + applied.deltaB).toBe(0);
  });

  it("never returns NaN", () => {
    const applied = applyResult({ ratingA: 1500, ratingB: 1700, ratedMatchesA: 0, ratedMatchesB: 9, winner: "B", format: "singles" });
    expect(Number.isNaN(applied.ratingA)).toBe(false);
    expect(Number.isNaN(applied.ratingB)).toBe(false);
  });

  it("leaves ratings unchanged for doubles", () => {
    expect(applyResult({ ratingA: 1500, ratingB: 1700, ratedMatchesA: 0, ratedMatchesB: 0, winner: "A", format: "doubles" })).toEqual({
      ratingA: 1500,
      ratingB: 1700,
      deltaA: 0,
      deltaB: 0,
    });
  });
});
