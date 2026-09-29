// Two people accepting at once still produce exactly one confirmed match.
// The match document id is the opportunity id, so a second create cannot land.
// "I'm in" confirms the match. "Maybe" and "Can't play" leave it open.

import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { canRespond, closedFixedLine, matchFixedLine } from "@/lib/domain/opportunity";
import { adminDb } from "@/lib/firebase/admin";
import { asDate } from "@/lib/firestore/map";
import type { InvitationResponse, OpportunityStatus } from "@/lib/firestore/types";

export type AcceptResult =
  | { ok: true; matchId: string }
  | { ok: false; reason: "closed" | "expired" | "not_invitee" | "missing" };

export type RespondResult =
  | { ok: true; matchId?: string }
  | { ok: false; reason: "closed" | "expired" | "not_invitee" | "missing" };

function closedReason(code: unknown): boolean {
  const value = String(code);
  return (
    value === "6" ||
    value === "10" ||
    value === "already-exists" ||
    value === "aborted" ||
    value.includes("ALREADY_EXISTS") ||
    value.includes("ABORTED")
  );
}

export async function acceptInvitation(uid: string, invitationId: string): Promise<AcceptResult> {
  const db = adminDb();
  try {
    return await db.runTransaction(async (tx) => {
      const invRef = db.collection("invitations").doc(invitationId);
      const invSnap = await tx.get(invRef);
      if (!invSnap.exists) return { ok: false, reason: "missing" };
      const inv = invSnap.data() ?? {};
      if (inv.inviteeId !== uid) return { ok: false, reason: "not_invitee" };

      const oppRef = db.collection("opportunities").doc(String(inv.opportunityId));
      const oppSnap = await tx.get(oppRef);
      if (!oppSnap.exists) return { ok: false, reason: "missing" };
      const opp = oppSnap.data() ?? {};
      if (opp.status !== "open") return { ok: false, reason: "closed" };
      const startsAt = asDate(opp.startsAt);
      if (startsAt.getTime() <= Date.now()) return { ok: false, reason: "expired" };

      const invsSnap = await tx.get(
        db.collection("invitations").where("opportunityId", "==", oppRef.id),
      );
      const matchRef = db.collection("matches").doc(oppRef.id);
      const matchSnap = await tx.get(matchRef);
      if (matchSnap.exists) return { ok: false, reason: "closed" };

      const hostSnap = await tx.get(db.collection("profiles").doc(String(opp.hostId)));
      const inviteeSnap = await tx.get(db.collection("profiles").doc(uid));
      const hostName = String(hostSnap.data()?.displayName ?? "Host");
      const inviteeName = String(inviteeSnap.data()?.displayName ?? "Player");

      tx.update(oppRef, {
        status: "confirmed",
        confirmedInvitationId: invitationId,
      });
      tx.update(invRef, {
        response: "in",
        respondedAt: FieldValue.serverTimestamp(),
      });
      tx.create(matchRef, {
        opportunityId: oppRef.id,
        hostId: opp.hostId,
        opponentId: uid,
        participantIds: [opp.hostId, uid],
        startsAt: opp.startsAt,
        locationId: opp.locationId,
        locationName: opp.locationName,
        format: opp.format,
        status: "scheduled",
        createdAt: FieldValue.serverTimestamp(),
      });

      const confirmedTitle = "Match confirmed";
      const confirmedBody = matchFixedLine(hostName, inviteeName);
      for (const profileId of [String(opp.hostId), uid]) {
        tx.set(db.collection("notifications").doc(), {
          profileId,
          type: "match_confirmed",
          title: confirmedTitle,
          body: confirmedBody,
          href: `/matches/${oppRef.id}`,
          readAt: null,
          createdAt: FieldValue.serverTimestamp(),
        });
      }

      for (const doc of invsSnap.docs) {
        const data = doc.data();
        tx.set(
          db.collection("inviteLinks").doc(String(data.token)),
          {
            status: "confirmed",
            response: doc.id === invitationId ? "in" : data.response,
          },
          { merge: true },
        );
        if (doc.id === invitationId) continue;
        tx.set(db.collection("notifications").doc(), {
          profileId: data.inviteeId,
          type: "opportunity_closed",
          title: "Opportunity closed",
          body: closedFixedLine(hostName),
          href: `/opportunities/${oppRef.id}`,
          readAt: null,
          createdAt: FieldValue.serverTimestamp(),
        });
      }

      return { ok: true, matchId: oppRef.id };
    });
  } catch (error) {
    const code = typeof error === "object" && error && "code" in error ? (error as { code: unknown }).code : "";
    if (closedReason(code)) return { ok: false, reason: "closed" };
    throw error;
  }
}

export async function respondToInvitation(
  uid: string,
  invitationId: string,
  response: InvitationResponse,
): Promise<RespondResult> {
  if (response === "in") return acceptInvitation(uid, invitationId);
  const db = adminDb();
  return db.runTransaction(async (tx) => {
    const invRef = db.collection("invitations").doc(invitationId);
    const invSnap = await tx.get(invRef);
    if (!invSnap.exists) return { ok: false, reason: "missing" };
    const inv = invSnap.data() ?? {};
    if (inv.inviteeId !== uid) return { ok: false, reason: "not_invitee" };
    const oppSnap = await tx.get(db.collection("opportunities").doc(String(inv.opportunityId)));
    if (!oppSnap.exists) return { ok: false, reason: "missing" };
    const opp = oppSnap.data() ?? {};
    const startsAt = asDate(opp.startsAt);
    const allowed = canRespond(
      {
        status: opp.status as OpportunityStatus,
        startsAt,
        confirmedInvitationId: (opp.confirmedInvitationId as string | null) ?? null,
      },
      { id: invitationId, response: inv.response as InvitationResponse },
      response,
      new Date(),
    );
    if (!allowed) {
      if (opp.status === "open" && startsAt.getTime() <= Date.now()) return { ok: false, reason: "expired" };
      return { ok: false, reason: "closed" };
    }
    tx.update(invRef, {
      response,
      respondedAt: FieldValue.serverTimestamp(),
    });
    tx.set(db.collection("inviteLinks").doc(String(inv.token)), { response }, { merge: true });
    return { ok: true };
  });
}

export async function respondViaToken(
  uid: string,
  token: string,
  response: InvitationResponse,
): Promise<RespondResult> {
  const db = adminDb();
  const link = await db.collection("inviteLinks").doc(token).get();
  if (!link.exists) return { ok: false, reason: "missing" };
  const data = link.data() ?? {};
  if (data.inviteeId !== uid) return { ok: false, reason: "not_invitee" };
  return respondToInvitation(uid, String(data.invitationId), response);
}

export function timestampNow(): Timestamp {
  return Timestamp.now();
}
