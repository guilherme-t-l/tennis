// Load one connection's active times at a time, then the availability rule decides the match.
// Own times are not compared with themselves.

import { isCompatible, overlapWindow } from "@/lib/domain/availability";
import { availabilitySuggestionText } from "@/lib/format";
import type { Format } from "@/lib/firestore/types";
import { acceptedOtherIds, getProfile, getProfiles, listActiveAvailabilities } from "@/lib/queries/reads";

export type Suggestion = {
  profileId: string;
  name: string;
  locationId: string;
  locationName: string;
  format: Format;
  start: Date;
  end: Date;
  text: string;
  href: string;
};

export type ConnectionWindow = {
  profileId: string;
  name: string;
  locationId: string;
  locationName: string;
  format: Format;
  startsAt: Date;
  endsAt: Date;
  rating: number;
};

async function inWaves<T>(ids: string[], load: (id: string) => Promise<T>): Promise<T[]> {
  const results: T[] = [];
  for (let index = 0; index < ids.length; index += 30) {
    const wave = ids.slice(index, index + 30);
    results.push(...(await Promise.all(wave.map(load))));
  }
  return results;
}

export async function connectionWindows(uid: string, now = new Date()): Promise<ConnectionWindow[]> {
  const otherIds = await acceptedOtherIds(uid);
  const profiles = await getProfiles(otherIds);
  const grouped = await inWaves(otherIds, async (profileId) => ({
    profileId,
    rows: await listActiveAvailabilities(profileId, now),
  }));
  const horizon = now.getTime() + 7 * 86_400_000;
  const windows: ConnectionWindow[] = [];
  for (const group of grouped) {
    const profile = profiles.get(group.profileId);
    if (!profile) continue;
    for (const row of group.rows) {
      if (row.startsAt.getTime() > horizon) continue;
      windows.push({
        profileId: group.profileId,
        name: profile.displayName,
        locationId: row.locationId,
        locationName: row.locationName,
        format: row.format,
        startsAt: row.startsAt,
        endsAt: row.endsAt,
        rating: profile.rating,
      });
    }
  }
  windows.sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
  return windows;
}

export async function mutualSuggestions(uid: string, now = new Date()): Promise<Suggestion[]> {
  const me = await getProfile(uid);
  if (!me) return [];
  const mine = await listActiveAvailabilities(uid, now);
  if (!mine.length) return [];
  const windows = await connectionWindows(uid, now);
  const suggestions: Suggestion[] = [];
  const seen = new Set<string>();
  for (const mineRow of mine) {
    for (const other of windows) {
      const key = `${other.profileId}:${mineRow.id}:${other.startsAt.toISOString()}`;
      if (seen.has(key)) continue;
      const compatible = isCompatible(
        mineRow,
        { startsAt: other.startsAt, endsAt: other.endsAt, locationId: other.locationId, format: other.format },
        me.rating,
        other.rating,
      );
      if (!compatible) continue;
      const overlap = overlapWindow(mineRow, {
        startsAt: other.startsAt,
        endsAt: other.endsAt,
        locationId: other.locationId,
        format: other.format,
      });
      if (!overlap) continue;
      seen.add(key);
      const start = overlap.start;
      suggestions.push({
        profileId: other.profileId,
        name: other.name,
        locationId: other.locationId,
        locationName: other.locationName,
        format: other.format,
        start,
        end: overlap.end,
        text: availabilitySuggestionText(other.name, other.locationName, start),
        href: `/fix?with=${other.profileId}&at=${start.toISOString()}&location=${other.locationId}&format=${other.format}`,
      });
    }
  }
  return suggestions;
}
