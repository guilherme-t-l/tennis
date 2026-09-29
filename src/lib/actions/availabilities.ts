"use server";

// Publish or cancel a time you can play.
// On publish, write an availability match for each connection who overlaps that time.

import { redirect } from "next/navigation";
import { z } from "zod";
import { saoPauloToUtc } from "@/lib/dates";
import { cancelAvailability, publishAvailability } from "@/lib/firestore/publish-availability";
import { refreshApp } from "@/lib/firebase/revalidate";
import { requireUser } from "@/lib/firebase/session";
import { slugify } from "@/lib/ids";
import { getLocation } from "@/lib/queries/reads";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";

const schema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  start: z.string().regex(/^\d{2}:\d{2}$/),
  end: z.string().regex(/^\d{2}:\d{2}$/),
  format: z.enum(["singles", "doubles"]),
  note: z.string().max(200).optional(),
});

export async function publishAvailabilityAction(formData: FormData) {
  const uid = await requireUser();
  const parsed = schema.safeParse({
    date: formData.get("date"),
    start: formData.get("start"),
    end: formData.get("end"),
    format: formData.get("format"),
    note: String(formData.get("note") ?? ""),
  });
  if (!parsed.success) redirect("/available/new?error=" + encodeURIComponent("Check the date and times."));
  const [year, month, day] = parsed.data.date.split("-").map(Number);
  const [startHour, startMinute] = parsed.data.start.split(":").map(Number);
  const [endHour, endMinute] = parsed.data.end.split(":").map(Number);
  const startsAt = saoPauloToUtc(year, month, day, startHour, startMinute);
  const endsAt = saoPauloToUtc(year, month, day, endHour, endMinute);

  const newPlace = String(formData.get("newLocation") ?? "").trim();
  let locationId = String(formData.get("locationId") ?? "");
  let locationName = "";
  if (newPlace) {
    locationId = slugify(newPlace);
    locationName = newPlace;
    await adminDb()
      .collection("locations")
      .doc(locationId)
      .set({ name: newPlace, city: "", createdAt: FieldValue.serverTimestamp() }, { merge: true });
  } else {
    const location = await getLocation(locationId);
    if (!location) redirect("/available/new?error=" + encodeURIComponent("Choose a place."));
    locationName = location.name;
  }

  const result = await publishAvailability(uid, {
    startsAt,
    endsAt,
    locationId,
    locationName,
    format: parsed.data.format,
    note: parsed.data.note,
  });
  if (!result.ok) redirect("/available/new?error=" + encodeURIComponent(result.error));
  refreshApp();
  redirect("/available");
}

export async function cancelAvailabilityAction(formData: FormData) {
  const uid = await requireUser();
  const availabilityId = String(formData.get("availabilityId") ?? "");
  await cancelAvailability(uid, availabilityId);
  refreshApp();
  redirect("/available");
}
