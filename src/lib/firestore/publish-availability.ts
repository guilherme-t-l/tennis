// Publishing a time writes an availability match note for each connection who overlaps it.
// A different place, format, or level writes none.

import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { isCompatible, overlapWindow } from "@/lib/domain/availability";
import { availabilitySuggestionText } from "@/lib/format";
import { adminDb } from "@/lib/firebase/admin";
import type { Format } from "@/lib/firestore/types";
import { acceptedOtherIds, getProfile, getProfiles, listActiveAvailabilities } from "@/lib/queries/reads";

export async function publishAvailability(
  uid: string,
  input: {
    startsAt: Date;
    endsAt: Date;
    locationId: string;
    locationName: string;
    format: Format;
    note?: string;
  },
): Promise<{ ok: true; id: string; notified: number } | { ok: false; error: string }> {
  if (input.endsAt.getTime() <= input.startsAt.getTime()) {
    return { ok: false, error: "End must be after the start." };
  }
  const me = await getProfile(uid);
  if (!me) return { ok: false, error: "Finish your profile first." };
  const db = adminDb();
  const ref = db.collection("availabilities").doc();
  const otherIds = await acceptedOtherIds(uid);
  const profiles = await getProfiles(otherIds);
  const notes: FirebaseFirestore.DocumentData[] = [];
  for (let index = 0; index < otherIds.length; index += 30) {
    const wave = otherIds.slice(index, index + 30);
    const grouped = await Promise.all(
      wave.map(async (profileId) => ({
        profileId,
        rows: await listActiveAvailabilities(profileId, new Date()),
      })),
    );
    for (const group of grouped) {
      const other = profiles.get(group.profileId);
      if (!other) continue;
      const row = group.rows.find((candidate) =>
        isCompatible(input, candidate, me.rating, other.rating),
      );
      if (!row) continue;
      const overlap = overlapWindow(input, row);
      const start = overlap?.start ?? row.startsAt;
      const hrefForMe = `/fix?with=${other.id}&at=${start.toISOString()}&location=${input.locationId}&format=${input.format}`;
      const hrefForThem = `/fix?with=${uid}&at=${start.toISOString()}&location=${input.locationId}&format=${input.format}`;
      notes.push(
        {
          profileId: uid,
          type: "availability_match",
          title: availabilitySuggestionText(other.displayName, input.locationName, start),
          body: availabilitySuggestionText(other.displayName, input.locationName, start),
          href: hrefForMe,
          readAt: null,
          createdAt: FieldValue.serverTimestamp(),
        },
        {
          profileId: other.id,
          type: "availability_match",
          title: availabilitySuggestionText(me.displayName, input.locationName, start),
          body: availabilitySuggestionText(me.displayName, input.locationName, start),
          href: hrefForThem,
          readAt: null,
          createdAt: FieldValue.serverTimestamp(),
        },
      );
    }
  }

  const batch = db.batch();
  batch.set(ref, {
    profileId: uid,
    startsAt: Timestamp.fromDate(input.startsAt),
    endsAt: Timestamp.fromDate(input.endsAt),
    locationId: input.locationId,
    locationName: input.locationName,
    format: input.format,
    note: input.note ?? "",
    status: "active",
    createdAt: FieldValue.serverTimestamp(),
  });
  for (const note of notes) {
    batch.set(db.collection("notifications").doc(), note);
  }
  await batch.commit();
  return { ok: true, id: ref.id, notified: notes.length };
}

export async function cancelAvailability(uid: string, availabilityId: string): Promise<{ ok: boolean; error?: string }> {
  const db = adminDb();
  const ref = db.collection("availabilities").doc(availabilityId);
  const snap = await ref.get();
  if (!snap.exists) return { ok: false, error: "That time is gone." };
  if (snap.data()?.profileId !== uid) return { ok: false, error: "You can only cancel your own time." };
  await ref.update({ status: "cancelled" });
  return { ok: true };
}
