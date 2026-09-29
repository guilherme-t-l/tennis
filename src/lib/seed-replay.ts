// Replays the seeded singles results through the one rating rule so stored ratings stay consistent.

import { daysAgo } from "@/lib/dates";
import { applyResult } from "@/lib/domain/elo";

export type SeedRating = { rating: number; ratedMatches: number };

export type SeedReplayEvent = {
  id: "beat-pedro" | "beat-joao" | "lost-joao";
  when: Date;
  score: string;
  winner: "guilherme" | "joao" | "pedro";
  opponent: "joao" | "pedro";
  before: { guilherme: SeedRating; joao: SeedRating; pedro: SeedRating };
  after: { guilherme: SeedRating; joao: SeedRating; pedro: SeedRating };
};

const initial = {
  guilherme: { rating: 1500, ratedMatches: 0 },
  joao: { rating: 1520, ratedMatches: 0 },
  pedro: { rating: 1480, ratedMatches: 0 },
  lucas: { rating: 1650, ratedMatches: 0 },
};

export function replaySeedResults(now = new Date()): {
  guilherme: SeedRating;
  joao: SeedRating;
  pedro: SeedRating;
  lucas: SeedRating;
  events: SeedReplayEvent[];
} {
  let guilherme = { ...initial.guilherme };
  let joao = { ...initial.joao };
  let pedro = { ...initial.pedro };
  const events: SeedReplayEvent[] = [];

  const steps: Array<{
    id: SeedReplayEvent["id"];
    when: Date;
    score: string;
    left: "guilherme";
    right: "joao" | "pedro";
    winner: "A" | "B";
  }> = [
    { id: "beat-pedro", when: daysAgo(25, 10, 0, now), score: "6-3 6-4", left: "guilherme", right: "pedro", winner: "A" },
    { id: "beat-joao", when: daysAgo(10, 10, 0, now), score: "7-5 6-4", left: "guilherme", right: "joao", winner: "A" },
    { id: "lost-joao", when: daysAgo(5, 10, 0, now), score: "3-6 6-4 4-6", left: "guilherme", right: "joao", winner: "B" },
  ];

  for (const step of steps) {
    const before = {
      guilherme: { ...guilherme },
      joao: { ...joao },
      pedro: { ...pedro },
    };
    const right = step.right === "joao" ? joao : pedro;
    const applied = applyResult({
      ratingA: guilherme.rating,
      ratingB: right.rating,
      ratedMatchesA: guilherme.ratedMatches,
      ratedMatchesB: right.ratedMatches,
      winner: step.winner,
      format: "singles",
    });
    guilherme = { rating: applied.ratingA, ratedMatches: guilherme.ratedMatches + 1 };
    if (step.right === "joao") joao = { rating: applied.ratingB, ratedMatches: joao.ratedMatches + 1 };
    else pedro = { rating: applied.ratingB, ratedMatches: pedro.ratedMatches + 1 };
    events.push({
      id: step.id,
      when: step.when,
      score: step.score,
      winner: step.winner === "A" ? "guilherme" : step.right,
      opponent: step.right,
      before,
      after: { guilherme: { ...guilherme }, joao: { ...joao }, pedro: { ...pedro } },
    });
  }

  return { guilherme, joao, pedro, lucas: { ...initial.lucas }, events };
}
