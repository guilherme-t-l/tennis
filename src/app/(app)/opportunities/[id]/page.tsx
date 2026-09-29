// Manage responses / Match fixed.
// The host sees each reply and Share on WhatsApp. An invitee taps I'm in, Maybe, or Can't play.
// The first "I'm in" closes it for everyone else.

import Link from "next/link";
import { notFound } from "next/navigation";
import { cancelOpportunity } from "@/lib/actions/opportunities";
import { respondToInvitationAction } from "@/lib/actions/invitations";
import {
  ALREADY_FIXED_LINE,
  CLOSED_EXPIRED_LINE,
  closedCancelledLine,
  closedFixedLine,
  effectiveStatus,
  invitationView,
  matchFixedLine,
  responseLabel,
  statusLabel,
} from "@/lib/domain/opportunity";
import { buildInviteMessage, buildWhatsAppShareUrl } from "@/lib/domain/whatsapp";
import { formatHeadline } from "@/lib/format";
import { requireUser } from "@/lib/firebase/session";
import { getOpportunity, getProfiles, listInvitationsForOpportunity } from "@/lib/queries/reads";

export default async function OpportunityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const uid = await requireUser();
  const opportunity = await getOpportunity(id);
  if (!opportunity || !opportunity.participantIds.includes(uid)) notFound();
  const invitations = await listInvitationsForOpportunity(id, opportunity.hostId);
  const profiles = await getProfiles([
    opportunity.hostId,
    ...invitations.map((invitation) => invitation.inviteeId),
  ]);
  const host = profiles.get(opportunity.hostId);
  const hostName = host?.displayName ?? "Host";
  const now = new Date();
  const status = effectiveStatus(opportunity, now);
  const confirmed = invitations.find((invitation) => invitation.id === opportunity.confirmedInvitationId);
  const opponent = confirmed ? profiles.get(confirmed.inviteeId) : undefined;
  const mine = invitations.find((invitation) => invitation.inviteeId === uid);
  const isHost = opportunity.hostId === uid;
  const viewerFixedIt = Boolean(opponent) && (isHost || confirmed?.inviteeId === uid);

  return (
    <div className="flex flex-col gap-4">
      <p className="text-lg">{formatHeadline(opportunity.startsAt, opportunity.locationName, opportunity.format)}</p>
      {opportunity.note ? <p className="text-sm text-stone-600">{opportunity.note}</p> : null}
      {viewerFixedIt && opponent ? (
        // Match fixed: the host and the player who said "I'm in".
        <div>
          <h1 className="text-2xl font-semibold">{matchFixedLine(hostName, opponent.displayName)}</h1>
          <Link className="mt-2 inline-block text-green-900" href={`/matches/${opportunity.id}`}>
            Open match
          </Link>
        </div>
      ) : (
        <h1 className="text-2xl font-semibold">{status === "confirmed" ? closedFixedLine(hostName) : statusLabel(status)}</h1>
      )}

      {isHost ? (
        <ul className="flex flex-col gap-3">
          {invitations.map((invitation) => {
            const invitee = profiles.get(invitation.inviteeId);
            const message = buildInviteMessage({
              inviteeName: invitee?.displayName ?? "Player",
              format: opportunity.format,
              startsAt: opportunity.startsAt,
              locationName: opportunity.locationName,
              token: invitation.token,
            });
            return (
              <li key={invitation.id} className="rounded-lg bg-white p-3">
                <p>
                  {invitee?.displayName ?? "Player"} · {responseLabel(invitation.response)}
                </p>
                <a
                  className="text-sm text-green-900"
                  href={buildWhatsAppShareUrl(message)}
                  target="_blank"
                  rel="noreferrer"
                >
                  Share on WhatsApp
                </a>
              </li>
            );
          })}
        </ul>
      ) : null}

      {!isHost && mine ? <InviteeResponse hostName={hostName} invitationId={mine.id} opportunity={opportunity} response={mine.response} /> : null}

      {isHost && opportunity.status === "open" ? (
        <form action={cancelOpportunity}>
          <input type="hidden" name="opportunityId" value={opportunity.id} />
          <button className="rounded-md border border-stone-300 px-4 py-2" type="submit">
            Cancel
          </button>
        </form>
      ) : null}
    </div>
  );
}

function InviteeResponse({
  hostName,
  invitationId,
  opportunity,
  response,
}: {
  hostName: string;
  invitationId: string;
  opportunity: { status: "open" | "confirmed" | "cancelled"; startsAt: Date; confirmedInvitationId: string | null };
  response: "none" | "in" | "maybe" | "out";
}) {
  const view = invitationView(opportunity, { id: invitationId, response }, new Date());
  if (view === "closed_fixed_with_other") {
    return <p>{ALREADY_FIXED_LINE}</p>;
  }
  if (view === "closed_cancelled") return <p>{closedCancelledLine(hostName)}</p>;
  if (view === "closed_expired") return <p>{CLOSED_EXPIRED_LINE}</p>;
  if (view === "you_are_in") return null;
  return (
    <div>
      {view === "maybe" ? <p>You said Maybe. You can still say I&apos;m in.</p> : null}
      {view === "declined" ? <p>You said Can&apos;t play. You can still say I&apos;m in.</p> : null}
      {/* I'm in confirms the match. Maybe and Can't play leave it open. */}
      <div className="flex flex-wrap gap-2">
        <form action={respondToInvitationAction}>
          <input type="hidden" name="invitationId" value={invitationId} />
          <input type="hidden" name="response" value="in" />
          <button className="rounded-md bg-green-900 px-4 py-2 text-white" type="submit">
            I&apos;m in
          </button>
        </form>
        <form action={respondToInvitationAction}>
          <input type="hidden" name="invitationId" value={invitationId} />
          <input type="hidden" name="response" value="maybe" />
          <button className="rounded-md border border-stone-300 px-4 py-2" type="submit">
            Maybe
          </button>
        </form>
        <form action={respondToInvitationAction}>
          <input type="hidden" name="invitationId" value={invitationId} />
          <input type="hidden" name="response" value="out" />
          <button className="rounded-md border border-stone-300 px-4 py-2" type="submit">
            Can&apos;t play
          </button>
        </form>
      </div>
    </div>
  );
}
