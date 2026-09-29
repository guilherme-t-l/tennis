// Same place, same format, at least 60 minutes in common, ratings within 200.
// The caller leaves out the player's own availability. This check does not know who published it.

import type { Format } from "@/lib/firestore/types";

export type AvailabilityWindow = {
  startsAt: Date;
  endsAt: Date;
  locationId: string;
  format: Format;
};

export function overlapWindow(
  a: AvailabilityWindow,
  b: AvailabilityWindow,
): { start: Date; end: Date } | null {
  const startMs = Math.max(a.startsAt.getTime(), b.startsAt.getTime());
  const endMs = Math.min(a.endsAt.getTime(), b.endsAt.getTime());
  if (endMs <= startMs) return null;
  return { start: new Date(startMs), end: new Date(endMs) };
}

function overlapMinutes(a: AvailabilityWindow, b: AvailabilityWindow): number {
  const window = overlapWindow(a, b);
  if (!window) return 0;
  return (window.end.getTime() - window.start.getTime()) / 60_000;
}

export function isCompatible(
  a: AvailabilityWindow,
  b: AvailabilityWindow,
  ratingA: number,
  ratingB: number,
): boolean {
  return (
    a.locationId === b.locationId &&
    a.format === b.format &&
    overlapMinutes(a, b) >= 60 &&
    Math.abs(ratingA - ratingB) <= 200
  );
}
