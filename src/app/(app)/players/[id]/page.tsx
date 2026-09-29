// Another player's profile. Availability shows only if you are connected.

import { notFound } from "next/navigation";
import { levelForRating } from "@/lib/domain/level";
import { availabilityWindowLabel, formatHistoryRow } from "@/lib/format";
import { requireUser } from "@/lib/firebase/session";
import {
  areConnected,
  getProfile,
  listActiveAvailabilities,
  listConnections,
  listLocations,
  listMatches,
  listRatingHistory,
} from "@/lib/queries/reads";

export default async function PlayerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const uid = await requireUser();
  if (id === uid) notFound();
  const profile = await getProfile(id);
  if (!profile) notFound();
  const connected = await areConnected(uid, id);
  const [history, matches, connections, locations, availabilities] = await Promise.all([
    listRatingHistory(id),
    listMatches(id),
    listConnections(id),
    listLocations(),
    connected ? listActiveAvailabilities(id) : Promise.resolve([]),
  ]);
  const played = matches.filter((match) => match.status === "played");
  const accepted = connections.filter((connection) => connection.status === "accepted").length;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">{profile.displayName}</h1>
      <p>
        {levelForRating(profile.rating)} · {profile.rating}
      </p>
      <p>{played.length} matches played</p>
      <p>{accepted} connections</p>
      <section>
        <h2 className="font-semibold">Places</h2>
        <ul>
          {profile.locationIds.map((locationId) => (
            <li key={locationId}>{locations.find((location) => location.id === locationId)?.name ?? locationId}</li>
          ))}
        </ul>
      </section>
      {connected ? (
        <section aria-label="Availability">
          <h2 className="font-semibold">Availability</h2>
          <ul>
            {availabilities.map((row) => (
              <li key={row.id}>{availabilityWindowLabel(row.startsAt, row.endsAt, row.locationName)}</li>
            ))}
          </ul>
        </section>
      ) : null}
      <section aria-label="Rating history">
        <ul>
          {history.map((row) => (
            <li key={row.id}>{formatHistoryRow(row.delta, row.opponentName)}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}
