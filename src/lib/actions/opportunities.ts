"use server";

// Create an opportunity and its invitations, or cancel while it is still open.
// Lists expand to people you know. The host is not invited.

import { randomBytes } from "node:crypto";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { redirect } from "next/navigation";
import { z } from "zod";
import { expandInvitees } from "@/lib/domain/opportunity";
import { saoPauloToUtc } from "@/lib/dates";
import { invitationTitle } from "@/lib/format";
import { adminDb } from "@/lib/firebase/admin";
import { refreshApp } from "@/lib/firebase/revalidate";
import { requireUser } from "@/lib/firebase/session";
import { slugify } from "@/lib/ids";
import { areConnected, getLocation, getProfile, listLists } from "@/lib/queries/reads";

const createSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  durationMin: z.coerce.number().int().min(30).max(240),
  format: z.enum(["singles", "doubles"]),
  note: z.string().max(200).optional(),
});

function parseWhen(date: string, time: string): Date {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  return saoPauloToUtc(year, month, day, hour, minute);
}

export async function createOpportunity(formData: FormData) {
  const uid = await requireUser();
  const parsed = createSchema.safeParse({
    date: formData.get("date"),
    time: formData.get("time"),
    durationMin: formData.get("durationMin") || 90,
    format: formData.get("format"),
    note: String(formData.get("note") ?? ""),
  });
  if (!parsed.success) redirect("/fix?error=" + encodeURIComponent("Check the date, time, and format."));
  const startsAt = parseWhen(parsed.data.date, parsed.data.time);
  if (startsAt.getTime() <= Date.now()) redirect("/fix?error=" + encodeURIComponent("Pick a future time."));

  const newPlace = String(formData.get("newLocation") ?? "").trim();
  let locationId = String(formData.get("locationId") ?? "");
  let locationName = "";
  if (newPlace) {
    locationId = slugify(newPlace);
    locationName = newPlace;
    await adminDb().collection("locations").doc(locationId).set(
      { name: newPlace, city: "", createdAt: FieldValue.serverTimestamp() },
      { merge: true },
    );
  } else {
    const location = await getLocation(locationId);
    if (!location) redirect("/fix?error=" + encodeURIComponent("Choose a place."));
    locationName = location.name;
  }

  const individuals = formData.getAll("connectionId").map(String);
  const listIds = formData.getAll("listId").map(String);
  const owned = await listLists(uid);
  const lists = listIds
    .map((id) => owned.find((list) => list.id === id))
    .filter((list): list is NonNullable<typeof list> => Boolean(list));
  const expanded = expandInvitees(lists, individuals, uid);
  const invitees: string[] = [];
  for (const id of expanded) {
    if (await areConnected(uid, id)) invitees.push(id);
  }
  if (!invitees.length) redirect("/fix?error=" + encodeURIComponent("Choose at least one player you know."));

  const host = await getProfile(uid);
  if (!host) redirect("/signup");
  const profiles = await adminDb().getAll(...invitees.map((id) => adminDb().collection("profiles").doc(id)));
  const names = new Map(profiles.filter((snap) => snap.exists).map((snap) => [snap.id, String(snap.data()?.displayName ?? "Player")]));

  const db = adminDb();
  const oppRef = db.collection("opportunities").doc();
  const batch = db.batch();
  batch.set(oppRef, {
    hostId: uid,
    participantIds: [uid, ...invitees],
    startsAt: Timestamp.fromDate(startsAt),
    durationMin: parsed.data.durationMin,
    locationId,
    locationName,
    format: parsed.data.format,
    note: parsed.data.note ?? "",
    status: "open",
    confirmedInvitationId: null,
    createdAt: FieldValue.serverTimestamp(),
  });

  for (const inviteeId of invitees) {
    const token = randomBytes(18).toString("hex");
    const invRef = db.collection("invitations").doc();
    batch.set(invRef, {
      opportunityId: oppRef.id,
      hostId: uid,
      inviteeId,
      token,
      response: "none",
      respondedAt: null,
      createdAt: FieldValue.serverTimestamp(),
    });
    batch.set(db.collection("inviteLinks").doc(token), {
      startsAt: Timestamp.fromDate(startsAt),
      durationMin: parsed.data.durationMin,
      format: parsed.data.format,
      status: "open",
      locationName,
      hostDisplayName: host.displayName,
      hostAvatarUrl: host.avatarUrl,
      inviteeDisplayName: names.get(inviteeId) ?? "Player",
      inviteeId,
      invitationId: invRef.id,
      opportunityId: oppRef.id,
      response: "none",
    });
    batch.set(db.collection("notifications").doc(), {
      profileId: inviteeId,
      type: "invitation_received",
      title: invitationTitle(host.displayName, startsAt, locationName),
      body: invitationTitle(host.displayName, startsAt, locationName),
      href: `/opportunities/${oppRef.id}`,
      readAt: null,
      createdAt: FieldValue.serverTimestamp(),
    });
  }

  await batch.commit();
  refreshApp();
  redirect(`/opportunities/${oppRef.id}`);
}

export async function cancelOpportunity(formData: FormData) {
  const uid = await requireUser();
  const opportunityId = String(formData.get("opportunityId") ?? "");
  const db = adminDb();
  await db.runTransaction(async (tx) => {
    const oppRef = db.collection("opportunities").doc(opportunityId);
    const oppSnap = await tx.get(oppRef);
    if (!oppSnap.exists) return;
    const opp = oppSnap.data() ?? {};
    if (opp.hostId !== uid || opp.status !== "open") return;
    const invs = await tx.get(db.collection("invitations").where("opportunityId", "==", opportunityId));
    const hostSnap = await tx.get(db.collection("profiles").doc(uid));
    const hostName = String(hostSnap.data()?.displayName ?? "Host");
    tx.update(oppRef, { status: "cancelled" });
    for (const doc of invs.docs) {
      const data = doc.data();
      tx.set(db.collection("inviteLinks").doc(String(data.token)), { status: "cancelled" }, { merge: true });
      tx.set(db.collection("notifications").doc(), {
        profileId: data.inviteeId,
        type: "opportunity_cancelled",
        title: `${hostName} cancelled the match`,
        body: `${hostName} cancelled the match`,
        href: `/opportunities/${opportunityId}`,
        readAt: null,
        createdAt: FieldValue.serverTimestamp(),
      });
    }
  });
  refreshApp();
  redirect(`/opportunities/${opportunityId}`);
}
