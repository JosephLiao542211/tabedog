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

export const priceOf = (r: Restaurant, meal: "dinner" | "lunch") =>
  fmtPrice(meal === "lunch" ? r.lunch || r.dinner : r.dinner || r.lunch);
