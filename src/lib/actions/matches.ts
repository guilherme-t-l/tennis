"use server";

// Cancel a scheduled match. The opportunity stays confirmed.
// Cancelling is the way out after someone has already said "I'm in".

import { redirect } from "next/navigation";
import { adminDb } from "@/lib/firebase/admin";
import { refreshApp } from "@/lib/firebase/revalidate";
import { requireUser } from "@/lib/firebase/session";
import { getMatch } from "@/lib/queries/reads";

export async function cancelMatch(formData: FormData) {
  const uid = await requireUser();
  const matchId = String(formData.get("matchId") ?? "");
  const match = await getMatch(matchId);
  if (!match || !match.participantIds.includes(uid) || match.status !== "scheduled") {
    redirect(match ? `/matches/${match.id}` : "/");
  }
  await adminDb().collection("matches").doc(matchId).update({ status: "cancelled" });
  refreshApp();
  redirect(`/matches/${matchId}`);
}
