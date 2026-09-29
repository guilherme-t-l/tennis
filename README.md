# Tennis

Fix a match with people you already play with. One opportunity can go to several players; the first "I'm in" confirms it and closes it for everyone else.

Local work uses the Firebase emulators only. The project id in this repo is `demo-tennis`. Do not invent a hosted project id and do not deploy until you supply a real one.

## Read it in this order

- `src/lib/domain/opportunity.ts` — what happens when someone says "I'm in"
- `src/app/(app)/page.tsx` and `src/app/(app)/fix/page.tsx` — what the player taps on Home and Fix a match
- `src/lib/actions/invitations.ts` — how that tap becomes one confirmed match
- `src/lib/firestore/accept-invitation.ts` — two people accepting at once still produce one confirmed match
- `src/app/(public)/i/[token]/page.tsx` — the invite link stays read-only until that player signs in
- `src/app/(app)/opportunities/[id]/page.tsx` — what the host and the other invitees see after "Match fixed"
- `src/lib/domain/elo.ts` — how a confirmed singles result changes both ratings
- `src/lib/firestore/confirm-result.ts` — confirming a singles result writes both ratings from `domain/elo.ts`

Next.js 16 names the request gate `src/proxy.ts` (the file used to be `middleware.ts`). It only checks that the `__session` cookie exists. Signed-out visitors may open `/login`, `/signup`, and `/i/[token]`.

## Prerequisites

- Node 24 and npm 11
- JDK 21+ (the Firestore emulator)
- A Firebase project id, only when you leave the emulators. Use location `southamerica-east1` (seed data and Playwright use `America/Sao_Paulo`). You must supply the real project id. This repo does not create a hosted project.

## Setup

```bash
cp .env.example .env.local
```

`.env.local` should keep `NEXT_PUBLIC_FIREBASE_PROJECT_ID=demo-tennis` and `NEXT_PUBLIC_FIREBASE_EMULATOR=true`. Never set `NEXT_PUBLIC_FIREBASE_EMULATOR` or the emulator host variables on Vercel.

```bash
npm run dev:emu
```

Open http://localhost:3000. In another terminal, with the emulators still running:

```bash
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 npm run seed
```

The Emulator UI is at http://localhost:4000. Auth is on 9099 and Firestore on 8080.

Playwright and `npm run test:db` start the emulators themselves and seed inside that process.

## Seeded logins

Password for every seeded player: `Password123!`

| Player | Email | Notes |
|---|---|---|
| Guilherme | guilherme@test.local | Intermediate, Belvedere, list "Saturday players" |
| João | joao@test.local | Connected to Guilherme and Rafael. Free next Saturday 10:00–12:00 at Belvedere |
| Pedro | pedro@test.local | Hosts an open Sunday 09:00 invite for Guilherme and João |
| Lucas | lucas@test.local | Played Guilherme yesterday; no result yet |
| Rafael | rafael@test.local | Connected only to João. Belvedere, open to new players |
| André | andre@test.local | No connections |

## Tests

```bash
npm run lint
npm run typecheck
npm test
npm run test:db
npm run test:e2e
npm run build
```

`npm test` is the product rules in `tests/unit` (no database). `npm run test:db` and `npm run test:e2e` need the JDK. End-to-end specs run serially in `America/Sao_Paulo`.

## Deploy later

1. Create or choose a Firebase project yourself and put its id in `.firebaserc` and the `NEXT_PUBLIC_FIREBASE_*` vars. Suggested Firestore location: `southamerica-east1`.
2. `npm run deploy:firebase` deploys rules, indexes, and the email/password provider. It does not deploy the Next.js app.
3. In Authentication settings, turn off email-verification requirements and add `localhost` to authorized domains.
4. On Vercel, set the public Firebase config, `FIREBASE_SERVICE_ACCOUNT_JSON`, and `NEXT_PUBLIC_APP_URL`. Do not set `NEXT_PUBLIC_FIREBASE_EMULATOR`.

## Phase status

- [x] Phase 0 — scaffold, auth, emulators, seed, check 1
- [x] Phase 1 — profile, connections, lists, fix a match, inbox, invite link
- [x] Phase 2 — record a result, confirm, rating
- [x] Phase 3 — availability and mutual suggestions
- [x] Phase 4 — discovery and home prompts
- [ ] Hosted Firebase project and `deploy:firebase` (needs your project id)
- [ ] Vercel preview
