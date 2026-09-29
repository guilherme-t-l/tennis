// Confirming a singles result writes both ratings from the one rating rule.
// Doubles stores the confirmed result and leaves both ratings unchanged.
// A second confirm does nothing.

import { FieldValue } from "firebase-admin/firestore";
import { applyResult } from "@/lib/domain/elo";
import { adminDb } from "@/lib/firebase/admin";
import type { Format } from "@/lib/firestore/types";

export type ConfirmResult =
  | { ok: true }
  | { ok: false; reason: "already_confirmed" | "not_confirmer" | "missing" | "not_pending" };

export async function confirmResult(uid: string, resultId: string): Promise<ConfirmResult> {
  const db = adminDb();
  return db.runTransaction(async (tx) => {
    const resultRef = db.collection("results").doc(resultId);
    const resultSnap = await tx.get(resultRef);
    if (!resultSnap.exists) return { ok: false, reason: "missing" };
    const result = resultSnap.data() ?? {};
    if (result.status === "confirmed") return { ok: false, reason: "already_confirmed" };
    if (result.status !== "pending") return { ok: false, reason: "not_pending" };
    if (result.reportedBy === uid) return { ok: false, reason: "not_confirmer" };

    const matchRef = db.collection("matches").doc(String(result.matchId));
    const matchSnap = await tx.get(matchRef);
    if (!matchSnap.exists) return { ok: false, reason: "missing" };
    const match = matchSnap.data() ?? {};
    const participantIds = (match.participantIds as string[]) ?? [];
    if (!participantIds.includes(uid)) return { ok: false, reason: "not_confirmer" };

    const profileRefs = participantIds.map((id) => db.collection("profiles").doc(id));
    const profileSnaps = [];
    for (const ref of profileRefs) profileSnaps.push(await tx.get(ref));

    tx.update(resultRef, {
      status: "confirmed",
      confirmedBy: uid,
      confirmedAt: FieldValue.serverTimestamp(),
    });
    tx.update(matchRef, { status: "played" });

    if (match.format === "singles" && participantIds.length >= 2) {
      const idA = participantIds[0];
      const idB = participantIds[1];
      const snapA = profileSnaps.find((snap) => snap.id === idA);
      const snapB = profileSnaps.find((snap) => snap.id === idB);
      const dataA = snapA?.data() ?? {};
      const dataB = snapB?.data() ?? {};
      const ratingA = Number(dataA.rating ?? 0);
      const ratingB = Number(dataB.rating ?? 0);
      const ratedMatchesA = Number(dataA.ratedMatches ?? 0);
      const ratedMatchesB = Number(dataB.ratedMatches ?? 0);
      const nameA = String(dataA.displayName ?? "Player");
      const nameB = String(dataB.displayName ?? "Player");
      const applied = applyResult({
        ratingA,
        ratingB,
        ratedMatchesA,
        ratedMatchesB,
        winner: result.winnerId === idA ? "A" : "B",
        format: "singles" satisfies Format,
      });
      tx.update(db.collection("profiles").doc(idA), {
        rating: applied.ratingA,
        ratedMatches: ratedMatchesA + 1,
      });
      tx.update(db.collection("profiles").doc(idB), {
        rating: applied.ratingB,
        ratedMatches: ratedMatchesB + 1,
      });
      const now = FieldValue.serverTimestamp();
      tx.set(db.collection("ratingHistory").doc(), {
        profileId: idA,
        matchId: matchRef.id,
        opponentId: idB,
        opponentName: nameB,
        ratingBefore: ratingA,
        ratingAfter: applied.ratingA,
        delta: applied.deltaA,
        createdAt: now,
      });
      tx.set(db.collection("ratingHistory").doc(), {
        profileId: idB,
        matchId: matchRef.id,
        opponentId: idA,
        opponentName: nameA,
        ratingBefore: ratingB,
        ratingAfter: applied.ratingB,
        delta: applied.deltaB,
        createdAt: now,
      });
    }

    tx.set(db.collection("notifications").doc(), {
      profileId: result.reportedBy,
      type: "result_confirmed",
      title: "Result confirmed",
      body: "Your result was confirmed",
      href: `/matches/${matchRef.id}`,
      readAt: null,
      createdAt: FieldValue.serverTimestamp(),
    });

    return { ok: true };
  });
}
