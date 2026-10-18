"use client";

// The whole TabeDog UI: map, floating list, detail panel, search bar, filters, saved places.
// MapLibre and its markers are driven imperatively through refs; everything the user sees is React state.
import maplibregl, { type Map as MLMap, type Marker } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { RANGES } from "@/lib/genres";
import { haversine } from "@/lib/geo";
import { fmtDist } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";
import { addFavorite, listFavorites, removeFavorite } from "@/lib/favorites";
import type { Genre, LocateResponse, Restaurant, SearchResponse, SortKey } from "@/lib/types";
import { RestaurantCard } from "./restaurant-card";
import { DetailPanel } from "./detail-panel";
import { activeFilterCount, DEFAULT_FILTERS, FilterPanel, SortPanel, type Filters } from "./filter-panel";
import { FilterIcon, HeartIcon, Logo, PERSON_SVG, RecenterIcon, RefreshIcon, SearchIcon, SignOutIcon, SortIcon, XIcon, ZoomInIcon, ZoomOutIcon } from "./icons";

type Loc = { lat: number; lng: number; acc?: number | null; src?: string; at?: number };
type Center = { lat: number; lng: number };
type LoadOpts = { append?: boolean; keepView?: boolean; fit?: boolean };
type Panel = "filter" | "sort" | "account" | null;

const COOKIE = "tabelog_loc";
const SORTS: SortKey[] = ["distance", "rating", "reviews"];
const MAP_STYLE = "https://tiles.openfreemap.org/styles/positron";

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
function gps(opts: PositionOptions): Promise<Loc> {
  return new Promise((res, rej) => {
    if (!navigator.geolocation) return rej(new Error("no geolocation"));
    navigator.geolocation.getCurrentPosition((p) => res({ lat: p.coords.latitude, lng: p.coords.longitude, acc: p.coords.accuracy, src: "gps" }), rej, opts);
  });
}

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
  if (f.sort !== "distance") p.set("sort", f.sort);
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

