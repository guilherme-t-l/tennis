// Profile: pick preferred places. Can skip.

import Link from "next/link";
import { saveOnboarding } from "@/lib/actions/profile";
import { listLocations } from "@/lib/queries/reads";

export default async function OnboardingPage() {
  const locations = await listLocations();
  return (
    <div>
      <h1 className="text-2xl font-semibold">Where do you play?</h1>
      <p className="mt-2 text-sm text-stone-600">Pick the places you prefer. You can skip this.</p>
      <form action={saveOnboarding} className="mt-4 flex flex-col gap-3">
        {locations.map((location) => (
          <label key={location.id} className="flex items-center gap-2">
            <input type="checkbox" name="locationId" value={location.id} />
            {location.name}
          </label>
        ))}
        <div className="flex gap-3">
          <button className="rounded-md bg-green-900 px-4 py-2 text-white" type="submit">
            Continue
          </button>
          <Link className="rounded-md border border-stone-300 px-4 py-2" href="/">
            Skip
          </Link>
        </div>
      </form>
    </div>
  );
}
