// The first "I'm in" confirms the match and closes it for everyone else.
// Maybe and Can't play leave it open. A start time that has passed is shown as expired.

import type { InvitationResponse, OpportunityStatus } from "@/lib/firestore/types";

export type EffectiveStatus = OpportunityStatus | "expired";

export type InvitationView =
  | "you_are_in"
  | "closed_fixed_with_other"
  | "closed_cancelled"
  | "closed_expired"
  | "awaiting"
  | "maybe"
  | "declined";

type Opp = {
  status: OpportunityStatus;
  startsAt: Date;
  confirmedInvitationId?: string | null;
};

type Inv = {
  id: string;
  response: InvitationResponse;
};

export function effectiveStatus(opp: Opp, now: Date): EffectiveStatus {
  if (opp.status === "open" && opp.startsAt.getTime() <= now.getTime()) return "expired";
  return opp.status;
}

export function invitationView(opp: Opp, inv: Inv, now: Date): InvitationView {
  if (opp.status === "confirmed" && opp.confirmedInvitationId === inv.id) return "you_are_in";
  if (opp.status === "confirmed") return "closed_fixed_with_other";
  if (opp.status === "cancelled") return "closed_cancelled";
  if (opp.status === "open" && opp.startsAt.getTime() <= now.getTime()) return "closed_expired";
  if (inv.response === "maybe") return "maybe";
  if (inv.response === "out") return "declined";
  return "awaiting";
}

// "I'm in" is refused once the opportunity is confirmed, cancelled, or expired.
// While it is open, Maybe, Can't play, and clearing that reply are still allowed.
export function canRespond(
  opp: Opp,
  inv: Inv,
  _response: InvitationResponse,
  now: Date,
): boolean {
  const view = invitationView(opp, inv, now);
  return view === "awaiting" || view === "maybe" || view === "declined";
}

// Lists expand to their members. The host is not invited, and each player is invited once.
export function expandInvitees(
  lists: { memberIds: string[] }[],
  individuals: string[],
  hostId: string,
): string[] {
  const ids = new Set<string>();
  for (const id of individuals) ids.add(id);
  for (const list of lists) {
    for (const id of list.memberIds) ids.add(id);
  }
  ids.delete(hostId);
  return [...ids];
}

export function statusLabel(status: EffectiveStatus): string {
  if (status === "open") return "Looking for an opponent";
  if (status === "confirmed") return "Match fixed";
  if (status === "cancelled") return "Cancelled";
  return "Expired";
}

export function responseLabel(response: InvitationResponse): string {
  if (response === "none") return "Awaiting";
  if (response === "in") return "In";
  if (response === "maybe") return "Maybe";
  return "Can't play";
}

export function matchFixedLine(hostName: string, opponentName: string): string {
  return `Match fixed: ${hostName} × ${opponentName}`;
}

export function closedFixedLine(hostName: string): string {
  return `Closed — ${hostName} fixed this match with someone else`;
}

export const ALREADY_FIXED_LINE = "This match has already been fixed";

export function closedCancelledLine(hostName: string): string {
  return `Closed — ${hostName} cancelled this match`;
}

export const CLOSED_EXPIRED_LINE = "This match has expired";
