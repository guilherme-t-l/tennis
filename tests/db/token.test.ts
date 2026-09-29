import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { doc, getDoc, type Firestore } from "firebase/firestore";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { adminDb } from "@/lib/firebase/admin";
import { respondViaToken } from "@/lib/firestore/accept-invitation";

let testEnv: RulesTestEnvironment;

async function createInvite(suffix: string) {
  const db = adminDb();
  const opportunityId = `token_opp_${suffix}`;
  const hostId = `token_host_${suffix}`;
  const inviteeId = `token_invitee_${suffix}`;
  const otherId = `token_other_${suffix}`;
  const invitationId = `token_inv_${suffix}`;
  const token = randomBytes(18).toString("hex");
  const startsAt = Timestamp.fromDate(new Date(Date.now() + 86_400_000));
  const batch = db.batch();
  batch.set(db.collection("opportunities").doc(opportunityId), {
    hostId,
    participantIds: [hostId, inviteeId],
    startsAt,
    durationMin: 90,
    locationId: "belvedere",
    locationName: "Belvedere",
    format: "singles",
    note: "private note",
    status: "open",
    confirmedInvitationId: null,
    createdAt: FieldValue.serverTimestamp(),
  });
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
    startsAt,
    durationMin: 90,
    format: "singles",
    status: "open",
    locationName: "Belvedere",
    hostDisplayName: "Host",
    hostAvatarUrl: null,
    inviteeDisplayName: "Invitee",
    inviteeId,
    invitationId,
    opportunityId,
    response: "none",
  });
  await batch.commit();
  return { opportunityId, inviteeId, otherId, invitationId, token };
}

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: "demo-tennis",
    firestore: {
      rules: readFileSync("firestore.rules", "utf8"),
      host: "127.0.0.1",
      port: 8080,
    },
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

describe("invite tokens", () => {
  it("returns only the public fields to a signed-out visitor", async () => {
    const created = await createInvite("public");
    const anon = testEnv.unauthenticatedContext().firestore() as unknown as Firestore;
    const snap = await assertSucceeds(getDoc(doc(anon, "inviteLinks", created.token)));
    const data = snap.data() ?? {};
    expect(data).not.toHaveProperty("hostId");
    expect(data).not.toHaveProperty("token");
    expect(data).not.toHaveProperty("note");
    expect(data.locationName).toBe("Belvedere");
    const missing = await assertSucceeds(getDoc(doc(anon, "inviteLinks", "missing-token")));
    expect(missing.exists()).toBe(false);
  });

  it("refuses a non-invitee, records Maybe, and confirms I'm in", async () => {
    const maybe = await createInvite("maybe");
    expect(await respondViaToken(maybe.otherId, maybe.token, "maybe")).toEqual({ ok: false, reason: "not_invitee" });
    expect(await respondViaToken(maybe.inviteeId, maybe.token, "maybe")).toEqual({ ok: true });
    const invitation = await adminDb().collection("invitations").doc(maybe.invitationId).get();
    const link = await adminDb().collection("inviteLinks").doc(maybe.token).get();
    expect(invitation.data()?.response).toBe("maybe");
    expect(link.data()?.response).toBe("maybe");

    const accepted = await createInvite("in");
    const result = await respondViaToken(accepted.inviteeId, accepted.token, "in");
    expect(result).toEqual({ ok: true, matchId: accepted.opportunityId });
    const match = await adminDb().collection("matches").doc(accepted.opportunityId).get();
    expect(match.exists).toBe(true);
  });
});
