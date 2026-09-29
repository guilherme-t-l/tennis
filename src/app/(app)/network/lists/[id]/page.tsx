// One list. Add or remove people, or fix a match with the whole list.

import Link from "next/link";
import { notFound } from "next/navigation";
import { addListMember, deleteList, removeListMember, renameList } from "@/lib/actions/lists";
import { requireUser } from "@/lib/firebase/session";
import { acceptedOtherIds, getList, getProfiles } from "@/lib/queries/reads";

export default async function ListDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const uid = await requireUser();
  const list = await getList(id);
  if (!list || list.ownerId !== uid) notFound();
  const [members, connectionIds] = await Promise.all([getProfiles(list.memberIds), acceptedOtherIds(uid)]);
  const candidates = await getProfiles(connectionIds.filter((candidate) => !list.memberIds.includes(candidate)));

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">
        {list.name} ({list.memberIds.length})
      </h1>
      <section aria-label="Members">
        <ul className="flex flex-col gap-2">
          {list.memberIds.map((memberId) => (
            <li key={memberId} className="flex items-center justify-between">
              <span>{members.get(memberId)?.displayName ?? "Player"}</span>
              <form action={removeListMember}>
                <input type="hidden" name="listId" value={list.id} />
                <input type="hidden" name="memberId" value={memberId} />
                <button type="submit">Remove</button>
              </form>
            </li>
          ))}
        </ul>
      </section>
      <form action={addListMember} className="flex gap-2">
        <input type="hidden" name="listId" value={list.id} />
        <label className="flex flex-col gap-1 text-sm">
          Add a player
          <select className="rounded-md border border-stone-300 px-3 py-2" name="memberId">
            {[...candidates.values()].map((profile) => (
              <option key={profile.id} value={profile.id}>
                {profile.displayName}
              </option>
            ))}
          </select>
        </label>
        <button className="self-end rounded-md border border-stone-300 px-4 py-2" type="submit">
          Add
        </button>
      </form>
      <Link className="text-green-900" href={`/fix?list=${list.id}`}>
        Fix a match with this list
      </Link>
      <form action={renameList} className="flex gap-2">
        <input type="hidden" name="listId" value={list.id} />
        <input className="rounded-md border border-stone-300 px-3 py-2" name="name" defaultValue={list.name} />
        <button type="submit">Rename</button>
      </form>
      <form action={deleteList}>
        <input type="hidden" name="listId" value={list.id} />
        <button type="submit">Delete list</button>
      </form>
    </div>
  );
}
