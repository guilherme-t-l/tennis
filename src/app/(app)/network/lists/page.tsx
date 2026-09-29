// Match lists: named groups of people you already know.

import Link from "next/link";
import { createList } from "@/lib/actions/lists";
import { requireUser } from "@/lib/firebase/session";
import { listLists } from "@/lib/queries/reads";

export default async function ListsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const query = await searchParams;
  const uid = await requireUser();
  const lists = await listLists(uid);
  return (
    <div>
      <h1 className="text-2xl font-semibold">Match lists</h1>
      {query.error ? <p className="mt-3 text-sm text-red-700">{query.error}</p> : null}
      <ul className="mt-4 flex flex-col gap-2">
        {lists.map((list) => (
          <li key={list.id}>
            <Link href={`/network/lists/${list.id}`}>
              {list.name} ({list.memberIds.length})
            </Link>
          </li>
        ))}
      </ul>
      <form action={createList} className="mt-6 flex gap-2">
        <label className="flex flex-1 flex-col gap-1 text-sm">
          New list
          <input className="rounded-md border border-stone-300 px-3 py-2" name="name" required />
        </label>
        <button className="self-end rounded-md bg-green-900 px-4 py-2 text-white" type="submit">
          Create list
        </button>
      </form>
    </div>
  );
}
