"use server";

// Mark an inbox item read, then open the request, match, or result it is about.

import { FieldValue } from "firebase-admin/firestore";
import { redirect } from "next/navigation";
import { adminDb } from "@/lib/firebase/admin";
import { refreshApp } from "@/lib/firebase/revalidate";
import { requireUser, safeNext } from "@/lib/firebase/session";

export async function openNotification(formData: FormData) {
  const uid = await requireUser();
  const id = String(formData.get("id") ?? "");
  const href = safeNext(String(formData.get("href") ?? "/inbox"));
  const ref = adminDb().collection("notifications").doc(id);
  const snap = await ref.get();
  if (snap.exists && snap.data()?.profileId === uid && !snap.data()?.readAt) {
    await ref.update({ readAt: FieldValue.serverTimestamp() });
  }
  refreshApp();
  redirect(href === "/" ? href : href);
}
