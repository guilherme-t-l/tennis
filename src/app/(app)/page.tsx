// Home "Want to play?": Fix a match, I'm available, Find an opponent, plus upcoming matches.

import Link from "next/link";
import { buildPrompts } from "@/lib/domain/prompts";
import { formatHeadline } from "@/lib/format";
import { requireUser } from "@/lib/firebase/session";
import { connectionWindows } from "@/lib/queries/availabilities";
import { getProfiles, listMatches } from "@/lib/queries/reads";

export default async function HomePage() {
  const uid = await requireUser();
  const now = new Date();
  const matches = await listMatches(uid);
  const upcoming = matches.filter((match) => match.status === "scheduled" && match.startsAt.getTime() > now.getTime());
  const awaiting = matches.filter((match) => match.status === "scheduled" && match.startsAt.getTime() <= now.getTime());
  const played = matches.filter((match) => match.status === "played");
  const opponentIds = matches.map((match) => match.participantIds.find((id) => id !== uid) ?? "");
  const profiles = await getProfiles(opponentIds);
  const last30 = played.filter((match) => match.startsAt.getTime() >= now.getTime() - 30 * 86_400_000);
  const lastPlayed = new Map<string, { id: string; name: string; lastPlayedAt: Date }>();
  for (const match of played) {
    const opponentId = match.participantIds.find((id) => id !== uid) ?? "";
    const current = lastPlayed.get(opponentId);
    if (!current || match.startsAt.getTime() > current.lastPlayedAt.getTime()) {
      lastPlayed.set(opponentId, {
        id: opponentId,
        name: profiles.get(opponentId)?.displayName ?? "Player",
        lastPlayedAt: match.startsAt,
      });
    }
  }
  const windows = await connectionWindows(uid, now);
  const prompts = buildPrompts({
    matchesLast30d: last30.length,
    lastPlayedByOpponent: [...lastPlayed.values()],
    connectionAvailabilities: windows.map((window) => ({
      profileId: window.profileId,
      name: window.name,
      locationId: window.locationId,
      locationName: window.locationName,
      format: window.format,
      startsAt: window.startsAt,
      endsAt: window.endsAt,
    })),
    now,
  });

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="text-3xl font-semibold">Want to play?</h1>
      </header>
      {/* The three home actions: fix a match, say you're available, or find an opponent. */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Link className="rounded-lg bg-green-900 px-4 py-5 text-center text-white" href="/fix">
          Fix a match
        </Link>
        <Link className="rounded-lg border border-green-900 px-4 py-5 text-center" href="/available/new">
          I&apos;m available
        </Link>
        <Link className="rounded-lg border border-stone-300 bg-white px-4 py-5 text-center" href="/network">
          Find an opponent
        </Link>
      </div>
      <section aria-label="Upcoming matches">
        <h2 className="text-lg font-semibold">Upcoming matches</h2>
        {upcoming.length === 0 ? <p className="mt-2 text-sm text-stone-600">No upcoming matches.</p> : null}
        <ul className="mt-2 flex flex-col gap-2">
          {upcoming.map((match) => {
            const opponent = profiles.get(match.participantIds.find((id) => id !== uid) ?? "");
            return (
              <li key={match.id}>
                <Link href={`/matches/${match.id}`}>
                  {formatHeadline(match.startsAt, match.locationName, match.format)} · {opponent?.displayName ?? "Opponent"}
                </Link>
              </li>
            );
          })}
        </ul>
      </section>
      <section aria-label="Awaiting result">
        <h2 className="text-lg font-semibold">How did it go?</h2>
        {awaiting.length === 0 ? <p className="mt-2 text-sm text-stone-600">Nothing waiting on a result.</p> : null}
        <ul className="mt-2 flex flex-col gap-2">
          {awaiting.map((match) => {
            const opponent = profiles.get(match.participantIds.find((id) => id !== uid) ?? "");
            return (
              <li key={match.id}>
                <Link href={`/matches/${match.id}`}>Record result vs {opponent?.displayName ?? "opponent"}</Link>
              </li>
            );
          })}
        </ul>
      </section>
      {/* Motivation: who is free, how often you played, who you have not played lately. */}
      <section aria-label="Motivation">
        <h2 className="text-lg font-semibold">Keep playing</h2>
        <ul className="mt-2 flex flex-col gap-3">
          {prompts.map((prompt) => (
            <li key={prompt.text} className="rounded-lg bg-white p-3">
              <p>{prompt.text}</p>
              {prompt.cta && prompt.href ? (
                <Link className="mt-1 inline-block text-sm text-green-900" href={prompt.href}>
                  {prompt.cta}
                </Link>
              ) : null}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
