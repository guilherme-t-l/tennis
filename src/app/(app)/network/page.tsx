// Network "Your tennis network": people you know, friends of friends, nearby, and who is free.

import Link from "next/link";
import { acceptConnection, requestConnection } from "@/lib/actions/connections";
import { requireUser } from "@/lib/firebase/session";
import {
  loadCurrentlyAvailable,
  loadKnown,
  loadNearby,
  loadSecondDegree,
  searchProfiles,
} from "@/lib/queries/network";
import { listConnections } from "@/lib/queries/reads";

const tabs = [
  { id: "known", label: "People you know" },
  { id: "second", label: "People connected to people you know" },
  { id: "nearby", label: "Nearby compatible" },
  { id: "available", label: "Currently available" },
] as const;

export default async function NetworkPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; q?: string; error?: string }>;
}) {
  const query = await searchParams;
  const uid = await requireUser();
  const tab = tabs.some((item) => item.id === query.tab) ? query.tab : "known";
  const [known, second, nearby, available, results, connections] = await Promise.all([
    loadKnown(uid),
    tab === "second" ? loadSecondDegree(uid) : Promise.resolve([]),
    tab === "nearby" ? loadNearby(uid) : Promise.resolve([]),
    tab === "available" ? loadCurrentlyAvailable(uid) : Promise.resolve([]),
    query.q ? searchProfiles(query.q, uid) : Promise.resolve([]),
    listConnections(uid),
  ]);
  const related = new Map(
    connections.map((connection) => [
      connection.participantIds.find((id) => id !== uid) ?? "",
      connection,
    ]),
  );

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Your tennis network</h1>
      <form className="flex gap-2" action="/network">
        <input type="hidden" name="tab" value={tab ?? "known"} />
        <label className="flex flex-1 flex-col gap-1 text-sm">
          Search players
          <input className="rounded-md border border-stone-300 px-3 py-2" name="q" defaultValue={query.q ?? ""} />
        </label>
        <button className="self-end rounded-md border border-stone-300 px-4 py-2" type="submit">
          Search
        </button>
      </form>
      {query.error ? <p className="text-sm text-red-700">{query.error}</p> : null}
      {query.q ? (
        <section aria-label="Search results">
          <ul className="flex flex-col gap-2">
            {results.map((profile) => {
              const connection = related.get(profile.id);
              return (
                <li key={profile.id} className="flex items-center justify-between rounded-lg bg-white p-3">
                  <Link href={`/players/${profile.id}`}>{profile.displayName}</Link>
                  {connection?.status === "accepted" ? (
                    <span>Connected</span>
                  ) : connection?.status === "pending" ? (
                    <span>Requested</span>
                  ) : (
                    <form action={requestConnection}>
                      <input type="hidden" name="addresseeId" value={profile.id} />
                      <button className="rounded-md bg-green-900 px-3 py-1 text-white" type="submit">
                        Connect
                      </button>
                    </form>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
      <div className="flex flex-wrap gap-3 text-sm" role="tablist">
        {tabs.map((item) => (
          <Link key={item.id} href={`/network?tab=${item.id}`} role="tab" aria-selected={tab === item.id}>
            {item.label}
          </Link>
        ))}
      </div>
      {tab === "known" ? (
        <section aria-label="People you know">
          <ul className="flex flex-col gap-2">
            {known.map(({ profile, connection }) => (
              <li key={connection.id} className="flex items-center justify-between rounded-lg bg-white p-3">
                <Link href={`/players/${profile.id}`}>{profile.displayName}</Link>
                {connection.status === "pending" && connection.addresseeId === uid ? (
                  <form action={acceptConnection}>
                    <input type="hidden" name="connectionId" value={connection.id} />
                    <button className="rounded-md bg-green-900 px-3 py-1 text-white" type="submit">
                      Accept
                    </button>
                  </form>
                ) : (
                  <span>{connection.status === "accepted" ? "Connected" : "Requested"}</span>
                )}
              </li>
            ))}
          </ul>
          <p className="mt-4">
            <Link href="/network/lists">Match lists</Link>
          </p>
        </section>
      ) : null}
      {tab === "second" ? (
        <section aria-label="People connected to people you know">
          <ul className="flex flex-col gap-2">
            {second.map((person) => (
              <li key={person.profile.id} className="flex items-center justify-between rounded-lg bg-white p-3">
                <span>
                  {person.profile.displayName} · via {person.viaName} · {person.level}
                </span>
                <form action={requestConnection}>
                  <input type="hidden" name="addresseeId" value={person.profile.id} />
                  <button className="rounded-md bg-green-900 px-3 py-1 text-white" type="submit">
                    Connect
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {tab === "nearby" ? (
        <section aria-label="Nearby compatible">
          <ul className="flex flex-col gap-2">
            {nearby.map((person) => (
              <li key={person.profile.id} className="flex items-center justify-between rounded-lg bg-white p-3">
                <span>
                  {person.profile.displayName} · {person.level}
                </span>
                <form action={requestConnection}>
                  <input type="hidden" name="addresseeId" value={person.profile.id} />
                  <button className="rounded-md bg-green-900 px-3 py-1 text-white" type="submit">
                    Connect
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {tab === "available" ? (
        <section aria-label="Currently available">
          <ul className="flex flex-col gap-2">
            {available.map((person) => (
              <li key={person.profile.id} className="rounded-lg bg-white p-3">
                <p>{person.profile.displayName}</p>
                <p>{person.label}</p>
                <Link href={person.href}>Fix a match</Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
