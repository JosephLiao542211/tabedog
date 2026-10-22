"use client";

// The public landing page floats over the real map. One fixed MapLibre map drifts slowly across
// central Tokyo behind the page; small non-interactive maps sit inside sections. Pins are real
// top-rated restaurants near Shibuya, fetched once from /api/landing-spots and shared through context.
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import maplibregl, { type LngLatLike, type Map as MLMap, type Marker } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { MAP_STYLE, tintMap } from "@/lib/map-style";
import type { Spot } from "@/lib/landing";
import { HEART_SVG } from "./icons";

const SHIBUYA: LngLatLike = [139.7005, 35.6595];
// a slow loop: Shibuya, Harajuku, Aoyama, Ebisu, Daikanyama and back
const DRIFT: LngLatLike[] = [[139.7005, 35.6595], [139.7025, 35.6705], [139.7155, 35.6665], [139.7105, 35.6465], [139.7005, 35.6485]];
const FALLBACK: Spot[] = [
  { id: "f1", url: "#", name: "Shibuya", rating: null, reviews: 0, genre: "", station: "", lat: 35.6612, lng: 139.7035, photo: null, lunch: "", dinner: "", pay: null, hours: "", closed: "" },
  { id: "f2", url: "#", name: "Harajuku", rating: null, reviews: 0, genre: "", station: "", lat: 35.6702, lng: 139.7027, photo: null, lunch: "", dinner: "", pay: null, hours: "", closed: "" },
  { id: "f3", url: "#", name: "Daikanyama", rating: null, reviews: 0, genre: "", station: "", lat: 35.6487, lng: 139.7031, photo: null, lunch: "", dinner: "", pay: null, hours: "", closed: "" },
  { id: "f4", url: "#", name: "Ebisu", rating: null, reviews: 0, genre: "", station: "", lat: 35.6467, lng: 139.7101, photo: null, lunch: "", dinner: "", pay: null, hours: "", closed: "" },
  { id: "f5", url: "#", name: "Aoyama", rating: null, reviews: 0, genre: "", station: "", lat: 35.6651, lng: 139.7137, photo: null, lunch: "", dinner: "", pay: null, hours: "", closed: "" },
];

type Ctx = { spots: Spot[]; live: boolean };
const SpotsCtx = createContext<Ctx>({ spots: [], live: false });
export const useSpots = () => useContext(SpotsCtx);

export function LandingSpots({ children }: { children: ReactNode }) {
  const [ctx, setCtx] = useState<Ctx>({ spots: [], live: false });
  useEffect(() => {
    let on = true;
    fetch("/api/landing-spots")
      .then((r) => r.json())
      .then((d: { spots?: Spot[] }) => { if (on) setCtx(d.spots?.length ? { spots: d.spots, live: true } : { spots: FALLBACK, live: false }); })
      .catch(() => { if (on) setCtx({ spots: FALLBACK, live: false }); });
    return () => { on = false; };
  }, []);
  return <SpotsCtx.Provider value={ctx}>{children}</SpotsCtx.Provider>;
}

const reduceMotion = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function newMap(container: HTMLDivElement, center: LngLatLike, zoom: number) {
  const map = new maplibregl.Map({ container, style: MAP_STYLE, center, zoom, interactive: false, attributionControl: false, fadeDuration: 0 });
  map.once("load", () => tintMap(map));
  return map;
}

// ---------- pins ----------
type Variant = "rating" | "open" | "hearts";
const HEART_COLORS = ["#ff6347", "#2f7de1", "#4CB944", "#9b59b6"];

function pinEl(s: Spot, i: number, variant: Variant): HTMLDivElement {
  // MapLibre positions the outer element with an inline transform, so the drop-in animation runs on the inner one
  const el = document.createElement("div");
  const inner = document.createElement("div");
  inner.style.animationDelay = `${Math.min(i, 24) * 45}ms`;
  el.appendChild(inner);
  if (variant === "hearts") {
    inner.className = "pin saved ld-drop";
    inner.style.setProperty("--pin", HEART_COLORS[i % HEART_COLORS.length]);
    inner.innerHTML = `<span>${HEART_SVG}</span>`;
    return el;
  }
  inner.className = "ld-pin ld-drop" + (i < 3 && s.rating != null ? " top" : "") + (variant === "open" && s.open ? " open" : "");
  inner.innerHTML = `<i></i><b></b>`;
  inner.querySelector("b")!.textContent = s.rating != null ? s.rating.toFixed(2) : s.name;
  return el;
}

function addPins(map: MLMap, spots: Spot[], variant: Variant): Marker[] {
  return spots.map((s, i) => new maplibregl.Marker({ element: pinEl(s, i, variant), anchor: "bottom" }).setLngLat([s.lng, s.lat]).addTo(map));
}

