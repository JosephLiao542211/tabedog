"use client";

// The whole TabeDog UI: map, floating list, detail panel, search bar, filters, saved places.
// MapLibre and its markers are driven imperatively through refs; everything the user sees is React state.
import * as maplibregl from "maplibre-gl";
import type { Map as MLMap, Marker } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { MAP_STYLE, tintMap, workerUrl } from "@/lib/map-style";
import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { RANGES } from "@/lib/genres";
import { haversine } from "@/lib/geo";
import { fmtDist, priceYenOf } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";
import { addToList, colorHex, createList, deleteList, loadLists, removeFromList, updateList, type SavedList } from "@/lib/lists";
import { BILLING_NOTES, can, type Plan } from "@/lib/plan";
import type { Genre, LocateResponse, Restaurant, SearchResponse, SortKey } from "@/lib/types";
import { RestaurantCard } from "./restaurant-card";
import { ListsPanel, type ListDraft } from "./lists";
import { GuestLimitPrompt, ManageBillingButton, PlanBadge, PREMIUM_PRICE_LABEL, UpgradeButton, UpgradePrompt } from "./upgrade";
import { GUEST_LEFT_HEADER, GUEST_SEARCH_LIMIT } from "@/lib/guest";
import { DetailPanel } from "./detail-panel";
import { activeFilterCount, DEFAULT_FILTERS, FilterPanel, SortPanel, type Filters } from "./filter-panel";
import { ChevronRight, FilterIcon, GearIcon, HEART_SVG, HeartIcon, Logo, MEDAL, PERSON_SVG, type MedalRank, RecenterIcon, RefreshIcon, SearchIcon, SignOutIcon, SortIcon, XIcon, ZoomInIcon, ZoomOutIcon } from "./icons";
import { fullHeight, sheetPx, useMobile, useSheet } from "./use-sheet";

maplibregl.setWorkerUrl(workerUrl(maplibregl.getVersion()));

type Loc = { lat: number; lng: number; acc?: number | null; src?: string; at?: number };
type Center = { lat: number; lng: number };
type LoadOpts = { append?: boolean; keepView?: boolean; fit?: boolean };
type Panel = "filter" | "sort" | "account" | null;

const COOKIE = "tabelog_loc";
// one-tap searches under the search bar
const QUICK = ["Ramen", "Sushi", "Izakaya", "Yakiniku", "Cafe", "Yakitori", "Tempura", "Udon"];
const SORTS: SortKey[] = ["distance", "rating", "reviews", "price_asc", "price_desc"];

// ---------- my location cookie ----------
function readLoc(): Loc | null {
  const m = document.cookie.match(new RegExp("(?:^|; )" + COOKIE + "=([^;]*)"));
  if (!m) return null;
  try { const c = JSON.parse(decodeURIComponent(m[1])); return Number.isFinite(c.lat) && Number.isFinite(c.lng) ? c : null; } catch { return null; }
}
function writeLocCookie(loc: Loc) {
  const v = encodeURIComponent(JSON.stringify({ lat: loc.lat, lng: loc.lng, acc: loc.acc ?? null, src: loc.src, at: Date.now() }));
  document.cookie = `${COOKIE}=${v}; Max-Age=${365 * 24 * 3600}; Path=/; SameSite=Lax`;
}
const isCoarse = (l: Loc | null) => !l || String(l.src || "").startsWith("ip") || (l.acc || 0) > 1000;

// ---------- URL hash <-> filters ----------
function readHash(): { filters: Filters; center: Center | null } {
  const p = new URLSearchParams(location.hash.slice(1));
  const f: Filters = { ...DEFAULT_FILTERS, q: p.get("q") || "" };
  const sort = p.get("sort") as SortKey | null;
  if (sort && SORTS.includes(sort)) f.sort = sort;
  f.pay = (p.get("pay") || "").split(",").filter((v) => ["card", "qr", "emoney"].includes(v));
  if (/^\d+-\d+$/.test(p.get("price") || "")) f.price = p.get("price")!;
  if (p.get("meal") === "lunch") f.meal = "lunch";
  if (["3", "3.5", "4"].includes(p.get("min") || "")) f.minRating = p.get("min")!;
  f.open = p.get("open") === "1";
  if (RANGES[p.get("range") || ""]) f.range = p.get("range")!;
  const clat = parseFloat(p.get("clat") || ""), clng = parseFloat(p.get("clng") || "");
  return { filters: f, center: Number.isFinite(clat) && Number.isFinite(clng) ? { lat: clat, lng: clng } : null };
}
function writeHash(f: Filters, center: Center | null) {
  const p = new URLSearchParams();
  if (f.q) p.set("q", f.q);
  if (f.sort !== DEFAULT_FILTERS.sort) p.set("sort", f.sort);
  if (f.pay.length) p.set("pay", f.pay.join(","));
  if (f.price) { p.set("price", f.price); if (f.meal === "lunch") p.set("meal", "lunch"); }
  if (f.minRating) p.set("min", f.minRating);
  if (f.open) p.set("open", "1");
  if (f.range !== "A") p.set("range", f.range);
  if (center) { p.set("clat", center.lat.toFixed(6)); p.set("clng", center.lng.toFixed(6)); }
  history.replaceState(null, "", p.size ? "#" + p : location.pathname);
}

