import { randomBytes } from "node:crypto";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { describe, expect, it } from "vitest";
import { adminDb } from "@/lib/firebase/admin";
import { acceptInvitation } from "@/lib/firestore/accept-invitation";

async function createOpportunity(suffix: string, startsAt: Date) {
  const db = adminDb();
  const opportunityId = `conc_${suffix}`;
  const hostId = `host_${suffix}`;
  const firstId = `first_${suffix}`;
  const secondId = `second_${suffix}`;
  const firstInvitation = `inv_${suffix}_a`;
  const secondInvitation = `inv_${suffix}_b`;
  const firstToken = randomBytes(18).toString("hex");
  const secondToken = randomBytes(18).toString("hex");
  const batch = db.batch();
  batch.set(db.collection("opportunities").doc(opportunityId), {
    hostId,
    participantIds: [hostId, firstId, secondId],
    startsAt: Timestamp.fromDate(startsAt),
    durationMin: 90,
    locationId: "belvedere",
    locationName: "Belvedere",
    format: "singles",
    note: "",
    status: "open",
    confirmedInvitationId: null,
    createdAt: FieldValue.serverTimestamp(),
  });
  for (const [invitationId, inviteeId, token] of [
    [firstInvitation, firstId, firstToken],
    [secondInvitation, secondId, secondToken],
  ] as const) {
    batch.set(db.collection("invitations").doc(invitationId), {
      opportunityId,
      hostId,
      inviteeId,
      token,
      response: "none",
      respondedAt: null,
      createdAt: FieldValue.serverTimestamp(),
    });
    batch.set(db.collection("inviteLinks").doc(token), {
      startsAt: Timestamp.fromDate(startsAt),
      durationMin: 90,
      format: "singles",
      status: "open",
      locationName: "Belvedere",
      hostDisplayName: "Host",
      hostAvatarUrl: null,
      inviteeDisplayName: inviteeId,
      inviteeId,
      invitationId,
      opportunityId,
      response: "none",
    });
  }
  await batch.commit();
  return { opportunityId, firstId, secondId, firstInvitation, secondInvitation };
}

describe("acceptInvitation concurrency", () => {
  it("confirms exactly one match when two invitees accept together, five times", async () => {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const created = await createOpportunity(`race_${attempt}`, new Date(Date.now() + 86_400_000));
      const [first, second] = await Promise.all([
        acceptInvitation(created.firstId, created.firstInvitation),
        acceptInvitation(created.secondId, created.secondInvitation),
      ]);
      const wins = [first, second].filter((result) => result.ok);
      const losses = [first, second].filter((result) => !result.ok);
      expect(wins).toHaveLength(1);
      expect(losses).toEqual([{ ok: false, reason: "closed" }]);
      if (wins[0]?.ok) expect(wins[0].matchId).toBe(created.opportunityId);
      const match = await adminDb().collection("matches").doc(created.opportunityId).get();
      expect(match.exists).toBe(true);
      const opportunity = await adminDb().collection("opportunities").doc(created.opportunityId).get();
      expect(opportunity.data()?.confirmedInvitationId).toBe(wins[0]?.ok ? (first.ok ? created.firstInvitation : created.secondInvitation) : "");
      const loserId = first.ok ? created.secondId : created.firstId;
      const notes = await adminDb().collection("notifications").where("profileId", "==", loserId).get();
      expect(notes.docs.some((doc) => doc.data().type === "opportunity_closed")).toBe(true);
    }
  });

  it("returns closed after the host cancelled and expired when the start has passed", async () => {
    const cancelled = await createOpportunity("cancelled", new Date(Date.now() + 86_400_000));
    await adminDb().collection("opportunities").doc(cancelled.opportunityId).update({ status: "cancelled" });
    expect(await acceptInvitation(cancelled.firstId, cancelled.firstInvitation)).toEqual({ ok: false, reason: "closed" });

    const expired = await createOpportunity("expired", new Date(Date.now() - 86_400_000));
    expect(await acceptInvitation(expired.firstId, expired.firstInvitation)).toEqual({ ok: false, reason: "expired" });
  });
});