// ---------- the map behind the whole page ----------
export function LandingMap() {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MLMap | null>(null);
  const { spots } = useSpots();

  useEffect(() => {
    const el = ref.current; if (!el) return;
    const map = newMap(el, SHIBUYA, 14.2);
    mapRef.current = map;
    let k = 0, stop = false;
    const drift = () => {
      if (stop || reduceMotion()) return;
      k = (k + 1) % DRIFT.length;
      map.easeTo({ center: DRIFT[k], duration: 48000, easing: (t) => t, essential: false });
    };
    map.once("load", () => { setTimeout(drift, 1500); });
    map.on("moveend", drift);
    return () => { stop = true; map.remove(); mapRef.current = null; };
  }, []);

  useEffect(() => {
    const map = mapRef.current; if (!map || !spots.length) return;
    const markers = addPins(map, spots, "rating");
    // centre the drift on where the pins actually are
    const lat = spots.reduce((a, s) => a + s.lat, 0) / spots.length, lng = spots.reduce((a, s) => a + s.lng, 0) / spots.length;
    DRIFT.splice(0, DRIFT.length, ...([[0, 0], [0.004, 0.008], [0.014, 0.004], [0.01, -0.008], [-0.002, -0.006]] as const).map(([dx, dy]) => [lng + dx, lat + dy] as LngLatLike));
    if (!map.isMoving()) map.jumpTo({ center: DRIFT[0] });
    return () => markers.forEach((m) => m.remove());
  }, [spots]);

  return <div className="ld-map" aria-hidden="true"><div ref={ref} className="ld-map-canvas" /></div>;
}

// ---------- small maps inside sections: built when scrolled near, never interactive ----------
export function MiniMap({ variant = "rating", count = 12, zoom = 14, className = "", children }: { variant?: Variant; count?: number; zoom?: number; className?: string; children?: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MLMap | null>(null);
  const [ready, setReady] = useState(false);
  const { spots } = useSpots();

  useEffect(() => {
    const el = ref.current; if (!el) return;
    const io = new IntersectionObserver((es) => {
      if (!es.some((e) => e.isIntersecting) || mapRef.current) return;
      mapRef.current = newMap(el, SHIBUYA, zoom);
      setReady(true);
      io.disconnect();
    }, { rootMargin: "300px" });
    io.observe(el);
    return () => { io.disconnect(); mapRef.current?.remove(); mapRef.current = null; };
  }, [zoom]);

  useEffect(() => {
    const map = mapRef.current; if (!ready || !map || !spots.length) return;
    // a different slice per variant so the three maps don't all show the same corner of Shibuya
    const offset = variant === "hearts" ? 6 : variant === "open" ? 3 : 0;
    let pick = spots.slice(offset, offset + count);
    if (variant === "open") pick = [...spots.filter((s) => s.open), ...spots.filter((s) => !s.open)].slice(0, count);
    const markers = addPins(map, pick, variant);
    const b = new maplibregl.LngLatBounds();
    pick.forEach((s) => b.extend([s.lng, s.lat]));
    // the hero map has a search pill on top and the restaurant card at the bottom; keep pins clear of both
    if (variant === "rating") {
      // the hero: a street-level view centred on the pins, nudged up so the restaurant card at the bottom covers none of them
      const lat = pick.reduce((a, s) => a + s.lat, 0) / pick.length, lng = pick.reduce((a, s) => a + s.lng, 0) / pick.length;
      const narrow = map.getContainer().clientWidth < 600; // a phone-width map shows a quarter of the area: step out
      map.jumpTo({ center: [lng, lat - (narrow ? 0.004 : 0.0025)], zoom: narrow ? zoom - 1 : zoom });
    } else if (!b.isEmpty()) map.fitBounds(b, { padding: 56, maxZoom: 15.5, duration: 0 });
    return () => markers.forEach((m) => m.remove());
  }, [ready, spots, variant, count]);

  return (
    <div className={`ld-mini ${className}`}>
      <div ref={ref} className="ld-map-canvas" aria-hidden="true" />
      {children}
    </div>
  );
}

// ---------- the hero's restaurant card: the top-rated spot, as the app shows it ----------
export function SpotCard() {
  const { spots, live } = useSpots();
  const s = live ? spots[0] : null;
  if (!s) {
    return (
      <div className="ld-spot ld-spot-skeleton" aria-hidden="true">
        <i className="ld-spot-img" /><div><i /><i /><i /></div>
      </div>
    );
  }
  const pay = s.pay ? [s.pay.card && "Card", s.pay.emoney && "IC", s.pay.qr && "QR", s.pay.cash && "Cash"].filter(Boolean).join(" · ") : "";
  return (
    <a className="ld-spot" href={s.url} target="_blank" rel="nofollow noopener" aria-label={`${s.name} on Tabelog`}>
      {s.photo ? <img className="ld-spot-img" src={s.photo} alt="" loading="lazy" /> : <i className="ld-spot-img" />}
      <div className="ld-spot-body">
        <div className="ld-spot-top">
          <span className="ld-spot-rating">{s.rating?.toFixed(2)}</span>
          <span className="ld-spot-reviews">{s.reviews.toLocaleString()} reviews</span>
          {s.open != null && <span className={`ld-spot-open ${s.open ? "yes" : "no"}`}>{s.open ? "Open now" : "Closed now"}</span>}
        </div>
        <strong className="ld-spot-name">{s.name}</strong>
        <span className="ld-spot-meta">{[s.genre, s.station && `${s.station} Station`].filter(Boolean).join(" · ")}</span>
        <span className="ld-spot-meta">{[s.dinner && `Dinner ${s.dinner}`, s.lunch && `Lunch ${s.lunch}`, pay].filter(Boolean).join(" · ")}</span>
      </div>
    </a>
  );
}