function circleGeo(lat: number, lng: number, radiusM: number, n = 64): GeoJSON.Feature {
  const coords: [number, number][] = [];
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * 2 * Math.PI;
    coords.push([lng + (radiusM * Math.cos(a)) / (111320 * Math.cos((lat * Math.PI) / 180)), lat + (radiusM * Math.sin(a)) / 110540]);
  }
  return { type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [coords] } };
}

export default function TabeDogApp({ email, userId, plan, billing, guest = false }: { email: string; userId: string; plan: Plan; billing: boolean; guest?: boolean }) {
  const hasLists = can(plan, "lists"); // saving lists is a premium feature; free users get an upgrade prompt instead
  const mapEl = useRef<HTMLDivElement>(null);
  const listEl = useRef<HTMLDivElement>(null);
  const toolbarEl = useRef<HTMLDivElement>(null);
  const qEl = useRef<HTMLInputElement>(null);
  const supabase = useMemo(() => createClient(), []);

  // Everything the old script kept in module-level variables lives here, untouched by re-renders.
  const E = useRef({
    map: null as MLMap | null,
    markers: {} as Record<string, Marker>,
    listMarkers: {} as Record<string, Marker>, // pins for saved places that aren't in the current results
    me: null as Marker | null,
    watchId: null as number | null, // live tracking: the geolocation watch, running the whole time the app is open
    following: false,               // ...and whether the camera rides along with it (the locate button turns this on)
    filters: DEFAULT_FILTERS as Filters,
    center: null as Center | null,
    page: 1,
    items: [] as Restaurant[],
    lastSearched: null as (Center & { radiusM: number }) | null,
    refCenter: null as Center | null,
    pendingRef: false,
    loading: false,
    quietMove: false,
    searchedOnce: false,
    reqId: 0,
    hasMore: false,
    detailOpen: false,
    observer: null as IntersectionObserver | null,
    genres: [] as Genre[],
  }).current;

  const [items, setItems] = useState<Restaurant[]>([]);
  const [filters, setFiltersState] = useState<Filters>(DEFAULT_FILTERS);
  const [searched, setSearched] = useState(false);
  const [count, setCount] = useState("Finding you…");
  const [loading, setLoadingState] = useState(false);
  const [showArea, setShowArea] = useState(false);
  const [tracking, setTracking] = useState<"off" | "on" | "follow">("off");
  const [detail, setDetail] = useState<Restaurant | null>(null);
  const [panel, setPanel] = useState<Panel>(null);
  const [q, setQ] = useState("");
  const [suggest, setSuggest] = useState<Genre[]>([]);
  const [selIdx, setSelIdx] = useState(-1);
  const [lists, setLists] = useState<SavedList[]>([]);
  const [listsNote, setListsNote] = useState<string | null>(null);
  const [viewList, setViewList] = useState<string | null>(null); // list shown in the sidebar instead of results
  const [showLists, setShowLists] = useState(false);              // the popover by the search bar
  const [upsell, setUpsell] = useState(false);                    // the "Premium feature" prompt for free users
  const [billingNote, setBillingNote] = useState<string | null>(null); // what happened when we came back from Stripe
  const closeUpsell = useCallback(() => setUpsell(false), []);
  const [guestLeft, setGuestLeft] = useState(GUEST_SEARCH_LIMIT);  // guests: searches left this hour
  const [guestWall, setGuestWall] = useState<number | null>(null);  // guests: out of searches, until this time (ms)
  const closeGuestWall = useCallback(() => setGuestWall(null), []);

  const setFilters = (f: Filters) => { E.filters = f; setFiltersState(f); };
  const setCenter = (c: Center | null) => { E.center = c; };

  // ---------- phones: the results and the detail are bottom sheets you drag up and down ----------
  const mobile = useMobile();
  const listSheet = useSheet({
    active: mobile, cssVar: "--sheet", handle: toolbarEl, body: listEl,
    stops: () => ({ peek: toolbarEl.current?.offsetHeight ?? 96, half: window.innerHeight * 0.44, full: fullHeight() }),
  });
  // the filter / sort panels hang off the toolbar, so a peeking sheet would clip them
  useEffect(() => { if (mobile && panel && panel !== "account" && listSheet.stop === "peek") listSheet.snapTo("half"); }, [panel]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------- geometry helpers: the floating panels cover part of the map ----------
  const wide = () => window.innerWidth > 800;
  // how much of the bottom of the map a sheet covers on a phone
  const cover = () => E.detailOpen ? (sheetPx("--sheet-detail") || window.innerHeight * 0.72) : (sheetPx("--sheet") || window.innerHeight * 0.44);
  const fitPadding = () => wide()
    ? { left: 380 + 48, top: 120, right: E.detailOpen ? 360 + 48 : 80, bottom: 60 }
    : { left: 30, top: 120, right: 30, bottom: Math.min(cover(), window.innerHeight * 0.6) + 90 };
  const viewOffset = (): [number, number] => wide() ? [((380 + 16) - (E.detailOpen ? 360 + 16 : 0)) / 2, 0] : [0, -Math.min(cover(), window.innerHeight * 0.72) / 2];
  const visualCenter = () => { const map = E.map!; const p = map.project(map.getCenter()), o = viewOffset(); return map.unproject([p.x + o[0], p.y + o[1]]); };

  // ---------- "you are here" marker ----------
  function renderMe() {
    const map = E.map; if (!map) return;
    const loc = readLoc();
    if (!loc) { E.me?.remove(); E.me = null; return; }
    // move the existing marker rather than rebuilding it, so live tracking glides instead of flickering
    if (!E.me) {
      const d = document.createElement("div");
      d.className = "person"; d.innerHTML = PERSON_SVG;
      E.me = new maplibregl.Marker({ element: d }).setLngLat([loc.lng, loc.lat]).addTo(map);
    }
    const d = E.me.getElement();
    // toggle rather than assign className: MapLibre put its own maplibregl-marker classes (position: absolute) on this element
    d.classList.toggle("coarse", String(loc.src || "").startsWith("ip"));
    d.classList.toggle("live", E.watchId != null);
    d.title = (loc.acc || 0) > 1000 ? "Roughly where you are (from your IP)" : `You are here (±${Math.round(loc.acc || 0)} m)`;
    E.me.setLngLat([loc.lng, loc.lat]);
  }
  const writeLoc = (loc: Loc) => { writeLocCookie(loc); renderMe(); };

  function setSearchArea(c: (Center & { radiusM: number }) | null) {
    const s = E.map?.getSource("search-area") as maplibregl.GeoJSONSource | undefined;
    if (s) s.setData({ type: "FeatureCollection", features: c ? [circleGeo(c.lat, c.lng, c.radiusM)] : [] });
  }
  function rangeForViewport() {
    const map = E.map!, b = map.getBounds(), c = map.getCenter();
    const w = haversine({ lat: c.lat, lng: b.getWest() }, { lat: c.lat, lng: b.getEast() });
    const h = haversine({ lat: b.getSouth(), lng: c.lng }, { lat: b.getNorth(), lng: c.lng });
    const half = Math.min(w, h) / 2;
    let best = "F";
    for (const [k, m] of Object.entries(RANGES)) if (m <= half) best = k;
    return best;
  }
  // show "Search this area" once the view has left the searched spot
  function checkMoved() {
    if (E.loading || E.pendingRef || !E.map) return;
    const c = visualCenter(), home = readLoc();
    let moved = false;
    if (E.quietMove) moved = false;
    else if (E.lastSearched) {
      // sensitive: a quarter of the searched radius (min 60 m) from where the results were shown, or zoomed out past what was searched
      moved = haversine(E.refCenter || E.lastSearched, c) > Math.max(E.lastSearched.radiusM * 0.25, 60) || RANGES[rangeForViewport()] > E.lastSearched.radiusM * 1.5;
    } else if (home) moved = haversine(home, c) > 150;
    setShowArea(moved && E.map.getZoom() >= 10);
  }
  function setLoading(on: boolean) { E.loading = on; setLoadingState(on); if (!on) checkMoved(); }

  // ---------- detail / highlight ----------
  function closeDetail() {
    E.detailOpen = false; setDetail(null);
    document.querySelectorAll(".pin.active").forEach((p) => p.classList.remove("active"));
  }
  function openDetail(r: Restaurant) {
    E.detailOpen = true; setDetail(r);
    // the detail sheet lands on top; leave the map visible underneath for when it closes
    if (mobile && listSheet.stop === "full") listSheet.snapTo("half");
  }
  function highlight(id: string, pan: boolean) {
    document.querySelectorAll(".pin.active").forEach((p) => p.classList.remove("active"));
    const r = E.items.find((x) => x.id === id); if (!r) return;
    listEl.current?.querySelector(`.card[data-id="${id}"]`)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    openDetail(r);
    const m = E.markers[id], map = E.map; if (!m || !map) return;
    m.getElement().classList.add("active");
    E.quietMove = true; unfollow();
    const visible = map.getBounds().contains(m.getLngLat());
    if (pan || !visible) map.flyTo({ center: m.getLngLat(), zoom: Math.max(map.getZoom(), 15), duration: 500, offset: viewOffset() });
    else map.panBy([0, 0], { duration: 0 });
  }
  function openSaved(r: Restaurant) {
    document.querySelectorAll(".pin.active").forEach((p) => p.classList.remove("active"));
    openDetail(r);
    (E.markers[r.id] || E.listMarkers[r.id])?.getElement().classList.add("active");
    const map = E.map; if (!map || r.lat == null || r.lng == null) return;
    E.quietMove = true; unfollow();
    map.flyTo({ center: [r.lng, r.lat], zoom: Math.max(map.getZoom(), 15), duration: 500, offset: viewOffset() });
  }

  // ---------- results -> list + pins ----------
  function render(data: SearchResponse, opts: LoadOpts) {
    const map = E.map; if (!map) return;
    if (!opts.append) { closeDetail(); for (const k in E.markers) { E.markers[k].remove(); delete E.markers[k]; } E.items = []; }
    const start = E.items.length;
    E.items = E.items.concat(data.items);
    setItems(E.items);
    data.items.forEach((r, j) => {
      if (r.lat == null || r.lng == null) return;
      const pin = document.createElement("div");
      pin.className = "pin"; pin.innerHTML = `<span>${start + j + 1}</span>`;
      pin.addEventListener("click", (e) => { e.stopPropagation(); highlight(r.id, false); });
      E.markers[r.id] = new maplibregl.Marker({ element: pin, anchor: "bottom", offset: [0, 2] }).setLngLat([r.lng, r.lat]).addTo(map);
    });
    if (!E.items.length || opts.append) return;
    const bounds = new maplibregl.LngLatBounds();
    E.items.forEach((r) => { if (r.lat != null && r.lng != null) bounds.extend([r.lng, r.lat]); });
    const origin = E.center || readLoc();
    if (origin) bounds.extend([origin.lng, origin.lat]);
    if (bounds.isEmpty()) return;
    const view = map.getBounds();
    const anyVisible = E.items.some((r) => r.lat != null && r.lng != null && view.contains([r.lng, r.lat]));
    if (opts.fit || !opts.keepView || !anyVisible) map.fitBounds(bounds, { padding: fitPadding(), maxZoom: 16, duration: 600 });
  }

  // ---------- load ----------
  function describe(data: SearchResponse) {
    const n = E.items.length + (E.hasMore ? "+" : "");
    const where = E.center ? "around here" : "around you";
    if (!data.genre.matched && E.filters.q) return `No “${E.filters.q}” category · showing all restaurants ${where}`;
    if (data.widened) return `Nothing within ${fmtDist(data.radiusM)} · showing the nearest ${data.genre.label.toLowerCase()}`;
    return `${n} ${data.genre.code === "RC" ? "places" : data.genre.label.toLowerCase()} within ${fmtDist(data.radiusM)} ${where}`;
  }
  async function load(opts: LoadOpts = {}) {
    const origin = E.center || readLoc();
    if (!origin) return;
    const my = ++E.reqId;
    E.searchedOnce = true; setSearched(true);
    writeHash(E.filters, E.center);
    if (!opts.append) setCount("Searching Tabelog…");
    setLoading(true);
    try {
      const f = E.filters;
      const p = new URLSearchParams({ lat: String(origin.lat), lon: String(origin.lng), range: f.range, sort: f.sort, page: String(E.page) });
      if (f.q) p.set("q", f.q);
      if (f.pay.length) p.set("pay", f.pay.join(","));
      if (f.price) { const [a, b] = f.price.split("-"); p.set("pmin", a); p.set("pmax", b); p.set("meal", f.meal); }
      if (f.minRating) p.set("minRating", f.minRating);
      if (f.open) p.set("open", "1");
      const res = await fetch("/api/search?" + p);
      if (res.status === 401) { window.location.assign("/login"); return; }
      const left = res.headers.get(GUEST_LEFT_HEADER);
      if (left != null) setGuestLeft(Number(left));
      if (res.status === 429 && guest) {
        const { resetAt } = (await res.json()) as { resetAt: number };
        if (my !== E.reqId) return;
        setGuestWall(resetAt);
        setCount("Out of guest searches for this hour");
        return;
      }
      const data = (await res.json()) as SearchResponse & { error?: string };
      if (my !== E.reqId) return;
      if (data.error) throw new Error(data.error);
      E.hasMore = !!data.hasMore;
      render(data, opts);
      E.lastSearched = { lat: data.origin.lat, lng: data.origin.lng, radiusM: data.radiusM }; E.quietMove = false;
      if (!opts.append) { // reference = where the map settles after showing these results
        const setRef = () => { if (!E.map) return; E.refCenter = visualCenter(); E.pendingRef = false; checkMoved(); };
        if (E.map?.isMoving()) { E.pendingRef = true; E.map.once("moveend", setRef); } else setRef();
      }
      setSearchArea(E.center ? E.lastSearched : null);
      setCount(describe(data));
    } catch {
      if (my !== E.reqId) return;
      setCount("Tabelog didn’t answer. Try again.");
      E.hasMore = false;
    } finally {
      if (my === E.reqId) setLoading(false);
    }
  }
  const restart = (opts: LoadOpts = {}) => {
    E.page = 1; load({ keepView: true, ...opts });
    if (mobile && listSheet.stop === "peek") listSheet.snapTo("half"); // a new search brings its results up
  };

  // ---------- my location: cookie -> IP -> live GPS, all automatic ----------
  function applyLocation(loc: Loc) {
    const prev = readLoc();
    writeLoc(loc);
    const movedFar = !prev || haversine(prev, loc) > 100;
    const upgraded = !!prev && isCoarse(prev) && !isCoarse(loc);
    if (!E.searchedOnce || (movedFar && !E.center) || upgraded) {
      if (upgraded || movedFar) setCenter(null);
      E.page = 1;
      load({ fit: true });
    }
    if ((!E.searchedOnce || upgraded) && E.map) E.map.easeTo({ center: [loc.lng, loc.lat], zoom: Math.max(E.map.getZoom(), 14.5), offset: viewOffset(), duration: 0 });
  }
  async function ensureLocation() {
    const saved = readLoc();
    if (saved) applyLocation(saved); // search right away from the saved spot; live GPS takes over as soon as it lands
    startTracking();
    if (saved) return;
    // IP fallback kicks in immediately so results show while the GPS fix is still coming
    try {
      const res = await fetch("/api/locate");
      if (res.status === 401) { window.location.assign("/login"); return; }
      const ip = (await res.json()) as LocateResponse;
      if (!readLoc() && Number.isFinite(ip.lat)) applyLocation({ lat: ip.lat, lng: ip.lng, acc: ip.acc, src: ip.src });
    } catch { /* GPS will do */ }
  }

  // ---------- live tracking: GPS keeps the pin on you while the app is open; the locate button makes the camera follow ----------
  const follow = (loc: Center) => E.map?.easeTo({ center: [loc.lng, loc.lat], offset: viewOffset(), duration: 600 });
  function unfollow() { if (E.following) { E.following = false; setTracking("on"); } }
  function stopTracking() {
    if (E.watchId != null) navigator.geolocation.clearWatch(E.watchId);
    E.watchId = null; E.following = false; setTracking("off"); renderMe();
  }
  function startTracking() {
    if (!navigator.geolocation) { if (isCoarse(readLoc())) setCount("This browser can’t share your location."); return; }
    if (E.watchId != null) return;
    setTracking(E.following ? "follow" : "on");
    E.watchId = navigator.geolocation.watchPosition((p) => {
      // every fix moves the pin; applyLocation only re-searches when the fix upgrades an IP guess or jumps far.
      // Walking around just moves the pin, and "Search this area" offers a fresh search once you've walked off
      const loc: Loc = { lat: p.coords.latitude, lng: p.coords.longitude, acc: p.coords.accuracy, src: "gps" };
      applyLocation(loc);
      if (E.following) follow(loc);
    }, (err) => {
      // only a refusal ends tracking; a lost or slow fix (indoors, a tunnel) is temporary and the watch recovers by itself
      if (err.code === err.PERMISSION_DENIED) { stopTracking(); if (isCoarse(readLoc())) setCount("Location is blocked. Allow it in your browser settings to see what’s near you."); }
    }, { enableHighAccuracy: true, maximumAge: 0 });
    renderMe();
  }

  // ---------- lists (Supabase `lists` + `list_items`, scoped by RLS) ----------
  // Every change is applied optimistically, then written; on failure the server copy is reloaded.
  const reloadLists = () => { if (hasLists) loadLists(supabase, userId).then(setLists).catch((e) => setListsNote(`Couldn’t load lists: ${(e as Error).message}`)); };
  const patchList = (id: string, fn: (l: SavedList) => SavedList) => setLists((ls) => ls.map((l) => (l.id === id ? fn(l) : l)));
  async function attempt(what: string, fn: () => Promise<unknown>) {
    setListsNote(null);
    try { await fn(); } catch (e) { setListsNote(`Couldn’t ${what}: ${(e as Error).message}`); reloadLists(); }
  }
  function toggleInList(l: SavedList, r: Restaurant) {
    const was = l.items.some((x) => x.id === r.id);
    patchList(l.id, (x) => ({ ...x, items: was ? x.items.filter((i) => i.id !== r.id) : [r, ...x.items] }));
    attempt(was ? `remove from ${l.name}` : `add to ${l.name}`, () => (was ? removeFromList(supabase, l.id, r.id) : addToList(supabase, userId, l.id, r)));
  }
  function editList(l: SavedList, d: ListDraft) {
    patchList(l.id, (x) => ({ ...x, ...d }));
    attempt("save list", () => updateList(supabase, l.id, d));
  }
  function removeList(l: SavedList) {
    if (l.isMain) return;
    setLists((ls) => ls.filter((x) => x.id !== l.id));
    if (viewList === l.id) setViewList(null);
    attempt("delete list", () => deleteList(supabase, l.id));
  }
  /** New list; with `r` the place goes straight into it (the "create & add" path from the detail panel). */
  function newList(d: ListDraft, r?: Restaurant) {
    attempt("create list", async () => {
      const l = await createList(supabase, userId, d.name, d.color, lists.length);
      if (r) { await addToList(supabase, userId, l.id, r); l.items = [r]; }
      setLists((ls) => [...ls, l]);
    });
  }
  const openList = (l: SavedList) => { setViewList((v) => (v === l.id ? null : l.id)); setShowLists(false); };
  const colorsOf = (id: string) => lists.filter((l) => l.items.some((x) => x.id === id)).map((l) => colorHex(l.color));

  // The map shows either the search results or one open list, never both. Lists stay off the map until opened.
  useEffect(() => {
    const map = E.map; if (!map) return;
    const open = viewList ? lists.find((l) => l.id === viewList) : null;
    const want = new Map<string, { color: string; r: Restaurant }>();
    if (open) for (const r of open.items) want.set(r.id, { color: colorHex(open.color), r });
    for (const m of Object.values(E.markers)) m.getElement().style.display = open ? "none" : "";
    for (const [id, m] of Object.entries(E.listMarkers)) {
      const w = want.get(id);
      if (!w || m.getElement().dataset.color !== w.color) { m.remove(); delete E.listMarkers[id]; }
    }
    for (const [id, { color, r }] of want) {
      if (E.listMarkers[id] || r.lat == null || r.lng == null) continue;
      const pin = document.createElement("div");
      pin.className = "pin saved"; pin.dataset.color = color; pin.style.setProperty("--pin", color); pin.innerHTML = `<span>${HEART_SVG}</span>`;
      pin.title = r.name;
      pin.addEventListener("click", (e) => { e.stopPropagation(); openSaved(r); });
      E.listMarkers[id] = new maplibregl.Marker({ element: pin, anchor: "bottom", offset: [0, 2] }).setLngLat([r.lng, r.lat]).addTo(map);
    }
    if (map.getLayer("search-area-line")) map.setLayoutProperty("search-area-line", "visibility", open ? "none" : "visible");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lists, items, viewList]);

  // opening a list frames its places
  useEffect(() => {
    const map = E.map, l = viewList ? lists.find((x) => x.id === viewList) : null;
    if (!map || !l) return;
    const bounds = new maplibregl.LngLatBounds();
    l.items.forEach((r) => { if (r.lat != null && r.lng != null) bounds.extend([r.lng, r.lat]); });
    if (bounds.isEmpty()) return;
    E.quietMove = true; closeDetail(); unfollow();
    map.fitBounds(bounds, { padding: fitPadding(), maxZoom: 15, duration: 600 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewList]);

  // ---------- boot: map, events, hash, location ----------
  useEffect(() => {
    const map = new maplibregl.Map({ container: mapEl.current!, style: MAP_STYLE, center: [138.25, 36.2], zoom: 4.3, attributionControl: { compact: true } });
    E.map = map;
    map.once("load", () => {
      tintMap(map);
      map.addSource("search-area", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      map.addLayer({ id: "search-area-line", type: "line", source: "search-area", paint: { "line-color": "#ff6347", "line-width": 1.5, "line-dasharray": [3, 3], "line-opacity": 0.6 } });
      renderMe();
    });
    map.on("movestart", (e) => { if (e.originalEvent) E.quietMove = false; });
    map.on("dragstart", unfollow); // panning by hand lets go of your position; tap locate to snap back
    map.on("moveend", checkMoved);
    map.on("zoomend", checkMoved);

    // the list loads more as you scroll; there are no page buttons
    E.observer = new IntersectionObserver((es) => {
      if (es.some((e) => e.isIntersecting) && E.hasMore && !E.loading) { E.page++; load({ append: true, keepView: true }); }
    }, { root: listEl.current, rootMargin: "400px" });

    fetch("/api/genres").then((r) => r.json()).then((g: Genre[]) => { E.genres = g; }).catch(() => {});
    reloadLists();

    // back from Stripe Checkout / the portal: say what happened, then drop the query so a reload doesn't repeat it
    const billingParam = new URLSearchParams(location.search).get("billing");
    if (billingParam) {
      setBillingNote(BILLING_NOTES[billingParam] ?? null);
      if (billingParam === "success" || billingParam === "pending") setPanel("account");
      history.replaceState(null, "", location.pathname + location.hash);
    }

    const { filters: f, center } = readHash();
    setFilters(f); setCenter(center); setQ(f.q);
    if (center) { map.easeTo({ center: [center.lng, center.lat], zoom: 14.5, offset: viewOffset(), duration: 0 }); renderMe(); load({ keepView: true }); }
    ensureLocation();

    // composedPath() still holds elements React has already swapped out by the time this runs
    const onDocClick = (e: MouseEvent) => {
      const path = e.composedPath().filter((n): n is Element => n instanceof Element);
      if (!path.some((el) => el.matches(".panel, .icon, #accountBtn"))) setPanel(null);
      if (!path.some((el) => el.id === "listsWrap")) setShowLists(false);
    };
    const onKey = (e: globalThis.KeyboardEvent) => { if (e.key === "Escape") { setPanel(null); setShowLists(false); closeDetail(); } };
    document.addEventListener("click", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", onDocClick);
      document.removeEventListener("keydown", onKey);
      E.observer?.disconnect(); E.observer = null;
      if (E.watchId != null) navigator.geolocation.clearWatch(E.watchId);
      E.watchId = null;
      map.remove(); E.map = null; E.markers = {}; E.listMarkers = {}; E.me = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sentinelRef = useCallback((el: HTMLDivElement | null) => { if (el) E.observer?.observe(el); }, [E]);

  // ---------- search bar + suggestions ----------
  function updateSuggest(value: string) {
    const s = value.trim().toLowerCase();
    setSuggest(s ? E.genres.filter((g) => g.label.toLowerCase().includes(s) || g.code.includes(s)).slice(0, 6) : []);
    setSelIdx(-1);
  }
  function submit(value = q) {
    setSuggest([]); qEl.current?.blur();
    const nq = value.trim();
    setQ(nq);
    setFilters({ ...E.filters, q: nq });
    restart();
  }
  function onQKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (suggest.length) setSelIdx((selIdx + (e.key === "ArrowDown" ? 1 : -1) + suggest.length) % suggest.length);
    }
    if (e.key === "Escape") { setSuggest([]); qEl.current?.blur(); }
    if (e.key === "Enter" && selIdx >= 0) { e.preventDefault(); submit(suggest[selIdx].label); }
  }

  // ---------- filters / sort / area / locate ----------
  const changeFilters = (patch: Partial<Filters>) => { setFilters({ ...E.filters, ...patch }); restart(); };
  const resetFilters = () => changeFilters({ pay: [], price: "", meal: "dinner", minRating: "", open: false });
  const togglePanel = (which: Exclude<Panel, null>) => setPanel((p) => (p === which ? null : which));
  const searchArea = () => {
    const c = visualCenter();
    setCenter({ lat: c.lat, lng: c.lng });
    setFilters({ ...E.filters, range: rangeForViewport() });
    E.page = 1; load({ keepView: true });
    unfollow();
  };
  // snap back to you and follow as you move (tracking itself is always on; if it was blocked, try again)
  const locate = () => {
    E.following = true;
    if (E.watchId == null) return startTracking();
    setTracking("follow");
    const home = readLoc(), map = E.map; if (!home || !map) return;
    map.flyTo({ center: [home.lng, home.lat], zoom: Math.max(map.getZoom(), 15), duration: 600, offset: viewOffset() });
  };

  const nFilters = activeFilterCount(filters);
  const viewing = viewList ? lists.find((l) => l.id === viewList) ?? null : null;
  const listItems = viewing ? viewing.items : items;
  // gold / silver / bronze pins for the best three loaded results under the current sort
  const medals = useMemo(() => {
    const key: Record<SortKey, (r: Restaurant) => number> = {
      distance: (r) => r.distM ?? Infinity, rating: (r) => -(r.rating ?? -Infinity), reviews: (r) => -(r.reviews ?? 0),
      price_asc: (r) => priceYenOf(r, filters.meal) ?? Infinity, price_desc: (r) => -(priceYenOf(r, filters.meal) ?? -Infinity),
    };
    const ranked = items.filter((r) => Number.isFinite(key[filters.sort](r))).sort((a, b) => key[filters.sort](a) - key[filters.sort](b)).slice(0, 3);
    return new Map(ranked.map((r, i) => [r.id, (i + 1) as MedalRank]));
  }, [items, filters.sort, filters.meal]);
  useEffect(() => {
    const why = { distance: "Nearest", rating: "Highest rated", reviews: "Most reviewed", price_asc: "Cheapest", price_desc: "Priciest" }[filters.sort];
    for (const [id, m] of Object.entries(E.markers)) {
      const el = m.getElement(), rank = medals.get(id);
      el.classList.remove("medal-1", "medal-2", "medal-3");
      el.title = "";
      if (!rank) continue;
      el.classList.add(`medal-${rank}`);
      el.title = `${MEDAL[rank]} · ${why} #${rank}`;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [medals]);

  return (
    <div className={"app" + (detail ? " has-detail" : "") + (mobile ? ` sheet-${listSheet.stop}` : "")}>
      <div id="map" ref={mapEl} />

      <aside className="float">
        <div id="toolbar" ref={toolbarEl} className={loading ? "loading" : ""}>
          <button type="button" className="grip" aria-label={listSheet.stop === "full" ? "Collapse results" : "Expand results"}
            onClick={() => listSheet.snapTo(listSheet.stop === "full" ? "peek" : listSheet.stop === "half" ? "full" : "half")}><i /></button>
          <div className="row">
            <div className="brand"><Logo /><p className="h1">TabeDog</p></div>
            <button type="button" className={"icon" + (panel === "filter" ? " open" : "")} aria-label="Filters" title="Filters" onClick={() => togglePanel("filter")}>
              <FilterIcon />
              {nFilters > 0 && <i className="badge">{nFilters}</i>}
            </button>
            <button type="button" className={"icon" + (panel === "sort" ? " open" : "")} aria-label="Sort" title="Sort" onClick={() => togglePanel("sort")}><SortIcon /></button>
          </div>
          {viewing ? (
            <p className="sub" id="count">
              <i className="swatch-dot" style={{ background: colorHex(viewing.color) }} />
              <b>{viewing.name}</b> · {viewing.items.length} {viewing.items.length === 1 ? "place" : "places"}
              <button type="button" className="link" onClick={() => setViewList(null)}>Back to results</button>
            </p>
          ) : <p className="sub" id="count">{count}</p>}
          <div className="progress"><i /></div>
        </div>

        {panel === "filter" && <FilterPanel f={filters} onChange={changeFilters} onReset={resetFilters} />}
        {panel === "sort" && <SortPanel value={filters.sort} onChange={(s) => { setPanel(null); changeFilters({ sort: s }); }} />}
        <div id="list" ref={listEl}>
          {listsNote && <p className="sub" style={{ padding: "10px 16px", color: "var(--accent-ink)" }}>{listsNote}</p>}
          {listItems.map((r, i) => (
            <RestaurantCard key={r.id} r={r} index={i} active={detail?.id === r.id} meal={filters.meal} tags={colorsOf(r.id)}
              onClick={() => (viewing ? openSaved(r) : highlight(r.id, true))} />
          ))}
          {!viewing && items.length > 0 && <div id="sentinel" ref={sentinelRef} />}
          {viewing && viewing.items.length === 0 && (
            <div className="empty"><h2>Nothing in {viewing.name} yet</h2><p className="p2">{viewing.isMain ? "Tap the heart on a place to keep it here." : "Open a place and use “Add to list”."}</p></div>
          )}
          {!viewing && searched && !loading && items.length === 0 && (
            <div className="empty"><h2>Nothing here</h2><p className="p2">Try fewer filters, or search a wider area.</p></div>
          )}
        </div>
      </aside>

      {detail && <DetailPanel key={detail.id} r={detail} lists={lists} locked={!hasLists} billing={billing} guest={guest} mobile={mobile} onToggleList={(l) => toggleInList(l, detail)} onCreateList={(d) => newList(d, detail)} onClose={closeDetail} />}

      {guestWall != null && <GuestLimitPrompt resetAt={guestWall} billing={billing} onClose={closeGuestWall} />}

      <div id="ctl" className="float">
        <button type="button" aria-label="Zoom in" onClick={() => E.map?.zoomIn()}><ZoomInIcon /></button>
        <button type="button" aria-label="Zoom out" onClick={() => E.map?.zoomOut()}><ZoomOutIcon /></button>
      </div>
      <button type="button" id="recenter" className={"float" + (tracking !== "off" ? " " + tracking : "")} aria-pressed={tracking !== "off"}
        title={tracking === "off" ? "Show my location" : tracking === "follow" ? "Following you" : "Follow me"} onClick={locate}><RecenterIcon /></button>
      <div id="listsWrap">
        <button type="button" id="listsBtn" className={"float" + (showLists || upsell ? " open" : "") + (viewing ? " on" : "")} aria-label="Your lists" aria-expanded={showLists || upsell} title={hasLists ? "Your lists" : "Your lists (Premium)"}
          onClick={() => (hasLists ? setShowLists((v) => !v) : setUpsell((v) => !v))}>
          <HeartIcon size={22} filled={!!viewing} />
          {lists.length > 1 && <i className="badge">{lists.length}</i>}
          {!hasLists && <i className="lock" aria-hidden="true" />}
        </button>
        {upsell && <UpgradePrompt feature="lists" id="listsUpsell" billing={billing} guest={guest} onClose={closeUpsell} />}
        {showLists && hasLists && (
          <ListsPanel lists={lists} viewing={viewList} onOpen={openList}
            onCreate={(d) => newList(d)} onUpdate={editList} onDelete={removeList} />
        )}
      </div>

      <div id="dock">
        <div id="bar">
          <div id="search" className="float">
            <form autoComplete="off" onSubmit={(e) => { e.preventDefault(); submit(); }}>
              <SearchIcon />
              <input id="q" ref={qEl} type="search" placeholder="Ramen, sushi, cafe…" enterKeyHint="search"
                value={q} onChange={(e) => { setQ(e.target.value); updateSuggest(e.target.value); }} onKeyDown={onQKey}
                onBlur={() => setTimeout(() => setSuggest([]), 120)} />
              {q && <button type="button" id="clearQ" aria-label="Clear" onClick={() => submit("")}><XIcon /></button>}
              <button type="button" id="accountBtn" className={panel === "account" ? "open" : ""} aria-label="Account" aria-expanded={panel === "account"} title={guest ? "Guest" : email} onClick={() => togglePanel("account")}>
                {guest ? "G" : (email[0] || "?")}
              </button>
            </form>
            {suggest.length > 0 && (
              <div id="suggest" className="float">
                {suggest.map((g, i) => <div key={g.code} className={"p1" + (i === selIdx ? " sel" : "")} onMouseDown={() => submit(g.label)}>{g.label}</div>)}
              </div>
            )}
          </div>
        {panel === "account" && guest && (
          <div className="panel account" id="accountPanel">
            <p className="sub">Browsing as</p>
            <p className="p1">Guest</p>
            <p className="p2">{guestLeft} of {GUEST_SEARCH_LIMIT} guest searches left this hour. Create a free account for unlimited searches.</p>
            <a href="/login" className="btn">Sign in or create account</a>
            <form action="/auth/signout" method="post" className="foot">
              <span className="sub">Nothing is saved in guest mode.</span>
              <button type="submit" className="chip"><SignOutIcon />Leave guest mode</button>
            </form>
          </div>
        )}
        {panel === "account" && !guest && (
          <div className="panel account" id="accountPanel">
            <p className="sub">Signed in as</p>
            <p className="p1" title={email}>{email}</p>
            <div className="row plan-row">
              <PlanBadge plan={plan} />
              <span className="sub">{plan === "premium" ? "Saved lists and future premium features are unlocked." : billing ? PREMIUM_PRICE_LABEL : "Saved lists need Premium."}</span>
            </div>
            {billingNote && <p className="p2 billing-note" role="status">{billingNote}</p>}
            {billing && plan === "free" && <UpgradeButton />}
            {billing && plan === "premium" && <ManageBillingButton />}
            <a href="/account" className="account-link">
              <span className="account-link-icon"><GearIcon /></span>
              <span className="account-link-text"><b>Account settings</b><span className="sub">Email, password and plan</span></span>
              <ChevronRight />
            </a>
            <form action="/auth/signout" method="post" className="foot">
              <span className="sub">{plan === "premium" ? "Saved places sync to your account." : "Search is free for everyone."}</span>
              <button type="submit" className="chip"><SignOutIcon />Sign out</button>
            </form>
          </div>
        )}
        </div>
        <div id="quick">
          {QUICK.map((label) => {
            const on = filters.q.toLowerCase() === label.toLowerCase();
            return <button key={label} type="button" className={"float" + (on ? " on" : "")} aria-pressed={on} onClick={() => submit(on ? "" : label)}>{label}</button>;
          })}
        </div>
        <div id="areaBar" className={"float" + (showArea && !viewing ? " show" : "") + (loading ? " loading" : "")}>
          <button type="button" disabled={loading} onClick={searchArea}><RefreshIcon /><span>{loading ? "Searching…" : "Search this area"}</span></button>
          <div className="bar"><i /></div>
        </div>
      </div>
    </div>
  );
}
