// requireUser() checks the session cookie and returns that player's id.
// The signed-in player always comes from the cookie, never from the form.
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { adminAuth } from "@/lib/firebase/admin";

export const SESSION_COOKIE = "__session";
const FIVE_DAYS_MS = 5 * 24 * 60 * 60 * 1000;

export async function setSessionCookie(idToken: string): Promise<void> {
  const session = await adminAuth().createSessionCookie(idToken, { expiresIn: FIVE_DAYS_MS });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, session, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: FIVE_DAYS_MS / 1000,
    path: "/",
    sameSite: "lax",
  });
}

export async function clearSessionCookie(): Promise<void> {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

export async function optionalUser(): Promise<string | null> {
  const jar = await cookies();
  const session = jar.get(SESSION_COOKIE)?.value;
  if (!session) return null;
  try {
    const decoded = await adminAuth().verifySessionCookie(session, false);
    return decoded.uid;
  } catch {
    return null;
  }
}

export async function requireUser(): Promise<string> {
  const uid = await optionalUser();
  if (!uid) redirect("/login");
  return uid;
}

export function safeNext(nextPath: string | undefined): string {
  if (!nextPath || !nextPath.startsWith("/") || nextPath.startsWith("//")) return "/";
  return nextPath;
}
