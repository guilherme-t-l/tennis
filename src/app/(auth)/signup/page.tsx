// Sign up: display name and self-declared level, then preferred places.
// Public page. The starting rating comes from the level you pick.

import Link from "next/link";
import { SignupForm } from "@/components/auth-forms";

export default function SignupPage() {
  return (
    <main>
      <h1 className="mb-4 text-2xl font-semibold">Sign up</h1>
      <SignupForm />
      <p className="mt-4 text-sm">
        Already playing here? <Link href="/login">Sign in</Link>
      </p>
    </main>
  );
}
