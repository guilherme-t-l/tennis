// Make myself available: date, start, end, place, format.

import { publishAvailabilityAction } from "@/lib/actions/availabilities";
import { listLocations } from "@/lib/queries/reads";

export default async function NewAvailabilityPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const query = await searchParams;
  const locations = await listLocations();
  return (
    <div>
      <h1 className="text-2xl font-semibold">When are you available?</h1>
      {query.error ? <p className="mt-3 text-sm text-red-700">{query.error}</p> : null}
      <form action={publishAvailabilityAction} className="mt-4 flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm">
          Date
          <input className="rounded-md border border-stone-300 px-3 py-2" type="date" name="date" required />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Start
          <input className="rounded-md border border-stone-300 px-3 py-2" type="time" name="start" required />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          End
          <input className="rounded-md border border-stone-300 px-3 py-2" type="time" name="end" required />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Where
          <select className="rounded-md border border-stone-300 px-3 py-2" name="locationId" defaultValue={locations[0]?.id}>
            {locations.map((location) => (
              <option key={location.id} value={location.id}>
                {location.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Format
          <select className="rounded-md border border-stone-300 px-3 py-2" name="format" defaultValue="singles">
            <option value="singles">Singles</option>
            <option value="doubles">Doubles</option>
          </select>
        </label>
        <button className="rounded-md bg-green-900 px-4 py-2 text-white" type="submit">
          Make available
        </button>
      </form>
    </div>
  );
}
