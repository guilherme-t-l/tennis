"use server";

// The invitee must be signed in to respond. The token page is read-only until then.
// "I'm in" confirms this match. "Maybe" and "Can't play" leave it open.

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { respondToInvitation, respondViaToken } from "@/lib/firestore/accept-invitation";
import { requireUser } from "@/lib/firebase/session";
import type { InvitationResponse } from "@/lib/firestore/types";

const responseSchema = z.enum(["in", "maybe", "out", "none"]);

export async function respondToInvitationAction(formData: FormData) {
  const uid = await requireUser();
  const invitationId = String(formData.get("invitationId") ?? "");
  const parsed = responseSchema.safeParse(formData.get("response"));
  if (!invitationId || !parsed.success) return;
  await respondToInvitation(uid, invitationId, parsed.data as InvitationResponse);
  revalidatePath("/", "layout");
}

export async function respondViaTokenAction(formData: FormData) {
  const uid = await requireUser();
  const token = String(formData.get("token") ?? "");
  const parsed = responseSchema.safeParse(formData.get("response"));
  if (!token || !parsed.success) return;
  await respondViaToken(uid, token, parsed.data as InvitationResponse);
  revalidatePath("/", "layout");
}
