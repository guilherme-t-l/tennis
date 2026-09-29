// Notifications. Each item opens the request, match, or result it is about.

import { openNotification } from "@/lib/actions/notifications";
import { requireUser } from "@/lib/firebase/session";
import { listNotifications } from "@/lib/queries/reads";

export default async function InboxPage() {
  const uid = await requireUser();
  const items = await listNotifications(uid);
  return (
    <div>
      <h1 className="text-2xl font-semibold">Notifications</h1>
      {items.length === 0 ? <p className="mt-3 text-sm text-stone-600">You&apos;re all caught up.</p> : null}
      <ul className="mt-4 flex flex-col gap-2">
        {items.map((item) => (
          <li key={item.id}>
            <form action={openNotification}>
              <input type="hidden" name="id" value={item.id} />
              <input type="hidden" name="href" value={item.href} />
              <button
                className={`w-full rounded-lg bg-white px-3 py-3 text-left ${item.readAt ? "text-stone-600" : "font-medium"}`}
                data-type={item.type}
                type="submit"
              >
                {item.title}
              </button>
            </form>
          </li>
        ))}
      </ul>
    </div>
  );
}
