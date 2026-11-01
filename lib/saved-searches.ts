// The last few searches per person, kept in this browser so reopening the app shows results right away while
// fresh ones load. Nothing here is required: storage can be blocked or full, and then searches just run as usual.
import { haversine } from "./geo";
import type { SearchResponse } from "./types";

const PREFIX = "tabedog:searches:v1:"; // bump the version when the shape of SearchResponse changes
const MAX_SEARCHES = 5;
const MAX_AGE = 7 * 24 * 60 * 60e3; // ms

type SavedSearch = { key: string; lat: number; lng: number; at: number; data: SearchResponse };
type Origin = { lat: number; lng: number };

function readAll(owner: string): SavedSearch[] {
  try {
    const all: unknown = JSON.parse(localStorage.getItem(PREFIX + owner) ?? "[]");
    return Array.isArray(all) ? (all as SavedSearch[]).filter((s) => Array.isArray(s?.data?.items) && Date.now() - s.at < MAX_AGE) : [];
  } catch { return []; }
}

/** What a search asks for, apart from where: the same search a short walk away reuses the saved copy. */
export function searchKey(qs: string) {
  const p = new URLSearchParams(qs);
  for (const k of ["lat", "lon", "page"]) p.delete(k);
  return p.toString();
}

/** The saved copy of this search within `nearM` of `origin`, with what depends on where and when worked out again. */
export function readSavedSearch(owner: string, key: string, origin: Origin, nearM: number) {
  const hit = readAll(owner).find((s) => s.key === key && haversine(s, origin) <= nearM);
  if (!hit) return null;
  const items = hit.data.items.map((r) => ({
    ...r,
    open: null, // open right now is only true of the moment it was saved
    distM: r.lat != null && r.lng != null ? Math.round(haversine(origin, { lat: r.lat, lng: r.lng })) : r.distM,
  }));
  return { at: hit.at, data: { ...hit.data, items } };
}

export function saveSearch(owner: string, key: string, origin: Origin, data: SearchResponse) {
  const near = (s: SavedSearch) => s.key === key && haversine(s, origin) <= 100;
  const all = [{ key, lat: origin.lat, lng: origin.lng, at: Date.now(), data }, ...readAll(owner).filter((s) => !near(s))].slice(0, MAX_SEARCHES);
  // out of room: give up the oldest until it fits
  for (let n = all.length; n > 0; n--) {
    try { localStorage.setItem(PREFIX + owner, JSON.stringify(all.slice(0, n))); return; } catch { /* try with fewer */ }
  }
}

/** Forget every saved search in this browser. Searches show where someone has been, so they don't outlast a sign-out. */
export function clearSavedSearches() {
  try {
    for (const k of Object.keys(localStorage)) if (k.startsWith(PREFIX)) localStorage.removeItem(k);
  } catch { /* storage is blocked, so there's nothing to clear */ }
}

export function savedAgo(at: number) {
  const min = Math.floor((Date.now() - at) / 60e3);
  if (min < 1) return "just now";
  if (min < 60) return `${min} min ago`;
  const h = Math.floor(min / 60);
  return h < 24 ? `${h} h ago` : `${Math.floor(h / 24)} d ago`;
}
