// After the match "How did it go?": record a result, or confirm or dispute it.
// A confirmed singles result shows how both ratings moved.

import { notFound } from "next/navigation";
import { cancelMatch } from "@/lib/actions/matches";
import { confirmResultAction, disputeResult, recordResult } from "@/lib/actions/results";
import { formatDelta, formatHeadline } from "@/lib/format";
import { requireUser } from "@/lib/firebase/session";
import { getMatch, getProfiles, getResult, listHistoryForMatch } from "@/lib/queries/reads";

export default async function MatchPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const uid = await requireUser();
  const match = await getMatch(id);
  if (!match || !match.participantIds.includes(uid)) notFound();
  const profiles = await getProfiles(match.participantIds);
  const result = await getResult(match.id);
  const history = result?.status === "confirmed" ? await listHistoryForMatch(match.id) : [];
  const now = new Date();
  const played = match.startsAt.getTime() <= now.getTime();
  const names = match.participantIds.map((playerId) => profiles.get(playerId)?.displayName ?? "Player");

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">How did it go?</h1>
      <p>{formatHeadline(match.startsAt, match.locationName, match.format)}</p>
      <p>{names.join(" × ")}</p>
      <ul className="text-sm text-stone-700">
        {match.participantIds.map((playerId) => {
          const profile = profiles.get(playerId);
          if (!profile) return null;
          return (
            <li key={playerId} data-testid={`player-${playerId}`}>
              {profile.displayName} rating {profile.rating}
              <span data-testid={`rated-${playerId}`}> {profile.ratedMatches} rated matches</span>
            </li>
          );
        })}
      </ul>
      {query.error ? <p className="text-sm text-red-700">{query.error}</p> : null}
      {match.status === "cancelled" ? <p>This match was cancelled.</p> : null}
      {match.status === "scheduled" && !played ? (
        <form action={cancelMatch}>
          <input type="hidden" name="matchId" value={match.id} />
          <button className="rounded-md border border-stone-300 px-4 py-2" type="submit">
            Cancel match
          </button>
        </form>
      ) : null}
      {match.status === "scheduled" && played && !result ? (
        // Record the winner and the score after you've played.
        <form action={recordResult} className="flex flex-col gap-3 rounded-lg bg-white p-4">
          <h2 className="font-semibold">Record result</h2>
          <input type="hidden" name="matchId" value={match.id} />
          <fieldset>
            <legend className="text-sm">Winner</legend>
            {match.participantIds.map((playerId) => (
              <label key={playerId} className="mt-1 flex items-center gap-2">
                <input type="radio" name="winnerId" value={playerId} required />
                {profiles.get(playerId)?.displayName ?? "Player"}
              </label>
            ))}
          </fieldset>
          <label className="flex flex-col gap-1 text-sm">
            Score
            <input className="rounded-md border border-stone-300 px-3 py-2" name="score" maxLength={40} required />
          </label>
          <button className="rounded-md bg-green-900 px-4 py-2 text-white" type="submit">
            Save
          </button>
        </form>
      ) : null}
      {result && result.status === "pending" && result.reportedBy === uid ? (
        <p>Result pending {profiles.get(match.participantIds.find((playerId) => playerId !== uid) ?? "")?.displayName}&apos;s confirmation</p>
      ) : null}
      {result && result.status === "pending" && result.reportedBy !== uid ? (
        // Confirm the other player's report, or dispute it. Confirming a singles result updates both ratings.
        <div className="flex gap-2">
          <form action={confirmResultAction}>
            <input type="hidden" name="resultId" value={result.id} />
            <button className="rounded-md bg-green-900 px-4 py-2 text-white" type="submit">
              Confirm
            </button>
          </form>
          <form action={disputeResult}>
            <input type="hidden" name="resultId" value={result.id} />
            <button className="rounded-md border border-stone-300 px-4 py-2" type="submit">
              Dispute
            </button>
          </form>
        </div>
      ) : null}
      {result?.status === "disputed" ? <p>This result is disputed.</p> : null}
      {result?.status === "confirmed" ? (
        <div>
          <p className="font-semibold">Confirmed</p>
          <p>Score {result.score}</p>
          <ul>
            {history.map((row) => (
              <li key={row.id}>{formatDelta(profiles.get(row.profileId)?.displayName ?? "Player", row.delta)}</li>
            ))}
          </ul>
          <form action={confirmResultAction}>
            <input type="hidden" name="resultId" value={result.id} />
            <button className="mt-2 rounded-md border border-stone-300 px-4 py-2" type="submit">
              Confirm
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
