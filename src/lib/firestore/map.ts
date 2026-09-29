// Turns stored timestamps into dates for the screens. Not a product rule.

export function asDate(value: unknown): Date {
  if (value instanceof Date) return value;
  if (
    value &&
    typeof value === "object" &&
    "toDate" in value &&
    typeof (value as { toDate: unknown }).toDate === "function"
  ) {
    return (value as { toDate: () => Date }).toDate();
  }
  return new Date(0);
}

export function asDateOrNull(value: unknown): Date | null {
  if (value == null) return null;
  return asDate(value);
}
