import { describe, expect, it } from "vitest";
import { initialRating, isCompatibleLevel, levelForRating } from "@/lib/domain/level";

describe("initialRating", () => {
  it("starts beginners, intermediates, and advanced players at the set ratings", () => {
    expect(initialRating("beginner")).toBe(1200);
    expect(initialRating("intermediate")).toBe(1500);
    expect(initialRating("advanced")).toBe(1800);
  });
});

describe("levelForRating", () => {
  it("uses the band boundaries", () => {
    expect(levelForRating(1299)).toBe("Beginner");
    expect(levelForRating(1300)).toBe("Improver");
    expect(levelForRating(1499)).toBe("Improver");
    expect(levelForRating(1500)).toBe("Intermediate");
    expect(levelForRating(1699)).toBe("Intermediate");
    expect(levelForRating(1700)).toBe("Strong");
    expect(levelForRating(1899)).toBe("Strong");
    expect(levelForRating(1900)).toBe("Advanced");
  });
});

describe("isCompatibleLevel", () => {
  it("allows a 200 point gap and refuses 201", () => {
    expect(isCompatibleLevel(1500, 1700)).toBe(true);
    expect(isCompatibleLevel(1500, 1701)).toBe(false);
  });
});
