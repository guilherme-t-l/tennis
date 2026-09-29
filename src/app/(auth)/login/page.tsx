// Sign in with email and password. Public page.

import Link from "next/link";
import { LoginForm } from "@/components/auth-forms";
import { safeNext } from "@/lib/firebase/session";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const query = await searchParams;
  const nextPath = safeNext(query.next);
  return (
    <main>
      <h1 className="mb-4 text-2xl font-semibold">Sign in</h1>
      <LoginForm nextPath={nextPath} />
      <p className="mt-4 text-sm">
        New here? <Link href="/signup">Sign up</Link>
      </p>
    </main>
  );
}
