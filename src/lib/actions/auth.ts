"use server";

// Sign up and sign in. completeSignUp creates the profile and the starting rating for the declared level.
// The player id comes from the verified token, not from the form.

import { FieldValue } from "firebase-admin/firestore";
import { redirect } from "next/navigation";
import { z } from "zod";
import { initialRating } from "@/lib/domain/level";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { refreshApp } from "@/lib/firebase/revalidate";
import { clearSessionCookie, setSessionCookie } from "@/lib/firebase/session";
import { getProfile } from "@/lib/queries/reads";

const signUpSchema = z.object({
  displayName: z.string().trim().min(1, "Enter your name.").max(40),
  selfLevel: z.enum(["beginner", "intermediate", "advanced"]),
});

export async function completeSignUp(idToken: string, displayName: string, selfLevel: string) {
  const parsed = signUpSchema.safeParse({ displayName, selfLevel });
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  }
  let uid = "";
  try {
    const decoded = await adminAuth().verifyIdToken(idToken);
    uid = decoded.uid;
  } catch {
    return { ok: false as const, error: "Sign-up failed. Try again." };
  }
  const existing = await getProfile(uid);
  if (!existing) {
    const name = parsed.data.displayName;
    await adminDb().collection("profiles").doc(uid).set({
      displayName: name,
      displayNameLower: name.toLowerCase(),
      avatarUrl: null,
      selfLevel: parsed.data.selfLevel,
      rating: initialRating(parsed.data.selfLevel),
      ratedMatches: 0,
      openToNew: true,
      city: "",
      locationIds: [],
      createdAt: FieldValue.serverTimestamp(),
    });
  }
  await setSessionCookie(idToken);
  refreshApp();
  return { ok: true as const, next: existing ? "/" : "/onboarding" };
}

export async function createSession(idToken: string) {
  try {
    await adminAuth().verifyIdToken(idToken);
  } catch {
    return { ok: false as const, error: "Sign-in failed. Try again." };
  }
  await setSessionCookie(idToken);
  refreshApp();
  return { ok: true as const };
}

export async function signOut() {
  await clearSessionCookie();
  redirect("/login");
}
