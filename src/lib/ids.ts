export function pairId(a: string, b: string): string {
  return [a, b].sort().join("_");
}

export function slugify(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function nameKey(ownerId: string, name: string): string {
  return `${ownerId}:${name.trim().toLowerCase()}`;
}

export function prefixEnd(prefix: string): string {
  const chars = Array.from(prefix);
  const last = chars.pop();
  if (!last) return `${prefix}\uf8ff`;
  const code = last.codePointAt(0) ?? 0;
  return `${chars.join("")}${String.fromCodePoint(code + 1)}`;
}
