import Link from "next/link";
import { signOut } from "@/lib/actions/auth";

const links = [
  { href: "/fix", label: "Fix" },
  { href: "/available", label: "Available" },
  { href: "/network", label: "Network" },
];

function InboxIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.25 13.5h3.86a2.25 2.25 0 0 1 2.012.241l1.091.546a2.25 2.25 0 0 0 2.012.241h.55a2.25 2.25 0 0 0 2.012-.241l1.091-.546a2.25 2.25 0 0 1 2.012-.241h3.86M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v12.452a1.875 1.875 0 0 1-1.875 1.875H4.875A1.875 1.875 0 0 1 3 17.226V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0 1 12 3Z"
      />
    </svg>
  );
}

function ProfileIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z"
      />
    </svg>
  );
}

export function AppNav({ unread }: { unread: number }) {
  return (
    <header className="border-b border-stone-200 bg-white">
      <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
        <Link href="/" className="font-semibold text-green-900">
          Tennis
        </Link>
        <nav className="flex flex-1 flex-wrap items-center gap-3 text-sm">
          {links.map((link) => (
            <Link key={link.href} href={link.href}>
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-1">
          <Link
            href="/inbox"
            aria-label={unread > 0 ? `Inbox, ${unread} unread` : "Inbox"}
            title="Inbox"
            className="relative inline-flex rounded-md p-1.5 text-stone-700 hover:bg-stone-100"
          >
            <InboxIcon />
            {unread > 0 ? (
              <span className="absolute -top-0.5 -right-0.5 min-w-4 rounded-full bg-green-900 px-1 text-center text-[10px] leading-4 text-white">
                {unread}
              </span>
            ) : null}
          </Link>
          <Link
            href="/profile"
            aria-label="Profile"
            title="Profile"
            className="inline-flex rounded-md p-1.5 text-stone-700 hover:bg-stone-100"
          >
            <ProfileIcon />
          </Link>
          <form action={signOut} className="ml-2">
            <button className="text-sm text-stone-600" type="submit">
              Sign out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
