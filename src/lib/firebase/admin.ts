// Admin app. Used by actions, seed, and emulator tests.
// It talks to the emulators when FIRESTORE_EMULATOR_HOST is set, and does not need a service account there.
import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

function projectId(): string {
  return process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT || "demo-tennis";
}

function createApp(): App {
  const usingEmulator = Boolean(
    process.env.FIRESTORE_EMULATOR_HOST || process.env.FIREBASE_AUTH_EMULATOR_HOST,
  );
  if (usingEmulator) {
    return initializeApp({ projectId: projectId() });
  }
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    return initializeApp({
      credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON) as Record<string, string>),
      projectId: projectId(),
    });
  }
  return initializeApp({ projectId: projectId() });
}

export function adminApp(): App {
  return getApps()[0] ?? createApp();
}

let firestoreReady = false;

export function adminDb(): Firestore {
  const db = getFirestore(adminApp());
  if (!firestoreReady) {
    try {
      db.settings({ ignoreUndefinedProperties: true });
    } catch {
      // The app was already used in this process.
    }
    firestoreReady = true;
  }
  return db;
}

export function adminAuth(): Auth {
  return getAuth(adminApp());
}
