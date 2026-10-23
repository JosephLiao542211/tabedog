// Server-side guest search allowance: a rolling window of timestamps per IP in the shared cache store.
// Keyed by a hash of the IP rather than the cookie, so clearing cookies doesn't reset it.
import { createHash } from "node:crypto";
import { kvGet, kvSet } from "./cache";
import { GUEST_SEARCH_LIMIT, GUEST_WINDOW_SEC } from "./guest";

export type GuestAllowance = { ok: boolean; left: number; resetAt: number };

/** Spend one guest search for `ip`. Fails open if the store is down: a guest shouldn't be blocked by our outage. */
export async function takeGuestSearch(ip: string): Promise<GuestAllowance> {
  const key = "guestrl:" + createHash("sha256").update(ip || "unknown").digest("hex").slice(0, 32);
  const now = Date.now(), windowMs = GUEST_WINDOW_SEC * 1000;
  try {
    const hits = ((await kvGet<number[]>(key)) ?? []).filter((t) => t > now - windowMs);
    if (hits.length >= GUEST_SEARCH_LIMIT) return { ok: false, left: 0, resetAt: hits[0] + windowMs };
    hits.push(now);
    await kvSet(key, hits, GUEST_WINDOW_SEC);
    return { ok: true, left: GUEST_SEARCH_LIMIT - hits.length, resetAt: hits[0] + windowMs };
  } catch (e) {
    console.error("[guest-limit]", (e as Error).message);
    return { ok: true, left: GUEST_SEARCH_LIMIT, resetAt: now + windowMs };
  }
}
