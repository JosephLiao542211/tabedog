import type { Restaurant } from "./types";

export const fmtDist = (m: number | null | undefined) =>
  m == null ? "" : m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`;

// Tabelog budgets look like "¥1,000～¥1,999", "～¥999" / "-¥999" (under), or "¥10,000～" (and up)
export function fmtPrice(s: string | undefined): string {
  if (!s) return "";
  const n = s.match(/[\d,]+/g) || [];
  const [a, b] = n;
  if (a === undefined) return "";
  if (s.startsWith("-")) return `under ¥${(+a.replace(/,/g, "") + 1).toLocaleString()}`;
  return b !== undefined ? `¥${a}–${b}` : `¥${a}+`;
}

/** Numeric budget for sorting: the lower bound in yen, or the "under" cap. null when Tabelog gives nothing. */
export function priceYen(s: string | undefined): number | null {
  if (!s) return null;
  const n = (s.match(/[\d,]+/g) || []).map((v) => Number(v.replace(/,/g, "")));
  return n.length ? n[0] : null;
}
export const priceYenOf = (r: Restaurant, meal: "dinner" | "lunch") =>
  priceYen(meal === "lunch" ? r.lunch || r.dinner : r.dinner || r.lunch);

export const priceOf = (r: Restaurant, meal: "dinner" | "lunch") =>
  fmtPrice(meal === "lunch" ? r.lunch || r.dinner : r.dinner || r.lunch);

/** Tabelog's 640x640 variant only exists for hash-named photos; older numeric-ID photos 404 there, so leave those alone. */
export const bigPhoto = (u: string | null | undefined): string | null =>
  u ? (/_[0-9a-f]{32}\.jpe?g$/i.test(u) ? u.replace(/\/\d+x\d+_(?:square|rect)_/, "/640x640_rect_") : u) : null;
