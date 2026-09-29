import { readFileSync } from "node:fs";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { collection, doc, getDoc, getDocs, query, setDoc, updateDoc, where, type Firestore } from "firebase/firestore";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { adminAuth } from "@/lib/firebase/admin";
import { SEED_IDS, SEED_TOKENS, SEED_USERS } from "@/lib/seed-ids";

let testEnv: RulesTestEnvironment;
let guilherme = "";
let joao = "";
let pedro = "";
let andre = "";

function dbFor(uid?: string): Firestore {
  const context = uid ? testEnv.authenticatedContext(uid) : testEnv.unauthenticatedContext();
  return context.firestore() as unknown as Firestore;
}

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: "demo-tennis",
    firestore: {
      rules: readFileSync("firestore.rules", "utf8"),
      host: "127.0.0.1",
      port: 8080,
    },
  });
  guilherme = (await adminAuth().getUserByEmail(SEED_USERS.guilherme.email)).uid;
  joao = (await adminAuth().getUserByEmail(SEED_USERS.joao.email)).uid;
  pedro = (await adminAuth().getUserByEmail(SEED_USERS.pedro.email)).uid;
  andre = (await adminAuth().getUserByEmail(SEED_USERS.andre.email)).uid;
});

afterAll(async () => {
  await testEnv.cleanup();
});

describe("firestore rules", () => {
  it("hides another player's lists, inbox, and availability", async () => {
    const andreDb = dbFor(andre);
    await assertFails(getDoc(doc(andreDb, "matchLists", SEED_IDS.listSaturday)));
    await assertFails(getDocs(query(collection(andreDb, "notifications"), where("profileId", "==", guilherme))));
    await assertFails(getDocs(query(collection(andreDb, "availabilities"), where("profileId", "==", guilherme))));
  });

  it("lets Guilherme read João's profile and refuses an update", async () => {
    const guilhermeDb = dbFor(guilherme);
    await assertSucceeds(getDoc(doc(guilhermeDb, "profiles", joao)));
    await assertFails(updateDoc(doc(guilhermeDb, "profiles", joao), { displayName: "Nope" }));
  });

  it("shows an opportunity only to its participants", async () => {
    await assertFails(getDoc(doc(dbFor(andre), "opportunities", SEED_IDS.oppPedro)));
    await assertSucceeds(getDoc(doc(dbFor(guilherme), "opportunities", SEED_IDS.oppPedro)));
  });

  it("lets an invitee say Maybe and refuses I'm in from the client", async () => {
    const guilhermeDb = dbFor(guilherme);
    const invitation = doc(guilhermeDb, "invitations", SEED_IDS.invPedroGuilherme);
    await assertFails(updateDoc(invitation, { response: "in" }));
    await assertSucceeds(updateDoc(invitation, { response: "maybe" }));
  });

  it("refuses client creates of matches, results, history, notifications, and invite links", async () => {
    const guilhermeDb = dbFor(guilherme);
    await assertFails(setDoc(doc(guilhermeDb, "matches", "client-match"), { participantIds: [guilherme] }));
    await assertFails(setDoc(doc(guilhermeDb, "results", "client-result"), { matchId: "client-match" }));
    await assertFails(setDoc(doc(guilhermeDb, "ratingHistory", "client-history"), { profileId: guilherme }));
    await assertFails(setDoc(doc(guilhermeDb, "notifications", "client-note"), { profileId: guilherme }));
    await assertFails(setDoc(doc(guilhermeDb, "inviteLinks", "client-token"), { status: "open" }));
  });

  it("refuses a player changing their own rating", async () => {
    await assertFails(updateDoc(doc(dbFor(guilherme), "profiles", guilherme), { rating: 2000 }));
  });

  it("refuses the host marking an opportunity confirmed", async () => {
    await assertFails(updateDoc(doc(dbFor(pedro), "opportunities", SEED_IDS.oppPedro), { status: "confirmed" }));
  });

  it("lets a signed-out visitor open one invite link and nothing else", async () => {
    const anon = dbFor();
    const link = await assertSucceeds(getDoc(doc(anon, "inviteLinks", SEED_TOKENS.pedroGuilherme)));
    expect(link.exists()).toBe(true);
    await assertFails(getDocs(collection(anon, "inviteLinks")));
    await assertFails(getDoc(doc(anon, "invitations", SEED_IDS.invPedroGuilherme)));
  });
});
