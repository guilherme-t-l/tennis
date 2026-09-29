"use server";

// Save name, preferred places, and whether you are open to new players.
// The self-declared level can change only before any rated match. The rating itself stays put.

import { redirect } from "next/navigation";
import { z } from "zod";
import { adminDb } from "@/lib/firebase/admin";
import { refreshApp } from "@/lib/firebase/revalidate";
import { requireUser } from "@/lib/firebase/session";
import { getProfile } from "@/lib/queries/reads";

const profileSchema = z.object({
  displayName: z.string().trim().min(1, "Enter your name.").max(40),
  openToNew: z.boolean(),
  selfLevel: z.enum(["beginner", "intermediate", "advanced"]),
  locationIds: z.array(z.string()),
});

export async function saveProfile(formData: FormData) {
  const uid = await requireUser();
  const current = await getProfile(uid);
  if (!current) redirect("/signup");
  const parsed = profileSchema.safeParse({
    displayName: formData.get("displayName"),
    openToNew: formData.get("openToNew") === "on",
    selfLevel: formData.get("selfLevel") || current.selfLevel,
    locationIds: formData.getAll("locationId").map(String),
  });
  if (!parsed.success) {
    redirect("/profile?error=" + encodeURIComponent(parsed.error.issues[0]?.message ?? "Check the form."));
  }
  const update: Record<string, unknown> = {
    displayName: parsed.data.displayName,
    displayNameLower: parsed.data.displayName.toLowerCase(),
    openToNew: parsed.data.openToNew,
    locationIds: parsed.data.locationIds,
  };
  if (current.ratedMatches === 0) update.selfLevel = parsed.data.selfLevel;
  await adminDb().collection("profiles").doc(uid).update(update);
  refreshApp();
  redirect("/profile");
}

export async function saveOnboarding(formData: FormData) {
  const uid = await requireUser();
  const locationIds = formData.getAll("locationId").map(String);
  await adminDb().collection("profiles").doc(uid).update({ locationIds });
  refreshApp();
  redirect("/");
}
