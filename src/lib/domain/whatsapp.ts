// Text for Share on WhatsApp: name, format, when, where, and the invite link.
// The link opens the invite. It does not send a message and it does not include a phone number.

import { formatLabel, formatLongWhen, firstName } from "@/lib/format";
import type { Format } from "@/lib/firestore/types";

export function buildInviteMessage(input: {
  inviteeName: string;
  format: Format;
  startsAt: Date;
  locationName: string;
  token: string;
  appUrl?: string;
}): string {
  const appUrl = (input.appUrl || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(
    /\/$/,
    "",
  );
  return [
    firstName(input.inviteeName),
    formatLabel(input.format),
    formatLongWhen(input.startsAt),
    input.locationName,
    `${appUrl}/i/${input.token}`,
  ].join("\n");
}

export function buildWhatsAppShareUrl(message: string): string {
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}
