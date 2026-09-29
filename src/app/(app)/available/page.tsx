// My times, plus cards for people who overlap them. Each card opens Fix a match.

import Link from "next/link";
import { cancelAvailabilityAction } from "@/lib/actions/availabilities";
import { availabilityWindowLabel } from "@/lib/format";
import { requireUser } from "@/lib/firebase/session";
import { mutualSuggestions } from "@/lib/queries/availabilities";
import { listActiveAvailabilities } from "@/lib/queries/reads";

export default async function AvailablePage() {
  const uid = await requireUser();
  const [mine, suggestions] = await Promise.all([
    listActiveAvailabilities(uid),
    mutualSuggestions(uid),
  ]);
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">My times</h1>
        <Link className="rounded-md bg-green-900 px-4 py-2 text-white" href="/available/new">
          I&apos;m available
        </Link>
      </div>
      <ul className="flex flex-col gap-2">
        {mine.map((row) => (
          <li key={row.id} className="flex items-center justify-between rounded-lg bg-white p-3">
            <span>{availabilityWindowLabel(row.startsAt, row.endsAt, row.locationName)}</span>
            <form action={cancelAvailabilityAction}>
              <input type="hidden" name="availabilityId" value={row.id} />
              <button className="text-sm" type="submit">
                Cancel
              </button>
            </form>
          </li>
        ))}
      </ul>
      <section aria-label="Suggestions">
        {suggestions.map((suggestion) => (
          // You and a connection are both free. Fix a match from the overlap.
          <article key={`${suggestion.profileId}-${suggestion.start.toISOString()}`} className="rounded-lg bg-white p-4">
            <p>{suggestion.text}</p>
            <Link className="mt-2 inline-block text-green-900" href={suggestion.href}>
              Fix a match
            </Link>
          </article>
        ))}
      </section>
    </div>
  );
}
