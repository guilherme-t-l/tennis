// At most three Home nudges: who is free, how often you played, who you have not played lately.
// Availability comes first, then frequency, then a stale opponent.

import { availabilityPromptText } from "@/lib/format";
import type { Format } from "@/lib/firestore/types";

const DAY_MS = 86_400_000;

export type Prompt = {
  text: string;
  cta?: string;
  href?: string;
};

export type PromptAvailability = {
  profileId: string;
  name: string;
  locationId: string;
  locationName: string;
  format: Format;
  startsAt: Date;
  endsAt: Date;
};

export type PromptOpponent = {
  id: string;
  name: string;
  lastPlayedAt: Date;
};

export function buildPrompts(input: {
  matchesLast30d: number;
  lastPlayedByOpponent: PromptOpponent[];
  connectionAvailabilities: PromptAvailability[];
  now: Date;
}): Prompt[] {
  const horizon = input.now.getTime() + 7 * DAY_MS;
  const availability = [...input.connectionAvailabilities]
    .filter(
      (item) => item.startsAt.getTime() <= horizon && item.endsAt.getTime() > input.now.getTime(),
    )
    .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime() || a.name.localeCompare(b.name))
    .map((item) => ({
      text: availabilityPromptText(item.name, item.locationName, item.startsAt),
      cta: "Fix a match",
      href: `/fix?with=${item.profileId}&at=${item.startsAt.toISOString()}&location=${item.locationId}&format=${item.format}`,
    }));

  const frequency: Prompt =
    input.matchesLast30d <= 0
      ? { text: "Fix your first match this month", cta: "Fix a match", href: "/fix" }
      : {
          text: `You've played ${input.matchesLast30d} ${input.matchesLast30d === 1 ? "time" : "times"} in the last 30 days`,
        };

  const stale = [...input.lastPlayedByOpponent]
    .map((opponent) => {
      const days = Math.floor((input.now.getTime() - opponent.lastPlayedAt.getTime()) / DAY_MS);
      const weeks = Math.floor(days / 7);
      return { opponent, days, weeks };
    })
    .filter((item) => item.days >= 21)
    .sort(
      (a, b) =>
        a.opponent.lastPlayedAt.getTime() - b.opponent.lastPlayedAt.getTime() ||
        a.opponent.name.localeCompare(b.opponent.name),
    )
    .map((item) => ({
      text: `You haven't played ${item.opponent.name} in ${item.weeks} ${item.weeks === 1 ? "week" : "weeks"}`,
      cta: "Fix a match",
      href: `/fix?with=${item.opponent.id}`,
    }));

  return [...availability, frequency, ...stale].slice(0, 3);
}
