import { createHash } from "node:crypto";

export const SEED_PASSWORD = process.env.E2E_USER_PASSWORD || "Password123!";

export const SEED_USERS = {
  guilherme: { email: "guilherme@test.local", name: "Guilherme" },
  joao: { email: "joao@test.local", name: "João" },
  pedro: { email: "pedro@test.local", name: "Pedro" },
  lucas: { email: "lucas@test.local", name: "Lucas" },
  rafael: { email: "rafael@test.local", name: "Rafael" },
  andre: { email: "andre@test.local", name: "André" },
} as const;

export type SeedUserKey = keyof typeof SEED_USERS;

export const SEED_IDS = {
  listSaturday: "seed_list_guilherme_saturday",
  oppPedro: "seed_opp_pedro_sunday",
  invPedroGuilherme: "seed_inv_pedro_guilherme",
  invPedroJoao: "seed_inv_pedro_joao",
  availJoao: "seed_avail_joao_saturday",
  matchBeatJoao: "seed_match_guilherme_beat_joao",
  matchLostJoao: "seed_match_guilherme_lost_joao",
  matchBeatPedro: "seed_match_guilherme_beat_pedro",
  matchLucas: "seed_match_guilherme_lucas",
  notifPedroGuilherme: "seed_notif_pedro_guilherme",
  notifPedroJoao: "seed_notif_pedro_joao",
} as const;

export function seedToken(label: string): string {
  return createHash("sha256").update(`tennis-seed:${label}`).digest("hex").slice(0, 36);
}

export const SEED_TOKENS = {
  pedroGuilherme: seedToken("pedro-invite-guilherme"),
  pedroJoao: seedToken("pedro-invite-joao"),
} as const;
