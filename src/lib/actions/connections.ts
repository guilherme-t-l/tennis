"use server";

// Ask to connect, or accept a request.
// Only someone you asked can accept. Accepting writes the pair both of you share.

import { FieldValue } from "firebase-admin/firestore";
import { redirect } from "next/navigation";
import { adminDb } from "@/lib/firebase/admin";
import { refreshApp } from "@/lib/firebase/revalidate";
import { requireUser } from "@/lib/firebase/session";
import { pairId } from "@/lib/ids";
import { getProfile, listConnections } from "@/lib/queries/reads";

export async function requestConnection(formData: FormData) {
  const uid = await requireUser();
  const addresseeId = String(formData.get("addresseeId") ?? "");
  if (!addresseeId || addresseeId === uid) redirect("/network?error=Pick%20another%20player");
  const addressee = await getProfile(addresseeId);
  const me = await getProfile(uid);
  if (!addressee || !me) redirect("/network?error=Player%20not%20found");
  const existing = await listConnections(uid);
  const related = existing.filter((connection) => connection.participantIds.includes(addresseeId));
  if (related.some((connection) => connection.status === "accepted" || connection.status === "pending")) {
    redirect("/network");
  }
  const ref = adminDb().collection("connections").doc();
  const batch = adminDb().batch();
  batch.set(ref, {
    requesterId: uid,
    addresseeId,
    participantIds: [uid, addresseeId],
    pairId: pairId(uid, addresseeId),
    status: "pending",
    respondedAt: null,
    createdAt: FieldValue.serverTimestamp(),
  });
  batch.set(adminDb().collection("notifications").doc(), {
    profileId: addresseeId,
    type: "connection_requested",
    title: `${me.displayName} wants to connect`,
    body: `${me.displayName} wants to connect`,
    href: "/network",
    readAt: null,
    createdAt: FieldValue.serverTimestamp(),
  });
  await batch.commit();
  refreshApp();
  redirect("/network");
}

export async function acceptConnection(formData: FormData) {
  const uid = await requireUser();
  const connectionId = String(formData.get("connectionId") ?? "");
  const ref = adminDb().collection("connections").doc(connectionId);
  const snap = await ref.get();
  if (!snap.exists) redirect("/network");
  const data = snap.data() ?? {};
  if (data.addresseeId !== uid || data.status !== "pending") redirect("/network");
  const me = await getProfile(uid);
  const batch = adminDb().batch();
  batch.update(ref, { status: "accepted", respondedAt: FieldValue.serverTimestamp() });
  batch.set(adminDb().collection("connectionPairs").doc(String(data.pairId)), {
    status: "accepted",
    connectionId,
  });
  batch.set(adminDb().collection("notifications").doc(), {
    profileId: data.requesterId,
    type: "connection_accepted",
    title: `${me?.displayName ?? "A player"} accepted your connection`,
    body: `${me?.displayName ?? "A player"} accepted your connection`,
    href: "/network",
    readAt: null,
    createdAt: FieldValue.serverTimestamp(),
  });
  await batch.commit();
  refreshApp();
  redirect("/network");
}

export async function declineConnection(formData: FormData) {
  const uid = await requireUser();
  const connectionId = String(formData.get("connectionId") ?? "");
  const ref = adminDb().collection("connections").doc(connectionId);
  const snap = await ref.get();
  if (!snap.exists) redirect("/network");
  const data = snap.data() ?? {};
  if (data.addresseeId !== uid || data.status !== "pending") redirect("/network");
  await ref.update({ status: "declined", respondedAt: FieldValue.serverTimestamp() });
  refreshApp();
  redirect("/network");
}
