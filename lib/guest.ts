// Guest mode: browse the map without an account. A plain cookie, not a Supabase session,
// so guests never create auth users. It only unlocks the public map APIs (see GUEST_PATHS in supabase/proxy.ts).
export const GUEST_COOKIE = "tabedog_guest";
export const GUEST_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

// Guests get a few searches per rolling hour, counted per IP (see guest-limit.ts); accounts are unlimited.
export const GUEST_SEARCH_LIMIT = 10;
export const GUEST_WINDOW_SEC = 60 * 60;
// background prefetches (?warm=1) don't spend searches but have their own, looser hourly cap
export const GUEST_WARM_LIMIT = 60;
export const GUEST_LEFT_HEADER = "x-guest-searches-left";
// name suggestions while typing in the search box (/api/suggest), counted apart from searches
export const GUEST_SUGGEST_LIMIT = 200;
