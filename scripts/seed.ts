import { config } from "dotenv";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { daysAgo, nextSaturday10, nextSundayAt } from "@/lib/dates";
import { pairId } from "@/lib/ids";
import { invitationTitle } from "@/lib/format";
import { SEED_IDS, SEED_PASSWORD, SEED_TOKENS, SEED_USERS } from "@/lib/seed-ids";
import { replaySeedResults } from "@/lib/seed-replay";

config({ path: ".env.local" });

type UserKey = keyof typeof SEED_USERS;

async function ensureUser(email: string, displayName: string): Promise<string> {
  try {
    const existing = await adminAuth().getUserByEmail(email);
    await adminAuth().updateUser(existing.uid, {
      password: SEED_PASSWORD,
      displayName,
      emailVerified: true,
    });
    return existing.uid;
  } catch (error) {
    const code = typeof error === "object" && error && "code" in error ? String((error as { code: unknown }).code) : "";
    if (code !== "auth/user-not-found") throw error;
    const created = await adminAuth().createUser({
      email,
      password: SEED_PASSWORD,
      displayName,
      emailVerified: true,
    });
    return created.uid;
  }
}

export async function seed(): Promise<void> {
  if (!process.env.FIRESTORE_EMULATOR_HOST && !process.env.FIREBASE_AUTH_EMULATOR_HOST) {
    throw new Error("Seed only runs against the Firebase emulators. Start them before npm run seed.");
  }
  const db = adminDb();
  const ids = {} as Record<UserKey, string>;
  for (const key of Object.keys(SEED_USERS) as UserKey[]) {
    ids[key] = await ensureUser(SEED_USERS[key].email, SEED_USERS[key].name);
  }

  const now = new Date();
  const replay = replaySeedResults(now);
  const ratings: Record<UserKey, { rating: number; ratedMatches: number; selfLevel: string; locationIds: string[] }> = {
    guilherme: { ...replay.guilherme, selfLevel: "intermediate", locationIds: ["belvedere"] },
    joao: { ...replay.joao, selfLevel: "intermediate", locationIds: ["belvedere"] },
    pedro: { ...replay.pedro, selfLevel: "intermediate", locationIds: ["belvedere"] },
    lucas: { ...replay.lucas, selfLevel: "advanced", locationIds: ["belvedere"] },
    rafael: { rating: 1500, ratedMatches: 0, selfLevel: "intermediate", locationIds: ["belvedere"] },
    andre: { rating: 1500, ratedMatches: 0, selfLevel: "intermediate", locationIds: [] },
  };

  const batch = db.batch();
  for (const place of [
    { id: "belvedere", name: "Belvedere" },
    { id: "minas-tenis-clube", name: "Minas Tênis Clube" },
    { id: "pampulha", name: "Pampulha" },
  ]) {
    batch.set(db.collection("locations").doc(place.id), {
      name: place.name,
      city: "Belo Horizonte",
      createdAt: FieldValue.serverTimestamp(),
    });
  }

  for (const key of Object.keys(SEED_USERS) as UserKey[]) {
    const user = SEED_USERS[key];
    const rating = ratings[key];
    batch.set(db.collection("profiles").doc(ids[key]), {
      displayName: user.name,
      displayNameLower: user.name.toLowerCase(),
      avatarUrl: null,
      selfLevel: rating.selfLevel,
      rating: rating.rating,
      ratedMatches: rating.ratedMatches,
      openToNew: true,
      city: "Belo Horizonte",
      locationIds: rating.locationIds,
      createdAt: FieldValue.serverTimestamp(),
    });
  }

  const connections: Array<[UserKey, UserKey, string]> = [
    ["guilherme", "joao", "seed_conn_guilherme_joao"],
    ["guilherme", "pedro", "seed_conn_guilherme_pedro"],
    ["guilherme", "lucas", "seed_conn_guilherme_lucas"],
    ["joao", "rafael", "seed_conn_joao_rafael"],
  ];
  for (const [requester, addressee, connectionId] of connections) {
    const pair = pairId(ids[requester], ids[addressee]);
    batch.set(db.collection("connections").doc(connectionId), {
      requesterId: ids[requester],
      addresseeId: ids[addressee],
      participantIds: [ids[requester], ids[addressee]],
      pairId: pair,
      status: "accepted",
      respondedAt: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp(),
    });
    batch.set(db.collection("connectionPairs").doc(pair), {
      status: "accepted",
      connectionId,
    });
  }

  batch.set(db.collection("matchLists").doc(SEED_IDS.listSaturday), {
    ownerId: ids.guilherme,
    name: "Saturday players",
    nameKey: `${ids.guilherme}:saturday players`,
    memberIds: [ids.joao, ids.pedro, ids.lucas],
    createdAt: FieldValue.serverTimestamp(),
  });

  const sunday = nextSundayAt(9, 0, now);
  batch.set(db.collection("opportunities").doc(SEED_IDS.oppPedro), {
    hostId: ids.pedro,
    participantIds: [ids.pedro, ids.guilherme, ids.joao],
    startsAt: Timestamp.fromDate(sunday),
    durationMin: 90,
    locationId: "belvedere",
    locationName: "Belvedere",
    format: "singles",
    note: "",
    status: "open",
    confirmedInvitationId: null,
    createdAt: FieldValue.serverTimestamp(),
  });

  const invites = [
    { id: SEED_IDS.invPedroGuilherme, invitee: "guilherme" as const, token: SEED_TOKENS.pedroGuilherme, notif: SEED_IDS.notifPedroGuilherme },
    { id: SEED_IDS.invPedroJoao, invitee: "joao" as const, token: SEED_TOKENS.pedroJoao, notif: SEED_IDS.notifPedroJoao },
  ];
  for (const invite of invites) {
    batch.set(db.collection("invitations").doc(invite.id), {
      opportunityId: SEED_IDS.oppPedro,
      hostId: ids.pedro,
      inviteeId: ids[invite.invitee],
      token: invite.token,
      response: "none",
      respondedAt: null,
      createdAt: FieldValue.serverTimestamp(),
    });
    batch.set(db.collection("inviteLinks").doc(invite.token), {
      startsAt: Timestamp.fromDate(sunday),
      durationMin: 90,
      format: "singles",
      status: "open",
      locationName: "Belvedere",
      hostDisplayName: "Pedro",
      hostAvatarUrl: null,
      inviteeDisplayName: SEED_USERS[invite.invitee].name,
      inviteeId: ids[invite.invitee],
      invitationId: invite.id,
      opportunityId: SEED_IDS.oppPedro,
      response: "none",
    });
    const title = invitationTitle("Pedro", sunday, "Belvedere");
    batch.set(db.collection("notifications").doc(invite.notif), {
      profileId: ids[invite.invitee],
      type: "invitation_received",
      title,
      body: title,
      href: `/opportunities/${SEED_IDS.oppPedro}`,
      readAt: null,
      createdAt: FieldValue.serverTimestamp(),
    });
  }

  const matchMeta = {
    "beat-pedro": { id: SEED_IDS.matchBeatPedro, opponent: "pedro" as const },
    "beat-joao": { id: SEED_IDS.matchBeatJoao, opponent: "joao" as const },
    "lost-joao": { id: SEED_IDS.matchLostJoao, opponent: "joao" as const },
  };
  for (const event of replay.events) {
    const meta = matchMeta[event.id];
    const opponentId = ids[meta.opponent];
    const winnerId = event.winner === "guilherme" ? ids.guilherme : ids[event.winner];
    batch.set(db.collection("matches").doc(meta.id), {
      opportunityId: meta.id,
      hostId: ids.guilherme,
      opponentId,
      participantIds: [ids.guilherme, opponentId],
      startsAt: Timestamp.fromDate(event.when),
      locationId: "belvedere",
      locationName: "Belvedere",
      format: "singles",
      status: "played",
      createdAt: Timestamp.fromDate(event.when),
    });
    batch.set(db.collection("results").doc(meta.id), {
      matchId: meta.id,
      reportedBy: ids.guilherme,
      winnerId,
      score: event.score,
      status: "confirmed",
      confirmedBy: opponentId,
      confirmedAt: Timestamp.fromDate(event.when),
      createdAt: Timestamp.fromDate(event.when),
    });
    const gBefore = event.before.guilherme.rating;
    const gAfter = event.after.guilherme.rating;
    const oppBefore = event.before[meta.opponent].rating;
    const oppAfter = event.after[meta.opponent].rating;
    batch.set(db.collection("ratingHistory").doc(`${meta.id}_guilherme`), {
      profileId: ids.guilherme,
      matchId: meta.id,
      opponentId,
      opponentName: SEED_USERS[meta.opponent].name,
      ratingBefore: gBefore,
      ratingAfter: gAfter,
      delta: gAfter - gBefore,
      createdAt: Timestamp.fromDate(event.when),
    });
    batch.set(db.collection("ratingHistory").doc(`${meta.id}_${meta.opponent}`), {
      profileId: opponentId,
      matchId: meta.id,
      opponentId: ids.guilherme,
      opponentName: "Guilherme",
      ratingBefore: oppBefore,
      ratingAfter: oppAfter,
      delta: oppAfter - oppBefore,
      createdAt: Timestamp.fromDate(event.when),
    });
  }

  const yesterday = daysAgo(1, 10, 0, now);
  batch.set(db.collection("matches").doc(SEED_IDS.matchLucas), {
    opportunityId: SEED_IDS.matchLucas,
    hostId: ids.guilherme,
    opponentId: ids.lucas,
    participantIds: [ids.guilherme, ids.lucas],
    startsAt: Timestamp.fromDate(yesterday),
    locationId: "belvedere",
    locationName: "Belvedere",
    format: "singles",
    status: "scheduled",
    createdAt: Timestamp.fromDate(yesterday),
  });

  const saturday = nextSaturday10(now);
  batch.set(db.collection("availabilities").doc(SEED_IDS.availJoao), {
    profileId: ids.joao,
    startsAt: Timestamp.fromDate(saturday),
    endsAt: Timestamp.fromDate(new Date(saturday.getTime() + 2 * 60 * 60 * 1000)),
    locationId: "belvedere",
    locationName: "Belvedere",
    format: "singles",
    note: "",
    status: "active",
    createdAt: FieldValue.serverTimestamp(),
  });

  await batch.commit();
  console.log("Seeded Guilherme, João, Pedro, Lucas, Rafael, and André.");
}

const invoked = process.argv[1]?.includes("seed.ts");
if (invoked) {
  seed()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
