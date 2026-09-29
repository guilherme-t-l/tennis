// Public invite. Read-only until the invited player signs in, then the same response buttons.
// The link does not sign anyone in.

import Link from "next/link";
import { notFound } from "next/navigation";
import { respondViaTokenAction } from "@/lib/actions/invitations";
import {
  ALREADY_FIXED_LINE,
  CLOSED_EXPIRED_LINE,
  closedCancelledLine,
  closedFixedLine,
  invitationView,
  matchFixedLine,
} from "@/lib/domain/opportunity";
import { formatHeadline } from "@/lib/format";
import { optionalUser } from "@/lib/firebase/session";
import { getInviteLink, getProfile } from "@/lib/queries/reads";

// The invite is drawn when someone opens this link. It stays read-only until that player signs in.
export const dynamic = "force-dynamic";

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const link = await getInviteLink(token);
  if (!link) notFound();
  const uid = await optionalUser();
  const headline = formatHeadline(link.startsAt, link.locationName, link.format);
  const view =
    uid === link.inviteeId
      ? invitationView(
          {
            status: link.status,
            startsAt: link.startsAt,
            confirmedInvitationId: link.response === "in" ? link.invitationId : "other",
          },
          { id: link.invitationId, response: link.response },
          new Date(),
        )
      : null;

  return (
    <div className="flex flex-col gap-4">
      <p>{link.hostDisplayName} invited {link.inviteeDisplayName}</p>
      <h1 className="text-2xl font-semibold">{headline}</h1>
      {view === "you_are_in" ? <p>{matchFixedLine(link.hostDisplayName, link.inviteeDisplayName)}</p> : null}
      {view === "closed_fixed_with_other" ? (
        <div>
          <p>{closedFixedLine(link.hostDisplayName)}</p>
          <p>{ALREADY_FIXED_LINE}</p>
        </div>
      ) : null}
      {view === "closed_cancelled" ? <p>{closedCancelledLine(link.hostDisplayName)}</p> : null}
      {view === "closed_expired" ? <p>{CLOSED_EXPIRED_LINE}</p> : null}
      {view === "awaiting" || view === "maybe" || view === "declined" ? (
        <div className="flex flex-wrap gap-2">
          <form action={respondViaTokenAction}>
            <input type="hidden" name="token" value={token} />
            <input type="hidden" name="response" value="in" />
            <button className="rounded-md bg-green-900 px-4 py-2 text-white" type="submit">
              I&apos;m in
            </button>
          </form>
          <form action={respondViaTokenAction}>
            <input type="hidden" name="token" value={token} />
            <input type="hidden" name="response" value="maybe" />
            <button className="rounded-md border border-stone-300 px-4 py-2" type="submit">
              Maybe
            </button>
          </form>
          <form action={respondViaTokenAction}>
            <input type="hidden" name="token" value={token} />
            <input type="hidden" name="response" value="out" />
            <button className="rounded-md border border-stone-300 px-4 py-2" type="submit">
              Can&apos;t play
            </button>
          </form>
        </div>
      ) : null}
      {!uid ? (
        <Link href={`/login?next=/i/${token}`}>Sign in to respond</Link>
      ) : null}
      {uid && uid !== link.inviteeId ? <p>This invite was sent to {link.inviteeDisplayName}</p> : null}
    </div>
  );
}
