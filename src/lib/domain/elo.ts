// New rating after a confirmed singles result.
// Doubles results are stored and do not change ratings.
// Each player uses their own K: 40 until five rated matches, then 24.

import type { Format } from "@/lib/firestore/types";

// Chance that A beats B, from the rating gap.
export function expectedScore(ratingA: number, ratingB: number): number {
  return 1 / (1 + 10 ** ((ratingB - ratingA) / 400));
}

// 40 points until five rated matches, then 24.
export function kFactor(ratedMatches: number): number {
  return ratedMatches < 5 ? 40 : 24;
}

export type AppliedResult = {
  ratingA: number;
  ratingB: number;
  deltaA: number;
  deltaB: number;
};

// Confirmed singles moves both ratings. Doubles leaves them unchanged.
export function applyResult(input: {
  ratingA: number;
  ratingB: number;
  ratedMatchesA: number;
  ratedMatchesB: number;
  winner: "A" | "B";
  format: Format;
}): AppliedResult {
  if (input.format === "doubles") {
    return {
      ratingA: input.ratingA,
      ratingB: input.ratingB,
      deltaA: 0,
      deltaB: 0,
    };
  }
  const expectedA = expectedScore(input.ratingA, input.ratingB);
  const expectedB = expectedScore(input.ratingB, input.ratingA);
  const scoreA = input.winner === "A" ? 1 : 0;
  const scoreB = input.winner === "B" ? 1 : 0;
  const ratingA = Math.round(input.ratingA + kFactor(input.ratedMatchesA) * (scoreA - expectedA));
  const ratingB = Math.round(input.ratingB + kFactor(input.ratedMatchesB) * (scoreB - expectedB));
  return {
    ratingA,
    ratingB,
    deltaA: ratingA - input.ratingA,
    deltaB: ratingB - input.ratingB,
  };
}
