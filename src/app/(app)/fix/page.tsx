// Fix a match: when, where, format, and who.
// A list becomes the people in it. Sending creates one opportunity for all of them.

import { createOpportunity } from "@/lib/actions/opportunities";
import { dateInputValue, timeInputValue } from "@/lib/format";
import { requireUser } from "@/lib/firebase/session";
import type { Format } from "@/lib/firestore/types";
import { getProfiles, listConnections, listLists, listLocations } from "@/lib/queries/reads";

export default async function FixPage({
  searchParams,
}: {
  searchParams: Promise<{ with?: string; at?: string; location?: string; format?: string; list?: string; error?: string }>;
}) {
  const query = await searchParams;
  const uid = await requireUser();
  const [locations, connections, lists] = await Promise.all([
    listLocations(),
    listConnections(uid),
    listLists(uid),
  ]);
  const accepted = connections.filter((connection) => connection.status === "accepted");
  const otherIds = accepted.map((connection) => connection.participantIds.find((id) => id !== uid) ?? "");
  const profiles = await getProfiles(otherIds);
  const prefillAt = query.at ? new Date(query.at) : null;
  const format = query.format === "doubles" ? "doubles" : "singles";

  return (
    <div>
      <h1 className="text-2xl font-semibold">Fix a match</h1>
      <p className="mt-1 text-sm text-stone-600">When? Where? Who?</p>
      {query.error ? <p className="mt-3 text-sm text-red-700">{query.error}</p> : null}
      <form action={createOpportunity} className="mt-4 flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm">
          Date
          <input
            className="rounded-md border border-stone-300 px-3 py-2"
            type="date"
            name="date"
            required
            defaultValue={prefillAt ? dateInputValue(prefillAt) : undefined}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Time
          <input
            className="rounded-md border border-stone-300 px-3 py-2"
            type="time"
            name="time"
            required
            defaultValue={prefillAt ? timeInputValue(prefillAt) : "10:00"}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Duration
          <select className="rounded-md border border-stone-300 px-3 py-2" name="durationMin" defaultValue="90">
            <option value="60">60 min</option>
            <option value="90">90 min</option>
            <option value="120">120 min</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Where
          <select
            className="rounded-md border border-stone-300 px-3 py-2"
            name="locationId"
            defaultValue={query.location || locations[0]?.id}
          >
            {locations.map((location) => (
              <option key={location.id} value={location.id}>
                {location.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Add a place
          <input className="rounded-md border border-stone-300 px-3 py-2" name="newLocation" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Format
          <select className="rounded-md border border-stone-300 px-3 py-2" name="format" defaultValue={format satisfies Format}>
            <option value="singles">Singles</option>
            <option value="doubles">Doubles</option>
          </select>
        </label>
        <fieldset>
          <legend className="text-sm font-medium">Who</legend>
          <div className="mt-2 flex flex-col gap-2">
            {lists.map((list) => (
              <label key={list.id} className="flex items-center gap-2">
                <input type="checkbox" name="listId" value={list.id} defaultChecked={query.list === list.id} />
                {list.name}
              </label>
            ))}
            {otherIds.map((id) => {
              const profile = profiles.get(id);
              if (!profile) return null;
              return (
                <label key={id} className="flex items-center gap-2">
                  <input type="checkbox" name="connectionId" value={id} defaultChecked={query.with === id} />
                  {profile.displayName}
                </label>
              );
            })}
          </div>
        </fieldset>
        <label className="flex flex-col gap-1 text-sm">
          Note
          <textarea className="rounded-md border border-stone-300 px-3 py-2" name="note" maxLength={200} />
        </label>
        <button className="rounded-md bg-green-900 px-4 py-2 text-white" type="submit">
          Send invitation
        </button>
      </form>
    </div>
  );
}
