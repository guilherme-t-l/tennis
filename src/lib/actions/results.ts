"use server";

// Record a winner and score, or confirm or dispute the other player's report.
// Only a singles confirmation changes ratings. The other player has to confirm.

import { FieldValue } from "firebase-admin/firestore";
import { redirect } from "next/navigation";
import { z } from "zod";
import { confirmResult } from "@/lib/firestore/confirm-result";
import { adminDb } from "@/lib/firebase/admin";
import { refreshApp } from "@/lib/firebase/revalidate";
import { requireUser } from "@/lib/firebase/session";
import { getMatch, getProfile, getResult } from "@/lib/queries/reads";

const recordSchema = z.object({
  matchId: z.string().min(1),
  winnerId: z.string().min(1),
  score: z.string().trim().min(1, "Enter the score.").max(40, "Keep the score under 40 characters."),
});

export async function recordResult(formData: FormData) {
  const uid = await requireUser();
  const parsed = recordSchema.safeParse({
    matchId: formData.get("matchId"),
    winnerId: formData.get("winnerId"),
    score: formData.get("score"),
  });
  if (!parsed.success) {
    const matchId = String(formData.get("matchId") ?? "");
    redirect(`/matches/${matchId}?error=` + encodeURIComponent(parsed.error.issues[0]?.message ?? "Check the result."));
  }
  const match = await getMatch(parsed.data.matchId);
  if (!match || !match.participantIds.includes(uid)) redirect("/");
  if (match.startsAt.getTime() > Date.now()) {
    redirect(`/matches/${match.id}?error=` + encodeURIComponent("You can record the result after you play."));
  }
  if (!match.participantIds.includes(parsed.data.winnerId)) {
    redirect(`/matches/${match.id}?error=` + encodeURIComponent("The winner has to be one of the players."));
  }
  const existing = await getResult(match.id);
  if (existing) redirect(`/matches/${match.id}`);
  const me = await getProfile(uid);
  const otherId = match.participantIds.find((id) => id !== uid) ?? "";
  const batch = adminDb().batch();
  batch.set(adminDb().collection("results").doc(match.id), {
    matchId: match.id,
    reportedBy: uid,
    winnerId: parsed.data.winnerId,
    score: parsed.data.score,
    status: "pending",
    confirmedBy: null,
    confirmedAt: null,
    createdAt: FieldValue.serverTimestamp(),
  });
  batch.set(adminDb().collection("notifications").doc(), {
    profileId: otherId,
    type: "result_reported",
    title: `${me?.displayName ?? "Your opponent"} reported a result`,
    body: `${me?.displayName ?? "Your opponent"} reported a result`,
    href: `/matches/${match.id}`,
    readAt: null,
    createdAt: FieldValue.serverTimestamp(),
  });
  await batch.commit();
  refreshApp();
  redirect(`/matches/${match.id}`);
}

export async function confirmResultAction(formData: FormData) {
  const uid = await requireUser();
  const resultId = String(formData.get("resultId") ?? "");
  await confirmResult(uid, resultId);
  refreshApp();
  redirect(`/matches/${resultId}`);
}

export async function disputeResult(formData: FormData) {
  const uid = await requireUser();
  const resultId = String(formData.get("resultId") ?? "");
  const result = await getResult(resultId);
  const match = result ? await getMatch(result.matchId) : null;
  if (!result || !match || !match.participantIds.includes(uid) || result.reportedBy === uid || result.status !== "pending") {
    redirect(result ? `/matches/${result.matchId}` : "/");
  }
  await adminDb().collection("results").doc(resultId).update({ status: "disputed" });
  refreshApp();
  redirect(`/matches/${result.matchId}`);
}
