import { redirect } from "next/navigation";
import { AppNav } from "@/components/nav";
import { requireUser } from "@/lib/firebase/session";
import { getProfile, unreadCount } from "@/lib/queries/reads";

// These screens depend on who is signed in, so they are drawn when that player opens them.
export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const uid = await requireUser();
  const profile = await getProfile(uid);
  if (!profile) redirect("/signup");
  const unread = await unreadCount(uid);
  return (
    <div className="min-h-full">
      <AppNav unread={unread} />
      <main className="mx-auto max-w-3xl px-4 py-6">{children}</main>
    </div>
  );
}
