// Profile "Your tennis": name, level, rating, history, places, and how often you play.

import { saveProfile } from "@/lib/actions/profile";
import { levelForRating } from "@/lib/domain/level";
import { formatHeadline, formatHistoryRow } from "@/lib/format";
import { requireUser } from "@/lib/firebase/session";
import {
  getProfile,
  getProfiles,
  listConnections,
  listLocations,
  listMatches,
  listRatingHistory,
} from "@/lib/queries/reads";

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const query = await searchParams;
  const uid = await requireUser();
  const profile = await getProfile(uid);
  if (!profile) return null;
  const [history, matches, connections, locations] = await Promise.all([
    listRatingHistory(uid),
    listMatches(uid),
    listConnections(uid),
    listLocations(),
  ]);
  const now = new Date();
  const played = matches.filter((match) => match.status === "played");
  const last30 = played.filter((match) => match.startsAt.getTime() >= now.getTime() - 30 * 86_400_000);
  const upcoming = matches.filter((match) => match.status === "scheduled" && match.startsAt.getTime() > now.getTime());
  const people = await getProfiles(played.flatMap((match) => match.participantIds));
  const accepted = connections.filter((connection) => connection.status === "accepted").length;
  const level = levelForRating(profile.rating);

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-semibold">Your tennis</h1>
        <p className="mt-2 text-xl">{profile.displayName}</p>
      </header>
      <dl className="grid grid-cols-2 gap-3 rounded-lg bg-white p-4">
        <div>
          <dt className="text-sm text-stone-500">Level</dt>
          <dd>{level}</dd>
        </div>
        <div>
          <dt className="text-sm text-stone-500">Rating</dt>
          <dd>{profile.rating}</dd>
        </div>
        <div>
          <dt className="text-sm text-stone-500">Matches</dt>
          <dd>{played.length} matches played</dd>
        </div>
        <div>
          <dt className="text-sm text-stone-500">Frequency</dt>
          <dd>{last30.length} in the last 30 days</dd>
        </div>
        <div>
          <dt className="text-sm text-stone-500">Connections</dt>
          <dd>{accepted} connections</dd>
        </div>
      </dl>
      <section>
        <h2 className="font-semibold">Places</h2>
        <ul>
          {profile.locationIds.map((id) => (
            <li key={id}>{locations.find((location) => location.id === id)?.name ?? id}</li>
          ))}
        </ul>
      </section>
      <section aria-label="Rating history">
        <h2 className="font-semibold">Rating history</h2>
        <ul>
          {history.map((row) => (
            <li key={row.id}>{formatHistoryRow(row.delta, row.opponentName)}</li>
          ))}
        </ul>
      </section>
      <section aria-label="Match history">
        <h2 className="font-semibold">Match history</h2>
        <ul>
          {played.map((match) => {
            const opponentId = match.participantIds.find((id) => id !== uid) ?? "";
            return <li key={match.id}>{people.get(opponentId)?.displayName ?? "Opponent"}</li>;
          })}
        </ul>
      </section>
      <section aria-label="Upcoming matches">
        <h2 className="font-semibold">Upcoming matches</h2>
        <ul>
          {upcoming.map((match) => (
            <li key={match.id}>{formatHeadline(match.startsAt, match.locationName, match.format)}</li>
          ))}
        </ul>
      </section>
      {query.error ? <p className="text-sm text-red-700">{query.error}</p> : null}
      <form action={saveProfile} className="flex flex-col gap-3 rounded-lg bg-white p-4">
        <h2 className="font-semibold">Edit</h2>
        <label className="flex flex-col gap-1 text-sm">
          Display name
          <input className="rounded-md border border-stone-300 px-3 py-2" name="displayName" defaultValue={profile.displayName} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Level
          <select
            className="rounded-md border border-stone-300 px-3 py-2"
            name="selfLevel"
            defaultValue={profile.selfLevel}
            disabled={profile.ratedMatches > 0}
          >
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="openToNew" defaultChecked={profile.openToNew} />
          Open to new players
        </label>
        <fieldset>
          <legend className="text-sm">Preferred places</legend>
          {locations.map((location) => (
            <label key={location.id} className="mt-1 flex items-center gap-2">
              <input
                type="checkbox"
                name="locationId"
                value={location.id}
                defaultChecked={profile.locationIds.includes(location.id)}
              />
              {location.name}
            </label>
          ))}
        </fieldset>
        <button className="rounded-md bg-green-900 px-4 py-2 text-white" type="submit">
          Save
        </button>
      </form>
    </div>
  );
}
