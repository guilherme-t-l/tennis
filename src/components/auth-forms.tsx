"use client";

import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { useState } from "react";
import { completeSignUp, createSession } from "@/lib/actions/auth";
import { clientAuth } from "@/lib/firebase/client";

function authMessage(error: unknown): string {
  const code = typeof error === "object" && error && "code" in error ? String((error as { code: unknown }).code) : "";
  if (code.includes("email-already-in-use")) return "That email is already registered. Sign in instead.";
  if (code.includes("invalid-credential") || code.includes("wrong-password") || code.includes("user-not-found")) {
    return "Email or password is incorrect.";
  }
  if (error instanceof Error && error.message) return error.message;
  return "Something went wrong. Try again.";
}

export function LoginForm({ nextPath }: { nextPath: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError(null);
    try {
      const cred = await signInWithEmailAndPassword(
        clientAuth,
        String(form.get("email") ?? ""),
        String(form.get("password") ?? ""),
      );
      const idToken = await cred.user.getIdToken();
      const result = await createSession(idToken);
      if (!result.ok) {
        setError(result.error);
        setPending(false);
        return;
      }
      window.location.assign(nextPath);
    } catch (caught) {
      setError(authMessage(caught));
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm">
        Email
        <input className="rounded-md border border-stone-300 px-3 py-2" name="email" type="email" required />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Password
        <input className="rounded-md border border-stone-300 px-3 py-2" name="password" type="password" required />
      </label>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      <button className="rounded-md bg-green-900 px-4 py-2 text-white" type="submit" disabled={pending}>
        Sign in
      </button>
    </form>
  );
}

export function SignupForm() {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError(null);
    try {
      const cred = await createUserWithEmailAndPassword(
        clientAuth,
        String(form.get("email") ?? ""),
        String(form.get("password") ?? ""),
      );
      const idToken = await cred.user.getIdToken();
      const result = await completeSignUp(idToken, String(form.get("displayName") ?? ""), String(form.get("selfLevel") ?? ""));
      if (!result.ok) {
        setError(result.error);
        setPending(false);
        return;
      }
      window.location.assign(result.next);
    } catch (caught) {
      setError(authMessage(caught));
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm">
        Email
        <input className="rounded-md border border-stone-300 px-3 py-2" name="email" type="email" required />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Password
        <input className="rounded-md border border-stone-300 px-3 py-2" name="password" type="password" required minLength={6} />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Display name
        <input className="rounded-md border border-stone-300 px-3 py-2" name="displayName" required maxLength={40} />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Level
        <select className="rounded-md border border-stone-300 px-3 py-2" name="selfLevel" defaultValue="intermediate">
          <option value="beginner">Beginner</option>
          <option value="intermediate">Intermediate</option>
          <option value="advanced">Advanced</option>
        </select>
      </label>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      <button className="rounded-md bg-green-900 px-4 py-2 text-white" type="submit" disabled={pending}>
        Create account
      </button>
    </form>
  );
}
