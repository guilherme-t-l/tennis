"use server";

// Create a list and add people from accepted connections.
// A list is a personal pool of people you already know. Duplicate names are refused.

import { FieldValue } from "firebase-admin/firestore";
import { redirect } from "next/navigation";
import { z } from "zod";
import { adminDb } from "@/lib/firebase/admin";
import { refreshApp } from "@/lib/firebase/revalidate";
import { requireUser } from "@/lib/firebase/session";
import { nameKey } from "@/lib/ids";
import { areConnected, getList } from "@/lib/queries/reads";

const nameSchema = z.string().trim().min(1, "Name the list.").max(40);

async function ownList(uid: string, listId: string) {
  const list = await getList(listId);
  if (!list || list.ownerId !== uid) return null;
  return list;
}

export async function createList(formData: FormData) {
  const uid = await requireUser();
  const parsed = nameSchema.safeParse(formData.get("name"));
  if (!parsed.success) redirect("/network/lists?error=" + encodeURIComponent(parsed.error.issues[0]?.message ?? "Name the list."));
  const key = nameKey(uid, parsed.data);
  const existing = await adminDb().collection("matchLists").where("nameKey", "==", key).limit(1).get();
  if (!existing.empty) {
    redirect("/network/lists?error=" + encodeURIComponent("You already have a list with that name."));
  }
  const ref = adminDb().collection("matchLists").doc();
  await ref.set({
    ownerId: uid,
    name: parsed.data,
    nameKey: key,
    memberIds: [],
    createdAt: FieldValue.serverTimestamp(),
  });
  refreshApp();
  redirect(`/network/lists/${ref.id}`);
}

export async function renameList(formData: FormData) {
  const uid = await requireUser();
  const listId = String(formData.get("listId") ?? "");
  const list = await ownList(uid, listId);
  if (!list) redirect("/network/lists");
  const parsed = nameSchema.safeParse(formData.get("name"));
  if (!parsed.success) redirect(`/network/lists/${listId}`);
  const key = nameKey(uid, parsed.data);
  const existing = await adminDb().collection("matchLists").where("nameKey", "==", key).limit(1).get();
  if (existing.docs.some((doc) => doc.id !== listId)) redirect(`/network/lists/${listId}?error=duplicate`);
  await adminDb().collection("matchLists").doc(listId).update({ name: parsed.data, nameKey: key });
  refreshApp();
  redirect(`/network/lists/${listId}`);
}

export async function deleteList(formData: FormData) {
  const uid = await requireUser();
  const listId = String(formData.get("listId") ?? "");
  const list = await ownList(uid, listId);
  if (!list) redirect("/network/lists");
  await adminDb().collection("matchLists").doc(listId).delete();
  refreshApp();
  redirect("/network/lists");
}

export async function addListMember(formData: FormData) {
  const uid = await requireUser();
  const listId = String(formData.get("listId") ?? "");
  const memberId = String(formData.get("memberId") ?? "");
  const list = await ownList(uid, listId);
  if (!list || !memberId) redirect("/network/lists");
  if (!(await areConnected(uid, memberId))) redirect(`/network/lists/${listId}?error=not-connected`);
  if (!list.memberIds.includes(memberId)) {
    await adminDb()
      .collection("matchLists")
      .doc(listId)
      .update({ memberIds: [...list.memberIds, memberId] });
  }
  refreshApp();
  redirect(`/network/lists/${listId}`);
}

export async function removeListMember(formData: FormData) {
  const uid = await requireUser();
  const listId = String(formData.get("listId") ?? "");
  const memberId = String(formData.get("memberId") ?? "");
  const list = await ownList(uid, listId);
  if (!list) redirect("/network/lists");
  await adminDb()
    .collection("matchLists")
    .doc(listId)
    .update({ memberIds: list.memberIds.filter((id) => id !== memberId) });
  refreshApp();
  redirect(`/network/lists/${listId}`);
}
