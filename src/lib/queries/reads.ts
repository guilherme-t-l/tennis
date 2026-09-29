// Loads the documents a screen needs. Who can see them is decided by the rules and the actions.

import { Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { asDate, asDateOrNull } from "@/lib/firestore/map";
import type {
  Availability,
  Connection,
  Invitation,
  InviteLink,
  Location,
  Match,
  MatchList,
  Notification,
  Opportunity,
  Profile,
  RatingHistoryRow,
  Result,
} from "@/lib/firestore/types";
import { pairId } from "@/lib/ids";

function db() {
  return adminDb();
}

export function mapProfile(id: string, data: FirebaseFirestore.DocumentData): Profile {
  return {
    id,
    displayName: String(data.displayName ?? ""),
    displayNameLower: String(data.displayNameLower ?? ""),
    avatarUrl: (data.avatarUrl as string | null) ?? null,
    selfLevel: data.selfLevel,
    rating: Number(data.rating ?? 0),
    ratedMatches: Number(data.ratedMatches ?? 0),
    openToNew: Boolean(data.openToNew),
    city: String(data.city ?? ""),
    locationIds: (data.locationIds as string[]) ?? [],
    createdAt: asDate(data.createdAt),
  };
}

export async function getProfile(id: string): Promise<Profile | null> {
  const snap = await db().collection("profiles").doc(id).get();
  if (!snap.exists) return null;
  return mapProfile(snap.id, snap.data() ?? {});
}

export async function getProfiles(ids: string[]): Promise<Map<string, Profile>> {
  const unique = [...new Set(ids.filter(Boolean))];
  const map = new Map<string, Profile>();
  if (!unique.length) return map;
  const snaps = await db().getAll(...unique.map((id) => db().collection("profiles").doc(id)));
  for (const snap of snaps) {
    if (snap.exists) map.set(snap.id, mapProfile(snap.id, snap.data() ?? {}));
  }
  return map;
}

export async function listLocations(): Promise<Location[]> {
  const snap = await db().collection("locations").get();
  return snap.docs
    .map((doc) => ({
      id: doc.id,
      name: String(doc.data().name ?? ""),
      city: String(doc.data().city ?? ""),
      createdAt: asDate(doc.data().createdAt),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function getLocation(id: string): Promise<Location | null> {
  const snap = await db().collection("locations").doc(id).get();
  if (!snap.exists) return null;
  const data = snap.data() ?? {};
  return { id: snap.id, name: String(data.name ?? ""), city: String(data.city ?? ""), createdAt: asDate(data.createdAt) };
}

export function mapConnection(id: string, data: FirebaseFirestore.DocumentData): Connection {
  return {
    id,
    requesterId: String(data.requesterId),
    addresseeId: String(data.addresseeId),
    participantIds: (data.participantIds as string[]) ?? [],
    pairId: String(data.pairId ?? ""),
    status: data.status,
    respondedAt: asDateOrNull(data.respondedAt),
    createdAt: asDate(data.createdAt),
  };
}

export async function listConnections(uid: string): Promise<Connection[]> {
  const snap = await db().collection("connections").where("participantIds", "array-contains", uid).get();
  return snap.docs.map((doc) => mapConnection(doc.id, doc.data()));
}

export async function areConnected(a: string, b: string): Promise<boolean> {
  const snap = await db().collection("connectionPairs").doc(pairId(a, b)).get();
  return snap.exists && snap.data()?.status === "accepted";
}

export async function listLists(ownerId: string): Promise<MatchList[]> {
  const snap = await db().collection("matchLists").where("ownerId", "==", ownerId).get();
  return snap.docs
    .map((doc) => mapList(doc.id, doc.data()))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function mapList(id: string, data: FirebaseFirestore.DocumentData): MatchList {
  return {
    id,
    ownerId: String(data.ownerId),
    name: String(data.name ?? ""),
    nameKey: String(data.nameKey ?? ""),
    memberIds: (data.memberIds as string[]) ?? [],
    createdAt: asDate(data.createdAt),
  };
}

export async function getList(id: string): Promise<MatchList | null> {
  const snap = await db().collection("matchLists").doc(id).get();
  if (!snap.exists) return null;
  return mapList(snap.id, snap.data() ?? {});
}

export function mapOpportunity(id: string, data: FirebaseFirestore.DocumentData): Opportunity {
  return {
    id,
    hostId: String(data.hostId),
    participantIds: (data.participantIds as string[]) ?? [],
    startsAt: asDate(data.startsAt),
    durationMin: Number(data.durationMin ?? 90),
    locationId: String(data.locationId ?? ""),
    locationName: String(data.locationName ?? ""),
    format: data.format,
    note: String(data.note ?? ""),
    status: data.status,
    confirmedInvitationId: (data.confirmedInvitationId as string | null) ?? null,
    createdAt: asDate(data.createdAt),
  };
}

export async function getOpportunity(id: string): Promise<Opportunity | null> {
  const snap = await db().collection("opportunities").doc(id).get();
  if (!snap.exists) return null;
  return mapOpportunity(snap.id, snap.data() ?? {});
}

export async function listOpportunities(uid: string): Promise<Opportunity[]> {
  const snap = await db().collection("opportunities").where("participantIds", "array-contains", uid).get();
  return snap.docs.map((doc) => mapOpportunity(doc.id, doc.data()));
}

export function mapInvitation(id: string, data: FirebaseFirestore.DocumentData): Invitation {
  return {
    id,
    opportunityId: String(data.opportunityId),
    hostId: String(data.hostId),
    inviteeId: String(data.inviteeId),
    token: String(data.token),
    response: data.response,
    respondedAt: asDateOrNull(data.respondedAt),
    createdAt: asDate(data.createdAt),
  };
}

export async function listInvitationsForOpportunity(opportunityId: string, hostId: string): Promise<Invitation[]> {
  const snap = await db()
    .collection("invitations")
    .where("hostId", "==", hostId)
    .where("opportunityId", "==", opportunityId)
    .get();
  return snap.docs.map((doc) => mapInvitation(doc.id, doc.data()));
}

export function mapInviteLink(id: string, data: FirebaseFirestore.DocumentData): InviteLink {
  return {
    id,
    startsAt: asDate(data.startsAt),
    durationMin: Number(data.durationMin ?? 90),
    format: data.format,
    status: data.status,
    locationName: String(data.locationName ?? ""),
    hostDisplayName: String(data.hostDisplayName ?? ""),
    hostAvatarUrl: (data.hostAvatarUrl as string | null) ?? null,
    inviteeDisplayName: String(data.inviteeDisplayName ?? ""),
    inviteeId: String(data.inviteeId ?? ""),
    invitationId: String(data.invitationId ?? ""),
    opportunityId: String(data.opportunityId ?? ""),
    response: data.response ?? "none",
  };
}

export async function getInviteLink(token: string): Promise<InviteLink | null> {
  const snap = await db().collection("inviteLinks").doc(token).get();
  if (!snap.exists) return null;
  return mapInviteLink(snap.id, snap.data() ?? {});
}

export function mapMatch(id: string, data: FirebaseFirestore.DocumentData): Match {
  return {
    id,
    opportunityId: String(data.opportunityId ?? id),
    hostId: String(data.hostId),
    opponentId: String(data.opponentId),
    participantIds: (data.participantIds as string[]) ?? [],
    startsAt: asDate(data.startsAt),
    locationId: String(data.locationId ?? ""),
    locationName: String(data.locationName ?? ""),
    format: data.format,
    status: data.status,
    createdAt: asDate(data.createdAt),
  };
}

export async function listMatches(uid: string): Promise<Match[]> {
  const snap = await db()
    .collection("matches")
    .where("participantIds", "array-contains", uid)
    .orderBy("startsAt", "asc")
    .get();
  return snap.docs.map((doc) => mapMatch(doc.id, doc.data()));
}

export async function getMatch(id: string): Promise<Match | null> {
  const snap = await db().collection("matches").doc(id).get();
  if (!snap.exists) return null;
  return mapMatch(snap.id, snap.data() ?? {});
}

export function mapResult(id: string, data: FirebaseFirestore.DocumentData): Result {
  return {
    id,
    matchId: String(data.matchId),
    reportedBy: String(data.reportedBy),
    winnerId: String(data.winnerId),
    score: String(data.score ?? ""),
    status: data.status,
    confirmedBy: (data.confirmedBy as string | null) ?? null,
    confirmedAt: asDateOrNull(data.confirmedAt),
    createdAt: asDate(data.createdAt),
  };
}

export async function getResult(matchId: string): Promise<Result | null> {
  const snap = await db().collection("results").doc(matchId).get();
  if (!snap.exists) return null;
  return mapResult(snap.id, snap.data() ?? {});
}

export async function listRatingHistory(profileId: string): Promise<RatingHistoryRow[]> {
  const snap = await db()
    .collection("ratingHistory")
    .where("profileId", "==", profileId)
    .orderBy("createdAt", "desc")
    .get();
  return snap.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      profileId: String(data.profileId),
      matchId: String(data.matchId),
      opponentId: String(data.opponentId),
      opponentName: String(data.opponentName ?? ""),
      ratingBefore: Number(data.ratingBefore ?? 0),
      ratingAfter: Number(data.ratingAfter ?? 0),
      delta: Number(data.delta ?? 0),
      createdAt: asDate(data.createdAt),
    };
  });
}

export async function listHistoryForMatch(matchId: string): Promise<RatingHistoryRow[]> {
  const snap = await db().collection("ratingHistory").where("matchId", "==", matchId).get();
  return snap.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      profileId: String(data.profileId),
      matchId: String(data.matchId),
      opponentId: String(data.opponentId),
      opponentName: String(data.opponentName ?? ""),
      ratingBefore: Number(data.ratingBefore ?? 0),
      ratingAfter: Number(data.ratingAfter ?? 0),
      delta: Number(data.delta ?? 0),
      createdAt: asDate(data.createdAt),
    };
  });
}

