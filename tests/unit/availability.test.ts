import { describe, expect, it } from "vitest";
import { isCompatible, overlapWindow, type AvailabilityWindow } from "@/lib/domain/availability";

function window(start: string, end: string, locationId = "belvedere", format: "singles" | "doubles" = "singles"): AvailabilityWindow {
  return { startsAt: new Date(start), endsAt: new Date(end), locationId, format };
}

describe("isCompatible", () => {
  const base = window("2026-10-03T13:00:00.000Z", "2026-10-03T15:00:00.000Z");

  it("matches the same place, format, 60 minutes, and ratings within 200", () => {
    const other = window("2026-10-03T14:00:00.000Z", "2026-10-03T16:00:00.000Z");
    expect(isCompatible(base, other, 1500, 1700)).toBe(true);
  });

  it("refuses a different place, format, short overlap, or a 201 point gap", () => {
    expect(isCompatible(base, window("2026-10-03T13:00:00.000Z", "2026-10-03T15:00:00.000Z", "pampulha"), 1500, 1500)).toBe(false);
    expect(isCompatible(base, window("2026-10-03T13:00:00.000Z", "2026-10-03T15:00:00.000Z", "belvedere", "doubles"), 1500, 1500)).toBe(false);
    expect(isCompatible(base, window("2026-10-03T14:15:00.000Z", "2026-10-03T16:00:00.000Z"), 1500, 1500)).toBe(false);
    expect(isCompatible(base, window("2026-10-03T14:00:00.000Z", "2026-10-03T15:00:00.000Z"), 1500, 1701)).toBe(false);
  });

  it("accepts an overlap of exactly 60 minutes", () => {
    const hour = window("2026-10-03T14:00:00.000Z", "2026-10-03T15:00:00.000Z");
    expect(isCompatible(base, hour, 1500, 1500)).toBe(true);
  });
});

describe("overlapWindow", () => {
  it("returns the shared interval", () => {
    const overlap = overlapWindow(
      window("2026-10-03T13:00:00.000Z", "2026-10-03T15:00:00.000Z"),
      window("2026-10-03T14:00:00.000Z", "2026-10-03T16:00:00.000Z"),
    );
    expect(overlap?.start.toISOString()).toBe("2026-10-03T14:00:00.000Z");
    expect(overlap?.end.toISOString()).toBe("2026-10-03T15:00:00.000Z");
  });
});

describe("own availability", () => {
  it("does not exclude a player from themselves; the caller must drop their own row", () => {
    const mine = window("2026-10-03T13:00:00.000Z", "2026-10-03T15:00:00.000Z");
    expect(isCompatible(mine, mine, 1500, 1500)).toBe(true);
  });
});