export default function TabeDogApp({ email, userId }: { email: string; userId: string }) {
  const mapEl = useRef<HTMLDivElement>(null);
  const listEl = useRef<HTMLDivElement>(null);
  const qEl = useRef<HTMLInputElement>(null);
  const supabase = useMemo(() => createClient(), []);

  // Everything the old script kept in module-level variables lives here, untouched by re-renders.
  const E = useRef({
    map: null as MLMap | null,
    markers: {} as Record<string, Marker>,
    me: null as Marker | null,
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
    ctxAt: null as Center | null,
    observer: null as IntersectionObserver | null,
    genres: [] as Genre[],
    pressTimer: 0,
  }).current;

  const [items, setItems] = useState<Restaurant[]>([]);
  const [filters, setFiltersState] = useState<Filters>(DEFAULT_FILTERS);
  const [searched, setSearched] = useState(false);
  const [count, setCount] = useState("Finding you…");
  const [loading, setLoadingState] = useState(false);
  const [showArea, setShowArea] = useState(false);
  const [showRecenter, setShowRecenter] = useState(false);
  const [detail, setDetail] = useState<Restaurant | null>(null);
  const [panel, setPanel] = useState<Panel>(null);
  const [ctx, setCtx] = useState<{ x: number; y: number } | null>(null);
  const [q, setQ] = useState("");
  const [suggest, setSuggest] = useState<Genre[]>([]);
  const [selIdx, setSelIdx] = useState(-1);
  const [favorites, setFavorites] = useState<Restaurant[]>([]);
  const [favNote, setFavNote] = useState<string | null>(null);
  const [showSaved, setShowSaved] = useState(false);

  const setFilters = (f: Filters) => { E.filters = f; setFiltersState(f); };
  const setCenter = (c: Center | null) => { E.center = c; };

  // ---------- geometry helpers: the floating panels cover part of the map ----------
  const wide = () => window.innerWidth > 800;
  const fitPadding = () => wide()
    ? { left: 380 + 48, top: 60, right: E.detailOpen ? 360 + 48 : 80, bottom: 110 }
    : { left: 30, top: 70, right: 30, bottom: window.innerHeight * 0.44 + 90 };
  const viewOffset = (): [number, number] => wide() ? [((380 + 16) - (E.detailOpen ? 360 + 16 : 0)) / 2, 0] : [0, -window.innerHeight * 0.22];
  const visualCenter = () => { const map = E.map!; const p = map.project(map.getCenter()), o = viewOffset(); return map.unproject([p.x + o[0], p.y + o[1]]); };

  // ---------- "you are here" marker ----------
  function renderMe() {
    const map = E.map; if (!map) return;
    const loc = readLoc();
    if (E.me) { E.me.remove(); E.me = null; }
    if (!loc) return;
    const d = document.createElement("div");
    d.className = "person" + (String(loc.src || "").startsWith("ip") ? " coarse" : "");
    d.title = (loc.acc || 0) > 1000 ? "Roughly where you are (from your IP)" : `You are here (±${Math.round(loc.acc || 0)} m)`;
    d.innerHTML = PERSON_SVG;
    E.me = new maplibregl.Marker({ element: d }).setLngLat([loc.lng, loc.lat]).addTo(map);
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
  // show "Search this area" once the view has left the searched spot, and "back to me" once away from home
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
    setShowRecenter(!!home && haversine(home, c) > 120);
  }
  function setLoading(on: boolean) { E.loading = on; setLoadingState(on); if (!on) checkMoved(); }

  // ---------- detail / highlight ----------
  function closeDetail() {
    E.detailOpen = false; setDetail(null);
    document.querySelectorAll(".pin.active").forEach((p) => p.classList.remove("active"));
  }
  function openDetail(r: Restaurant) { E.detailOpen = true; setDetail(r); }
  function highlight(id: string, pan: boolean) {
    document.querySelectorAll(".pin.active").forEach((p) => p.classList.remove("active"));
    const r = E.items.find((x) => x.id === id); if (!r) return;
    listEl.current?.querySelector(`.card[data-id="${id}"]`)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    openDetail(r);
    const m = E.markers[id], map = E.map; if (!m || !map) return;
    m.getElement().classList.add("active");
    E.quietMove = true;
    const visible = map.getBounds().contains(m.getLngLat());
    if (pan || !visible) map.flyTo({ center: m.getLngLat(), zoom: Math.max(map.getZoom(), 15), duration: 500, offset: viewOffset() });
    else map.panBy([0, 0], { duration: 0 });
  }
  function openSaved(r: Restaurant) {
    document.querySelectorAll(".pin.active").forEach((p) => p.classList.remove("active"));
    openDetail(r);
    const map = E.map; if (!map || r.lat == null || r.lng == null) return;
    E.quietMove = true;
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
  const restart = (opts: LoadOpts = {}) => { E.page = 1; load({ keepView: true, ...opts }); };

  // ---------- my location: cookie -> GPS -> IP, all automatic ----------
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
  // keep improving a poor fix for a short while
  function refineGPS(seconds = 25) {
    if (!navigator.geolocation) return;
    const id = navigator.geolocation.watchPosition((p) => {
      const cur = readLoc();
      if (!cur || isCoarse(cur) || p.coords.accuracy < (cur.acc || 1e9) - 5) applyLocation({ lat: p.coords.latitude, lng: p.coords.longitude, acc: p.coords.accuracy, src: "gps" });
    }, () => {}, { enableHighAccuracy: true, maximumAge: 0 });
    setTimeout(() => navigator.geolocation.clearWatch(id), seconds * 1000);
  }
  async function ensureLocation() {
    const saved = readLoc();
    if (saved) {
      applyLocation(saved); // search right away from the saved spot, then quietly improve it
      if (isCoarse(saved)) gps({ enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }).then(applyLocation).catch(() => {}); else refineGPS(10);
      return;
    }
    let gotGps = false;
    gps({ enableHighAccuracy: true, timeout: 15000, maximumAge: 0 })
      .then((l) => { gotGps = true; applyLocation(l); if ((l.acc || 0) > 60) refineGPS(); })
      .catch(() => { if (!readLoc()) setCount("Allow location, or right-click the map where you are."); });
    // IP fallback kicks in immediately so results show while the GPS fix is still coming
    try {
      const res = await fetch("/api/locate");
      if (res.status === 401) { window.location.assign("/login"); return; }
      const ip = (await res.json()) as LocateResponse;
      if (!gotGps && !readLoc() && Number.isFinite(ip.lat)) applyLocation({ lat: ip.lat, lng: ip.lng, acc: ip.acc, src: ip.src });
    } catch { /* GPS or a manual pin will do */ }
  }

  // ---------- saved places (Supabase `favorites`, scoped by RLS) ----------
  const isSaved = (id: string) => favorites.some((f) => f.id === id);
  async function toggleFavorite(r: Restaurant) {
    setFavNote(null);
    const was = isSaved(r.id);
    setFavorites((fs) => (was ? fs.filter((f) => f.id !== r.id) : [r, ...fs]));
    try { if (was) await removeFavorite(supabase, r.id); else await addFavorite(supabase, userId, r); }
    catch (e) {
      setFavNote(`Couldn’t ${was ? "remove" : "save"}: ${(e as Error).message}`);
      listFavorites(supabase).then(setFavorites).catch(() => {});
    }
  }

  // ---------- boot: map, events, hash, location ----------
  useEffect(() => {
    const map = new maplibregl.Map({ container: mapEl.current!, style: MAP_STYLE, center: [138.25, 36.2], zoom: 4.3, attributionControl: { compact: true } });
    E.map = map;
    map.once("load", () => {
      // Positron's quiet linework with a little colour put back: blue water, green parks, warm land
      const paint: Record<string, [string, string]> = {
        background: ["background-color", "#f5f4ef"], water: ["fill-color", "#bcd9ea"], waterway: ["line-color", "#bcd9ea"],
        park: ["fill-color", "#d3e8ca"], landcover_wood: ["fill-color", "#cfe3c6"], landuse_residential: ["fill-color", "#ece8df"],
        building: ["fill-color", "#e7e3da"], highway_major_casing: ["line-color", "#dcd8cf"], highway_motorway_casing: ["line-color", "#dcd8cf"],
        highway_minor: ["line-color", "#e4e1d9"], railway: ["line-color", "#d9d5cc"],
      };
      for (const [id, [prop, v]] of Object.entries(paint)) if (map.getLayer(id)) map.setPaintProperty(id, prop, v);
      if (map.getLayer("building")) map.setPaintProperty("building", "fill-outline-color", "#d9d4c9");
      map.addSource("search-area", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      map.addLayer({ id: "search-area-line", type: "line", source: "search-area", paint: { "line-color": "#ff6347", "line-width": 1.5, "line-dasharray": [3, 3], "line-opacity": 0.6 } });
      renderMe();
    });
    // right-click / long-press the map to fix your location by hand
    const showCtx = (point: { x: number; y: number }, lngLat: Center) => {
      E.ctxAt = { lat: lngLat.lat, lng: lngLat.lng };
      setCtx({ x: Math.min(point.x, window.innerWidth - 200), y: Math.min(point.y, window.innerHeight - 60) });
    };
    map.on("contextmenu", (e) => { e.preventDefault(); showCtx(e.point, e.lngLat); });
    map.on("touchstart", (e) => { clearTimeout(E.pressTimer); if (e.points.length === 1) E.pressTimer = window.setTimeout(() => showCtx(e.point, e.lngLat), 600); });
    map.on("touchmove", () => clearTimeout(E.pressTimer));
    map.on("touchend", () => clearTimeout(E.pressTimer));
    map.on("click", () => setCtx(null));
    map.on("movestart", (e) => { setCtx(null); if (e.originalEvent) E.quietMove = false; });
    map.on("moveend", checkMoved);
    map.on("zoomend", checkMoved);

    // the list loads more as you scroll; there are no page buttons
    E.observer = new IntersectionObserver((es) => {
      if (es.some((e) => e.isIntersecting) && E.hasMore && !E.loading) { E.page++; load({ append: true, keepView: true }); }
    }, { root: listEl.current, rootMargin: "400px" });

    fetch("/api/genres").then((r) => r.json()).then((g: Genre[]) => { E.genres = g; }).catch(() => {});
    listFavorites(supabase).then(setFavorites).catch((e) => setFavNote(`Couldn’t load saved places: ${(e as Error).message}`));

    const { filters: f, center } = readHash();
    setFilters(f); setCenter(center); setQ(f.q);
    if (center) { map.easeTo({ center: [center.lng, center.lat], zoom: 14.5, offset: viewOffset(), duration: 0 }); renderMe(); load({ keepView: true }); }
    ensureLocation();

    const onDocClick = (e: MouseEvent) => { if (!(e.target as Element).closest(".panel, .icon")) setPanel(null); };
    const onKey = (e: globalThis.KeyboardEvent) => { if (e.key === "Escape") { setPanel(null); closeDetail(); } };
    document.addEventListener("click", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", onDocClick);
      document.removeEventListener("keydown", onKey);
      E.observer?.disconnect(); E.observer = null;
      map.remove(); E.map = null; E.markers = {}; E.me = null;
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

  // ---------- filters / sort / area / recenter ----------
  const changeFilters = (patch: Partial<Filters>) => { setFilters({ ...E.filters, ...patch }); restart(); };
  const resetFilters = () => changeFilters({ pay: [], price: "", meal: "dinner", minRating: "", open: false });
  const togglePanel = (which: Exclude<Panel, null>) => setPanel((p) => (p === which ? null : which));
  const searchArea = () => {
    const c = visualCenter();
    setCenter({ lat: c.lat, lng: c.lng });
    setFilters({ ...E.filters, range: rangeForViewport() });
    E.page = 1; load({ keepView: true });
  };
  const recenter = () => {
    const home = readLoc(), map = E.map; if (!home || !map) return;
    map.flyTo({ center: [home.lng, home.lat], zoom: Math.max(map.getZoom(), 14.5), duration: 600, offset: viewOffset() });
    if (E.center) { setCenter(null); setFilters({ ...E.filters, range: "A" }); E.page = 1; load({ keepView: true }); }
    if (isCoarse(home)) gps({ enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }).then(applyLocation).catch(() => {});
  };
  const setHere = () => {
    const ll = E.ctxAt; setCtx(null); if (!ll) return;
    setCenter(null); E.searchedOnce = false;
    applyLocation({ lat: ll.lat, lng: ll.lng, acc: 0, src: "manual" });
  };

  const nFilters = activeFilterCount(filters);
  const listItems = showSaved ? favorites : items;

  return (
    <div className={"app" + (detail ? " has-detail" : "")}>
      <div id="map" ref={mapEl} />

      <aside className="float">
        <div id="toolbar" className={loading ? "loading" : ""}>
          <div className="row">
            <div className="brand"><Logo /><p className="h1">TabeDog</p></div>
            <button type="button" className={"icon" + (showSaved ? " on" : "")} aria-label="Saved places" aria-pressed={showSaved} title="Saved places" onClick={() => setShowSaved((v) => !v)}>
              <HeartIcon filled={showSaved} />
              {favorites.length > 0 && <i className="badge">{favorites.length}</i>}
            </button>
            <button type="button" className={"icon" + (panel === "filter" ? " open" : "")} aria-label="Filters" title="Filters" onClick={() => togglePanel("filter")}>
              <FilterIcon />
              {nFilters > 0 && <i className="badge">{nFilters}</i>}
            </button>
            <button type="button" className={"icon" + (panel === "sort" ? " open" : "")} aria-label="Sort" title="Sort" onClick={() => togglePanel("sort")}><SortIcon /></button>
            <button type="button" className={"icon" + (panel === "account" ? " open" : "")} aria-label="Account" title={email} onClick={() => togglePanel("account")}>
              <span className="initial">{(email[0] || "?")}</span>
            </button>
          </div>
          <p className="sub" id="count">{showSaved ? `${favorites.length} saved ${favorites.length === 1 ? "place" : "places"}` : count}</p>
          <div className="progress"><i /></div>
        </div>

        {panel === "filter" && <FilterPanel f={filters} onChange={changeFilters} onReset={resetFilters} />}
        {panel === "sort" && <SortPanel value={filters.sort} onChange={(s) => { setPanel(null); changeFilters({ sort: s }); }} />}
        {panel === "account" && (
          <div className="panel account">
            <p className="sub">Signed in as</p>
            <p className="p1" title={email}>{email}</p>
            <form action="/auth/signout" method="post" className="foot">
              <span className="sub">Saved places sync to your account.</span>
              <button type="submit" className="chip"><SignOutIcon />Sign out</button>
            </form>
          </div>
        )}

        <div id="list" ref={listEl}>
          {favNote && <p className="sub" style={{ padding: "10px 16px", color: "var(--accent-ink)" }}>{favNote}</p>}
          {listItems.map((r, i) => (
            <RestaurantCard key={r.id} r={r} index={i} active={detail?.id === r.id} meal={filters.meal}
              onClick={() => (showSaved ? openSaved(r) : highlight(r.id, true))} />
          ))}
          {!showSaved && items.length > 0 && <div id="sentinel" ref={sentinelRef} />}
          {showSaved && favorites.length === 0 && (
            <div className="empty"><h2>Nothing saved yet</h2><p className="p2">Tap the heart on a place to keep it here.</p></div>
          )}
          {!showSaved && searched && !loading && items.length === 0 && (
            <div className="empty"><h2>Nothing here</h2><p className="p2">Try fewer filters, or search a wider area.</p></div>
          )}
        </div>
      </aside>

      {detail && <DetailPanel key={detail.id} r={detail} saved={isSaved(detail.id)} onToggleSave={() => toggleFavorite(detail)} onClose={closeDetail} />}

      <div id="ctl" className="float">
        <button type="button" aria-label="Zoom in" onClick={() => E.map?.zoomIn()}><ZoomInIcon /></button>
        <button type="button" aria-label="Zoom out" onClick={() => E.map?.zoomOut()}><ZoomOutIcon /></button>
      </div>
      <button type="button" id="recenter" className={"float" + (showRecenter ? " show" : "")} title="Back to me" onClick={recenter}><RecenterIcon /></button>

      <div id="dock">
        <div id="areaBar" className={"float" + (showArea ? " show" : "") + (loading ? " loading" : "")}>
          <button type="button" disabled={loading} onClick={searchArea}><RefreshIcon /><span>{loading ? "Searching…" : "Search this area"}</span></button>
          <div className="bar"><i /></div>
        </div>
        <div id="search" className="float">
          <form autoComplete="off" onSubmit={(e) => { e.preventDefault(); submit(); }}>
            <SearchIcon />
            <input id="q" ref={qEl} type="search" placeholder="What do you feel like? Ramen, sushi, cafe…" enterKeyHint="search"
              value={q} onChange={(e) => { setQ(e.target.value); updateSuggest(e.target.value); }} onKeyDown={onQKey}
              onBlur={() => setTimeout(() => setSuggest([]), 120)} />
            {q && <button type="button" id="clearQ" aria-label="Clear" onClick={() => submit("")}><XIcon /></button>}
          </form>
          {suggest.length > 0 && (
            <div id="suggest" className="float">
              {suggest.map((g, i) => <div key={g.code} className={"p1" + (i === selIdx ? " sel" : "")} onMouseDown={() => submit(g.label)}>{g.label}</div>)}
            </div>
          )}
        </div>
      </div>

      {ctx && (
        <div id="ctx" className="float" style={{ left: ctx.x, top: ctx.y }}>
          <button type="button" onClick={setHere}>Set my location here</button>
        </div>
      )}
    </div>
  );
}
