// People connected to people you know, nearby compatible players, and connections free in the next 7 days.
// Nearby means you share a preferred place. Ratings more than 200 apart are left out.

import { isCompatibleLevel, levelForRating } from "@/lib/domain/level";
import { currentlyAvailableLabel } from "@/lib/format";
import { adminDb } from "@/lib/firebase/admin";
import { prefixEnd } from "@/lib/ids";
import { connectionWindows } from "@/lib/queries/availabilities";
import { getProfile, listConnections, mapProfile } from "@/lib/queries/reads";
import type { Connection, Profile } from "@/lib/firestore/types";

export type KnownPerson = {
  profile: Profile;
  connection: Connection;
};

export type SecondDegree = {
  profile: Profile;
  viaName: string;
  level: string;
};

export type NearbyPerson = {
  profile: Profile;
  level: string;
};

export type AvailablePerson = {
  profile: Profile;
  label: string;
  href: string;
};

function otherId(connection: Connection, uid: string): string {
  return connection.participantIds.find((id) => id !== uid) ?? "";
}

export async function loadKnown(uid: string): Promise<KnownPerson[]> {
  const connections = await listConnections(uid);
  const profiles = await loadProfileMap(connections.map((connection) => otherId(connection, uid)));
  return connections
    .map((connection) => {
      const profile = profiles.get(otherId(connection, uid));
      if (!profile) return null;
      return { profile, connection };
    })
    .filter((item): item is KnownPerson => Boolean(item))
    .sort((a, b) => a.profile.displayName.localeCompare(b.profile.displayName));
}

async function loadProfileMap(ids: string[]): Promise<Map<string, Profile>> {
  const unique = [...new Set(ids.filter(Boolean))];
  const map = new Map<string, Profile>();
  if (!unique.length) return map;
  const snaps = await adminDb().getAll(...unique.map((id) => adminDb().collection("profiles").doc(id)));
  for (const snap of snaps) {
    if (snap.exists) map.set(snap.id, mapProfile(snap.id, snap.data() ?? {}));
  }
  return map;
}

export async function loadSecondDegree(uid: string): Promise<SecondDegree[]> {
  const mine = await listConnections(uid);
  const accepted = mine.filter((connection) => connection.status === "accepted");
  const firstDegree = new Set(accepted.map((connection) => otherId(connection, uid)));
  const found = new Map<string, SecondDegree>();
  for (const connection of accepted) {
    const friendId = otherId(connection, uid);
    const friend = await getProfile(friendId);
    if (!friend) continue;
    const theirConnections = await listConnections(friendId);
    const candidateIds = theirConnections
      .filter((item) => item.status === "accepted")
      .map((item) => otherId(item, friendId))
      .filter((id) => id && id !== uid && !firstDegree.has(id) && !found.has(id));
    const profiles = await loadProfileMap(candidateIds);
    for (const id of candidateIds) {
      const profile = profiles.get(id);
      if (!profile || found.has(id)) continue;
      found.set(id, { profile, viaName: friend.displayName, level: levelForRating(profile.rating) });
    }
  }
  return [...found.values()].sort((a, b) => a.profile.displayName.localeCompare(b.profile.displayName));
}

export async function loadNearby(uid: string): Promise<NearbyPerson[]> {
  const me = await getProfile(uid);
  if (!me) return [];
  const connections = await listConnections(uid);
  const known = new Set(
    connections
      .filter((connection) => connection.status === "accepted" || connection.status === "pending")
      .map((connection) => otherId(connection, uid)),
  );
  const found = new Map<string, NearbyPerson>();
  for (const locationId of me.locationIds) {
    const snap = await adminDb()
      .collection("profiles")
      .where("locationIds", "array-contains", locationId)
      .where("openToNew", "==", true)
      .get();
    for (const doc of snap.docs) {
      if (doc.id === uid || known.has(doc.id) || found.has(doc.id)) continue;
      const profile = mapProfile(doc.id, doc.data());
      if (!isCompatibleLevel(me.rating, profile.rating)) continue;
      found.set(doc.id, { profile, level: levelForRating(profile.rating) });
    }
  }
  return [...found.values()].sort((a, b) => a.profile.displayName.localeCompare(b.profile.displayName));
}

export async function loadCurrentlyAvailable(uid: string, now = new Date()): Promise<AvailablePerson[]> {
  const windows = await connectionWindows(uid, now);
  const byPerson = new Map<string, AvailablePerson>();
  for (const window of windows) {
    if (byPerson.has(window.profileId)) continue;
    byPerson.set(window.profileId, {
      profile: {
        id: window.profileId,
        displayName: window.name,
        displayNameLower: window.name.toLowerCase(),
        avatarUrl: null,
        selfLevel: "intermediate",
        rating: window.rating,
        ratedMatches: 0,
        openToNew: true,
        city: "",
        locationIds: [window.locationId],
        createdAt: now,
      },
      label: currentlyAvailableLabel(window.startsAt, window.endsAt, window.locationName, window.format),
      href: `/fix?with=${window.profileId}&at=${window.startsAt.toISOString()}&location=${window.locationId}&format=${window.format}`,
    });
  }
  return [...byPerson.values()];
}

export async function searchProfiles(prefix: string, uid: string): Promise<Profile[]> {
  const start = prefix.trim().toLowerCase();
  if (!start) return [];
  const snap = await adminDb()
    .collection("profiles")
    .where("displayNameLower", ">=", start)
    .where("displayNameLower", "<", prefixEnd(start))
    .limit(20)
    .get();
  return snap.docs.map((doc) => mapProfile(doc.id, doc.data())).filter((profile) => profile.id !== uid);
}
