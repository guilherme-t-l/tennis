import { SAO_PAULO } from "@/lib/dates";
import type { Format } from "@/lib/firestore/types";

function parts(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: SAO_PAULO,
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
}

function part(date: Date, type: Intl.DateTimeFormatPartTypes): string {
  return parts(date).find((item) => item.type === type)?.value ?? "";
}

export function weekdayName(date: Date): string {
  return part(date, "weekday");
}

export function timeLabel(date: Date): string {
  const hour = part(date, "hour").padStart(2, "0");
  const minute = part(date, "minute").padStart(2, "0");
  return `${hour}:${minute}`;
}

export function monthDay(date: Date): string {
  return `${part(date, "month")} ${part(date, "day")}`;
}

export function formatLongWhen(date: Date): string {
  return `${weekdayName(date)}, ${monthDay(date)}, ${timeLabel(date)}`;
}

export function formatHeadline(startsAt: Date, locationName: string, format: Format): string {
  return `${weekdayName(startsAt)} · ${timeLabel(startsAt)} · ${locationName} · ${formatLabel(format)}`;
}

export function formatLabel(format: Format): string {
  return format === "singles" ? "Singles" : "Doubles";
}

export function dateInputValue(date: Date): string {
  const zoned = new Intl.DateTimeFormat("en-CA", {
    timeZone: SAO_PAULO,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
  return zoned;
}

export function timeInputValue(date: Date): string {
  return timeLabel(date);
}

export function firstName(displayName: string): string {
  return displayName.trim().split(/\s+/)[0] || displayName;
}

export function formatDelta(name: string, delta: number): string {
  const sign = delta > 0 ? "+" : "−";
  return `${name} ${sign}${Math.abs(delta)}`;
}

export function formatHistoryRow(delta: number, opponentName: string): string {
  const sign = delta > 0 ? "+" : "−";
  return `${sign}${Math.abs(delta)} vs ${opponentName}`;
}

export function availabilityWindowLabel(startsAt: Date, endsAt: Date, locationName: string): string {
  return `Available ${weekdayName(startsAt)} ${timeLabel(startsAt)}–${timeLabel(endsAt)} at ${locationName}`;
}

export function availabilitySuggestionText(name: string, locationName: string, startsAt: Date): string {
  return `You and ${name} are both available at ${locationName} ${weekdayName(startsAt)} at ${timeLabel(startsAt)}`;
}

export function availabilityPromptText(name: string, locationName: string, startsAt: Date): string {
  return `${name} is available ${weekdayName(startsAt)} at ${locationName}`;
}

export function invitationTitle(hostName: string, startsAt: Date, locationName: string): string {
  return `${hostName} invited you to play ${weekdayName(startsAt)} ${timeLabel(startsAt)} at ${locationName}`;
}

export function currentlyAvailableLabel(
  startsAt: Date,
  endsAt: Date,
  locationName: string,
  format: Format,
): string {
  return `${weekdayName(startsAt)} ${timeLabel(startsAt)}–${timeLabel(endsAt)} · ${locationName} · ${formatLabel(format)}`;
}