export async function listNotifications(profileId: string): Promise<Notification[]> {
  const snap = await db()
    .collection("notifications")
    .where("profileId", "==", profileId)
    .orderBy("createdAt", "desc")
    .get();
  return snap.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      profileId: String(data.profileId),
      type: data.type,
      title: String(data.title ?? ""),
      body: String(data.body ?? ""),
      href: String(data.href ?? "/"),
      readAt: asDateOrNull(data.readAt),
      createdAt: asDate(data.createdAt),
    };
  });
}

export async function unreadCount(profileId: string): Promise<number> {
  const items = await listNotifications(profileId);
  return items.filter((item) => !item.readAt).length;
}

export function mapAvailability(id: string, data: FirebaseFirestore.DocumentData): Availability {
  return {
    id,
    profileId: String(data.profileId),
    startsAt: asDate(data.startsAt),
    endsAt: asDate(data.endsAt),
    locationId: String(data.locationId ?? ""),
    locationName: String(data.locationName ?? ""),
    format: data.format,
    note: String(data.note ?? ""),
    status: data.status,
    createdAt: asDate(data.createdAt),
  };
}

export async function listActiveAvailabilities(profileId: string, now = new Date()): Promise<Availability[]> {
  const snap = await db()
    .collection("availabilities")
    .where("profileId", "==", profileId)
    .where("status", "==", "active")
    .where("endsAt", ">", Timestamp.fromDate(now))
    .orderBy("endsAt", "asc")
    .get();
  return snap.docs.map((doc) => mapAvailability(doc.id, doc.data()));
}

export async function acceptedOtherIds(uid: string): Promise<string[]> {
  const connections = await listConnections(uid);
  return connections
    .filter((connection) => connection.status === "accepted")
    .map((connection) => connection.participantIds.find((id) => id !== uid) ?? "")
    .filter(Boolean);
}
