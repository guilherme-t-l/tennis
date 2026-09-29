import { readFileSync } from "node:fs";
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { Timestamp, collection, getDocs, orderBy, query, where, type Firestore } from "firebase/firestore";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { nextSaturday10 } from "@/lib/dates";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { publishAvailability } from "@/lib/firestore/publish-availability";
import { SEED_USERS } from "@/lib/seed-ids";

let testEnv: RulesTestEnvironment;
let guilherme = "";
let joao = "";
let andre = "";

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
  andre = (await adminAuth().getUserByEmail(SEED_USERS.andre.email)).uid;
});

afterAll(async () => {
  await testEnv.cleanup();
});

function client(uid: string): Firestore {
  return testEnv.authenticatedContext(uid).firestore() as unknown as Firestore;
}

async function countNotes(profileId: string): Promise<number> {
  const snap = await adminDb().collection("notifications").where("profileId", "==", profileId).get();
  return snap.docs.filter((doc) => doc.data().type === "availability_match").length;
}

function activeTimes(uid: string, profileId: string) {
  return query(
    collection(client(uid), "availabilities"),
    where("profileId", "==", profileId),
    where("status", "==", "active"),
    where("endsAt", ">", Timestamp.fromDate(new Date("2020-01-01T00:00:00.000Z"))),
    orderBy("endsAt", "asc"),
  );
}

describe("availability rules", () => {
  it("lets a connection read João's times and refuses André", async () => {
    const allowed = await assertSucceeds(getDocs(activeTimes(guilherme, joao)));
    expect(allowed.empty).toBe(false);
    await assertFails(getDocs(activeTimes(andre, joao)));
  });

  it("notifies both players for a compatible time and nobody for a different place", async () => {
    const start = nextSaturday10();
    const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
    const beforeGuilherme = await countNotes(guilherme);
    const beforeJoao = await countNotes(joao);
    const compatible = await publishAvailability(guilherme, {
      startsAt: start,
      endsAt: end,
      locationId: "belvedere",
      locationName: "Belvedere",
      format: "singles",
    });
    expect(compatible.ok && compatible.notified).toBe(2);
    expect(await countNotes(guilherme)).toBe(beforeGuilherme + 1);
    expect(await countNotes(joao)).toBe(beforeJoao + 1);

    const other = await publishAvailability(guilherme, {
      startsAt: start,
      endsAt: end,
      locationId: "pampulha",
      locationName: "Pampulha",
      format: "singles",
    });
    expect(other.ok && other.notified).toBe(0);
    expect(await countNotes(guilherme)).toBe(beforeGuilherme + 1);
    expect(await countNotes(joao)).toBe(beforeJoao + 1);
  });
});
