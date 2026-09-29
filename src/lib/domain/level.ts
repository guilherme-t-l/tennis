// Level name shown for a rating, and whether two ratings are close enough to suggest.
// A new player starts at 1200, 1500, or 1800 from the level they declare at sign-up.

import type { SelfLevel } from "@/lib/firestore/types";

// Beginner 1200, intermediate 1500, advanced 1800.
export function initialRating(level: SelfLevel): number {
  if (level === "beginner") return 1200;
  if (level === "intermediate") return 1500;
  return 1800;
}

// The name shown next to a rating: Beginner, Improver, Intermediate, Strong, Advanced.
export function levelForRating(rating: number): string {
  if (rating < 1300) return "Beginner";
  if (rating < 1500) return "Improver";
  if (rating < 1700) return "Intermediate";
  if (rating < 1900) return "Strong";
  return "Advanced";
}

// Two players are close enough to suggest when their ratings are within 200.
export function isCompatibleLevel(ratingA: number, ratingB: number): boolean {
  return Math.abs(ratingA - ratingB) <= 200;
}
