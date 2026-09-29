export const SAO_PAULO = "America/Sao_Paulo";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

type ZonedParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  weekday: string;
};

export function zonedParts(date: Date, timeZone = SAO_PAULO): ZonedParts {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    weekday: "short",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return {
    year: Number(get("year")),
    month: Number(get("month")),
    day: Number(get("day")),
    hour: Number(get("hour")),
    minute: Number(get("minute")),
    weekday: get("weekday"),
  };
}

// America/Sao_Paulo is UTC−03:00 year round.
export function saoPauloToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
): Date {
  return new Date(Date.UTC(year, month - 1, day, hour + 3, minute, 0, 0));
}

export function atSaoPaulo(
  daysFromToday: number,
  hour: number,
  minute: number,
  now = new Date(),
): Date {
  const parts = zonedParts(now);
  const base = saoPauloToUtc(parts.year, parts.month, parts.day, hour, minute);
  return new Date(base.getTime() + daysFromToday * 86_400_000);
}

export function nextWeekdayAt(
  targetWeekday: number,
  hour: number,
  minute: number,
  now = new Date(),
): Date {
  const parts = zonedParts(now);
  const current = WEEKDAYS.indexOf(parts.weekday as (typeof WEEKDAYS)[number]);
  let add = (targetWeekday - current + 7) % 7;
  let candidate = atSaoPaulo(add, hour, minute, now);
  if (candidate.getTime() <= now.getTime()) {
    add += 7;
    candidate = atSaoPaulo(add, hour, minute, now);
  }
  return candidate;
}

export function nextSaturday10(now = new Date()): Date {
  return nextWeekdayAt(6, 10, 0, now);
}

export function nextSundayAt(hour: number, minute = 0, now = new Date()): Date {
  return nextWeekdayAt(0, hour, minute, now);
}

export function daysAgo(days: number, hour = 10, minute = 0, now = new Date()): Date {
  return atSaoPaulo(-days, hour, minute, now);
}
