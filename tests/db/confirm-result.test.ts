import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { describe, expect, it } from "vitest";
import { applyResult } from "@/lib/domain/elo";
import { adminDb } from "@/lib/firebase/admin";
import { confirmResult } from "@/lib/firestore/confirm-result";
import type { Format } from "@/lib/firestore/types";

const cases = [
  { name: "even", ratingA: 1500, ratingB: 1500, ratedMatchesA: 5, ratedMatchesB: 5, winner: "A" as const },
  { name: "underdog", ratingA: 1500, ratingB: 1700, ratedMatchesA: 5, ratedMatchesB: 5, winner: "A" as const },
  { name: "favorite", ratingA: 1500, ratingB: 1700, ratedMatchesA: 5, ratedMatchesB: 5, winner: "B" as const },
  { name: "provisional", ratingA: 1500, ratingB: 1500, ratedMatchesA: 0, ratedMatchesB: 5, winner: "A" as const },
];

async function seedMatch(name: string, input: (typeof cases)[number], format: Format) {
  const db = adminDb();
  const idA = `confirm_${name}_a`;
  const idB = `confirm_${name}_b`;
  const matchId = `confirm_${name}_match`;
  const batch = db.batch();
  batch.set(db.collection("profiles").doc(idA), {
    displayName: "A",
    displayNameLower: "a",
    avatarUrl: null,
    selfLevel: "intermediate",
    rating: input.ratingA,
    ratedMatches: input.ratedMatchesA,
    openToNew: true,
    city: "",
    locationIds: [],
    createdAt: FieldValue.serverTimestamp(),
  });
  batch.set(db.collection("profiles").doc(idB), {
    displayName: "B",
    displayNameLower: "b",
    avatarUrl: null,
    selfLevel: "intermediate",
    rating: input.ratingB,
    ratedMatches: input.ratedMatchesB,
    openToNew: true,
    city: "",
    locationIds: [],
    createdAt: FieldValue.serverTimestamp(),
  });
  batch.set(db.collection("matches").doc(matchId), {
    opportunityId: matchId,
    hostId: idA,
    opponentId: idB,
    participantIds: [idA, idB],
    startsAt: Timestamp.fromDate(new Date(Date.now() - 86_400_000)),
    locationId: "belvedere",
    locationName: "Belvedere",
    format,
    status: "scheduled",
    createdAt: FieldValue.serverTimestamp(),
  });
  batch.set(db.collection("results").doc(matchId), {
    matchId,
    reportedBy: idA,
    winnerId: input.winner === "A" ? idA : idB,
    score: "6-4 6-3",
    status: "pending",
    confirmedBy: null,
    confirmedAt: null,
    createdAt: FieldValue.serverTimestamp(),
  });
  await batch.commit();
  return { idA, idB, matchId };
}

describe("confirmResult", () => {
  it("stores the same ratings the domain rule returns", async () => {
    for (const input of cases) {
      const seeded = await seedMatch(input.name, input, "singles");
      const expected = applyResult({ ...input, format: "singles" });
      expect(await confirmResult(seeded.idB, seeded.matchId)).toEqual({ ok: true });
      const profileA = await adminDb().collection("profiles").doc(seeded.idA).get();
      const profileB = await adminDb().collection("profiles").doc(seeded.idB).get();
      expect(profileA.data()?.rating).toBe(expected.ratingA);
      expect(profileB.data()?.rating).toBe(expected.ratingB);
      const history = await adminDb().collection("ratingHistory").where("matchId", "==", seeded.matchId).get();
      const rowA = history.docs.find((row) => row.data().profileId === seeded.idA);
      const rowB = history.docs.find((row) => row.data().profileId === seeded.idB);
      expect(rowA?.data()).toMatchObject({ ratingBefore: input.ratingA, ratingAfter: expected.ratingA, delta: expected.deltaA });
      expect(rowB?.data()).toMatchObject({ ratingBefore: input.ratingB, ratingAfter: expected.ratingB, delta: expected.deltaB });
    }
  });

  it("leaves doubles ratings unchanged and refuses a second confirm", async () => {
    const input = cases[0];
    const seeded = await seedMatch("doubles", input, "doubles");
    expect(await confirmResult(seeded.idB, seeded.matchId)).toEqual({ ok: true });
    const profileA = await adminDb().collection("profiles").doc(seeded.idA).get();
    const profileB = await adminDb().collection("profiles").doc(seeded.idB).get();
    expect(profileA.data()?.rating).toBe(input.ratingA);
    expect(profileB.data()?.rating).toBe(input.ratingB);
    expect(await confirmResult(seeded.idB, seeded.matchId)).toEqual({ ok: false, reason: "already_confirmed" });
  });
});
