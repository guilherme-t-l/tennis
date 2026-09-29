import { describe, expect, it } from "vitest";
import { buildPrompts, type PromptAvailability } from "@/lib/domain/prompts";

const now = new Date("2026-09-27T15:00:00.000Z");
const saturday = new Date("2026-10-03T13:00:00.000Z");

function availability(name: string, startsAt: Date): PromptAvailability {
  return {
    profileId: name.toLowerCase(),
    name,
    locationId: "belvedere",
    locationName: "Belvedere",
    format: "singles",
    startsAt,
    endsAt: new Date(startsAt.getTime() + 2 * 60 * 60 * 1000),
  };
}

describe("buildPrompts", () => {
  it("talks about frequency, a first match, a stale opponent, and someone who is free", () => {
    expect(buildPrompts({ matchesLast30d: 3, lastPlayedByOpponent: [], connectionAvailabilities: [], now })[0].text).toBe(
      "You've played 3 times in the last 30 days",
    );
    const first = buildPrompts({ matchesLast30d: 0, lastPlayedByOpponent: [], connectionAvailabilities: [], now });
    expect(first[0].text).toBe("Fix your first match this month");
    expect(first[0].cta).toBe("Fix a match");
    const stale = buildPrompts({
      matchesLast30d: 1,
      lastPlayedByOpponent: [{ id: "pedro", name: "Pedro", lastPlayedAt: new Date(now.getTime() - 25 * 86_400_000) }],
      connectionAvailabilities: [],
      now,
    });
    expect(stale.some((prompt) => prompt.text === "You haven't played Pedro in 3 weeks")).toBe(true);
    const free = buildPrompts({
      matchesLast30d: 1,
      lastPlayedByOpponent: [],
      connectionAvailabilities: [availability("João", saturday)],
      now,
    });
    expect(free[0].text).toBe("João is available Saturday at Belvedere");
  });

  it("returns at most three prompts, availability then frequency then a stale opponent", () => {
    const prompts = buildPrompts({
      matchesLast30d: 4,
      lastPlayedByOpponent: [
        { id: "pedro", name: "Pedro", lastPlayedAt: new Date(now.getTime() - 25 * 86_400_000) },
        { id: "joao", name: "João", lastPlayedAt: new Date(now.getTime() - 5 * 86_400_000) },
      ],
      connectionAvailabilities: [
        availability("Ana", new Date("2026-10-04T13:00:00.000Z")),
        availability("João", saturday),
        availability("Bia", new Date("2026-10-02T13:00:00.000Z")),
        availability("Caio", new Date("2026-10-05T13:00:00.000Z")),
      ],
      now,
    });
    expect(prompts.length).toBeLessThanOrEqual(3);
    expect(prompts).toHaveLength(3);
    expect(prompts.map((prompt) => prompt.text)).toEqual([
      "Bia is available Friday at Belvedere",
      "João is available Saturday at Belvedere",
      "Ana is available Sunday at Belvedere",
    ]);

    const ordered = buildPrompts({
      matchesLast30d: 4,
      lastPlayedByOpponent: [{ id: "pedro", name: "Pedro", lastPlayedAt: new Date(now.getTime() - 25 * 86_400_000) }],
      connectionAvailabilities: [availability("João", saturday)],
      now,
    });
    expect(ordered.map((prompt) => prompt.text)).toEqual([
      "João is available Saturday at Belvedere",
      "You've played 4 times in the last 30 days",
      "You haven't played Pedro in 3 weeks",
    ]);
  });
});
