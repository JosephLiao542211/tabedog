import express from "express";
import * as cheerio from "cheerio";
import geoip from "geoip-lite";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createCache } from "./cache.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3456;

// Tabelog's mobile site is the only one that honours lat/lon ("near me") search,
// so every listing goes through it. Detail pages come from the desktop site,
// which embeds coordinates in a static-map URL and lists business hours.
const MOBILE_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
const DESKTOP_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

const LIST_TTL = 15 * 60;             // seconds: a scraped listing page
const INFO_TTL = 90 * 24 * 60 * 60;   // seconds: a restaurant's coordinates, address, hours
const IPLOC_TTL = 60 * 60;            // seconds: IP-based location of this machine
const DETAIL_CONCURRENCY = 6;
const TABELOG_PAGES_PER_CALL = 2;     // 2 x 20 results per search call

// Tabelog's LstRange codes for near-me radius
export const RANGES = { F: 300, G: 500, A: 800, B: 1000, C: 3000, D: 5000, E: 10000 };
// LstCos / LstCosT price codes (JPY thresholds)
const PRICE_CODES = [0, 1000, 2000, 3000, 4000, 5000, 6000, 8000, 10000, 15000, 20000, 30000, 40000, 50000, 60000, 80000, 100000];

// Genre slugs understood by s.tabelog.com/en/rstLst/{slug}/ with the words people type for them
export const GENRES = [
  ["RC", "All restaurants", "anything everything food restaurant"],
  ["ramen", "Ramen", "tsukemen noodles noodle"],
  ["sushi", "Sushi", "sashimi nigiri omakase"],
  ["washoku", "Washoku", "japanese cuisine traditional kaiseki"],
  ["japanese", "Japanese", "japanese cuisine"],
  ["yakiniku", "Yakiniku", "japanese bbq barbecue grill beef wagyu"],
  ["yakitori", "Yakitori", "grilled chicken skewers kushiyaki"],
  ["izakaya", "Izakaya", "tavern pub drinks beer"],
  ["tempura", "Tempura", "fried"],
  ["tonkatsu", "Tonkatsu", "pork cutlet katsu"],
  ["soba", "Soba", "buckwheat noodles"],
  ["udon", "Udon", "wheat noodles"],
  ["unagi", "Unagi", "eel"],
  ["gyouza", "Gyoza", "dumpling dumplings"],
  ["seafood", "Seafood", "fish crab oyster"],
  ["curry", "Curry", "japanese curry indian"],
  ["chinese", "Chinese", "dim sum"],
  ["korea", "Korean", "kbbq bibimbap"],
  ["thai", "Thai", "pad thai"],
  ["steak", "Steak", "beef"],
  ["hamburger", "Hamburger", "burger burgers"],
  ["hamburgersteak", "Hamburger steak", "hambagu"],
  ["pizza", "Pizza", "pizzeria"],
  ["pasta", "Pasta", "spaghetti"],
  ["italian", "Italian", "trattoria"],
  ["french", "French", "bistro fine dining"],
  ["spain", "Spanish", "tapas paella"],
  ["bistro", "Bistro", "wine"],
  ["yoshoku", "Yoshoku", "western omurice"],
  ["okonomiyaki", "Okonomiyaki", "savory pancake"],
  ["monjya", "Monjayaki", "monja"],
  ["nabe", "Nabe", "hot pot hotpot"],
  ["syabusyabu", "Shabu shabu", "shabu hotpot"],
  ["motsu", "Motsunabe", "offal hot pot"],
  ["horumon", "Horumon", "tripe offal"],
  ["kushiage", "Kushiage", "deep fried skewers kushikatsu"],
  ["teishoku", "Teishoku", "set meal cafeteria"],
  ["okinawafood", "Okinawan", "okinawa"],
  ["cafe", "Cafe", "coffee kissaten espresso"],
  ["kissaten", "Kissaten", "coffee shop retro"],
  ["sweets", "Sweets", "dessert desserts parfait"],
  ["cake", "Cake", "patisserie pastry"],
  ["pan", "Bakery", "bread sandwich sandwiches"],
  ["tapioca", "Bubble tea", "boba tapioca"],
  ["bar", "Bar", "cocktail cocktails whisky"],
  ["viking", "Buffet", "all you can eat"],
  ["lunch", "Lunch", "lunch spots"],
  ["ryokan", "Ryokan", "inn auberge"],
];
const GENRE_LABEL = Object.fromEntries(GENRES.map(([c, l]) => [c, l]));

// free text -> genre slug. Exact slug, then label/word match, then keyword match, else all restaurants.
export function resolveGenre(q) {
  const s = String(q || "").toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
  if (!s) return { code: "RC", label: GENRE_LABEL.RC, matched: true };
  const words = s.split(" ");
  let best = null, bestScore = 0;
  for (const [code, label, kws] of GENRES) {
    const l = label.toLowerCase();
    let score = 0;
    if (s === code || s === l) score = 100;
    else if (l.startsWith(s) || s.startsWith(l)) score = 80;
    else if (words.some((w) => w.length > 2 && (l.includes(w) || w.includes(l)))) score = 60;
    else if (words.some((w) => w.length > 2 && kws.split(" ").some((k) => k === w || (w.length > 3 && k.startsWith(w))))) score = 40;
    if (score > bestScore) { bestScore = score; best = code; }
  }
  return best ? { code: best, label: GENRE_LABEL[best], matched: true } : { code: "RC", label: GENRE_LABEL.RC, matched: false };
}

// ---------- caches ----------
const cache = await createCache();
const inflight = new Map(); // key -> Promise, dedupes concurrent identical scrapes
async function cached(key, ttlSec, fn, valid = () => true) {
  const hit = await cache.get(key).catch((e) => { console.error("[cache] get failed:", e.message); return undefined; });
  if (hit !== undefined && valid(hit)) return hit;
  if (inflight.has(key)) return inflight.get(key);
  const p = (async () => {
    const v = await fn();
    await cache.set(key, v, ttlSec).catch((e) => console.error("[cache] set failed:", e.message));
    return v;
  })().finally(() => inflight.delete(key));
  inflight.set(key, p);
  return p;
}
// one-time import of the old coords-cache.json, if present
try {
  const old = JSON.parse(fs.readFileSync(path.join(__dirname, "coords-cache.json"), "utf8"));
  let n = 0;
  for (const [id, c] of Object.entries(old)) {
    if (c.lat != null && (await cache.get(`coords:${id}`)) === undefined) { await cache.set(`coords:${id}`, c, INFO_TTL); n++; }
  }
  if (n) console.log(`[cache] imported ${n} coordinates from coords-cache.json`);
} catch {}

async function fetchHtml(url, ua) {
  const res = await fetch(url, { headers: { "user-agent": ua, "accept-language": "en-US,en;q=0.9" } });
  if (!res.ok) throw new Error(`Tabelog returned ${res.status} for ${url}`);
  return res.text();
}

// ---------- listing scrape (mobile markup) ----------
function parseList(html) {
  const $ = cheerio.load(html);
  const text = (el) => $(el).text().replace(/\s+/g, " ").trim();
  const items = [];
  $(".list-rst").each((_, el) => {
    const card = $(el);
    const mobileUrl = card.find(".list-rst__target").attr("data-detail-url") || card.find(".list-rst__rst-name-target").attr("href");
    if (!mobileUrl) return;
    const url = mobileUrl.replace("https://s.tabelog.com/", "https://tabelog.com/");
    const id = (url.match(/\/(\d+)\/?$/) || [])[1];
    if (!id) return;
    const areaGenre = text(card.find(".list-rst__area-genre"));
    const [station = "", genre = ""] = areaGenre.split("/").map((s) => s.trim());
    const near = station.match(/^([\d.]+)\s*(m|km) from current location/);
    const prices = {};
    card.find(".list-rst__budget-item").each((_, li) => {
      const kind = $(li).find(".c-rating-v3__time--dinner").length ? "dinner" : "lunch";
      const v = text($(li).find(".list-rst__budget-val"));
      prices[kind] = v === "-" ? "" : v;
    });
    items.push({
      id, url,
      name: text(card.find(".list-rst__rst-name-target")),
      rating: parseFloat(text(card.find(".list-rst__rate .c-rating-v3__val"))) || null,
      reviews: Number(text(card.find(".list-rst__count-num")).replace(/,/g, "")) || 0,
      station: near ? "" : station,
      tabelogDistanceM: near ? Math.round(parseFloat(near[1]) * (near[2] === "km" ? 1000 : 1)) : null,
      genre: genre.split(",")[0].replace(/\s*\(.*?\)\s*/g, "").trim(),
      genreFull: genre,
      dinner: prices.dinner || "",
      lunch: prices.lunch || "",
      closed: text(card.find(".list-rst__subdata-subject--holiday").siblings(".list-rst__subdata-text")),
      image: card.find(".list-rst__photo-img").first().attr("data-lazy") || null,
    });
  });
  return { items };
}

// ---------- coordinates + hours from the desktop detail page ----------
async function getInfo(item) {
  return cached(`coords:${item.id}`, INFO_TTL, async () => {
    const html = await fetchHtml(item.url, DESKTOP_UA);
    const m = html.match(/center=(-?\d+\.\d+),(-?\d+\.\d+)/);
    const $ = cheerio.load(html);
    const row = (label) => $("th").filter((_, th) => $(th).text().trim().toLowerCase() === label).first().next("td").text().replace(/\s+/g, " ").trim();
    const address = $(".rstinfo-table__address").first().text().replace(/\s+/g, " ").trim();
    if (!m) throw new Error("no coordinates on detail page");
    return { lat: Number(m[1]), lng: Number(m[2]), address, hours: row("business hours") || "" };
  }, (v) => v.hours !== undefined) // entries cached before hours were scraped get refreshed
    .catch((e) => ({ lat: null, lng: null, address: "", hours: "", error: e.message }));
}

// ---------- open / closed right now (JST) ----------
// Tabelog hours come as day groups: "Mon, Tue, Wed 11:00 AM - 10:30 PM Sat Open 24 hours",
// older pages as "■Business hours 19:00 - 3:00 ■Closed on Mondays".
const DAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
const TIME = /(\d{1,2}):(\d{2})\s*(am|pm)?\s*[-–~〜]\s*(\d{1,2}):(\d{2})\s*(am|pm)?/i;
const toMin = (h, m, ap) => { h = +h % 24; if (ap) { h = h % 12 + (ap.toLowerCase() === "pm" ? 12 : 0); } return h * 60 + +m; };
export function parseHours(text) {
  const groups = []; // { days:Set|null, ranges:[[s,e]] }
  let cur = null;
  const tokens = String(text || "").replace(/public holiday|day before public holiday/gi, "").matchAll(
    new RegExp(`\\b(${DAYS.join("|")})[a-z]*\\b|open 24 hours|${TIME.source}`, "gi"));
  for (const t of tokens) {
    const tok = t[0].toLowerCase();
    if (DAYS.includes(tok.slice(0, 3)) && !/\d/.test(tok)) {
      if (!cur || cur.ranges.length) { cur = { days: new Set(), ranges: [] }; groups.push(cur); }
      cur.days.add(DAYS.indexOf(tok.slice(0, 3)));
      continue;
    }
    if (!cur) { cur = { days: null, ranges: [] }; groups.push(cur); }
    if (tok === "open 24 hours") { cur.ranges.push([0, 1440]); continue; }
    const m = t[0].match(TIME);
    const s = toMin(m[1], m[2], m[3] || (m[6] && +m[1] <= 12 && +m[1] >= 1 && m[6].toLowerCase() === "pm" && +m[4] >= +m[1] ? null : m[3]));
    let e = toMin(m[4], m[5], m[6]);
    if (e <= s) e += 1440;
    cur.ranges.push([s, e]);
  }
  return groups.filter((g) => g.ranges.length);
}
export function openNow(hoursText, closedText, at = Date.now()) {
  const d = new Date(at + 9 * 3600e3); // JST
  const day = d.getUTCDay(), now = d.getUTCHours() * 60 + d.getUTCMinutes();
  const closedPart = `${closedText || ""} ${(String(hoursText || "").match(/closed on[^■]*/i) || [""])[0]}`;
  if (!/every ?day|no holiday|none|daily/i.test(closedPart) && new RegExp(`\\b${DAYS[day]}`, "i").test(closedPart)) return false;
  const groups = parseHours(hoursText);
  if (!groups.length) return null;
  const forDay = (dd) => groups.filter((g) => !g.days || g.days.has(dd)).flatMap((g) => g.ranges);
  const today = forDay(day), yesterday = forDay((day + 6) % 7);
  const anyDayed = groups.some((g) => g.days);
  if (anyDayed && !today.length && !yesterday.some(([, e]) => e > 1440)) return false;
  return today.some(([s, e]) => now >= s && now < e) || yesterday.some(([s, e]) => e > 1440 && now + 1440 >= s && now + 1440 < e);
}

async function mapLimit(arr, limit, fn) {
  const out = new Array(arr.length);
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(limit, arr.length) }, async () => {
    while (i < arr.length) { const idx = i++; out[idx] = await fn(arr[idx]); }
  }));
  return out;
}

// one Tabelog listing page, with coordinates/hours merged in
async function loadPage(url) {
  return cached(`list:${url}`, LIST_TTL, async () => {
    const listing = parseList(await fetchHtml(url, MOBILE_UA));
    const info = await mapLimit(listing.items, DETAIL_CONCURRENCY, getInfo);
    listing.items.forEach((it, i) => Object.assign(it, info[i]));
    return { source: url, fetchedAt: new Date().toISOString(), items: listing.items };
  });
}

// ---------- helpers ----------
const clean = (v, re, def = "") => { const s = String(v ?? "").replace(re, ""); return s || def; };
function parseCookies(req) {
  const out = {};
  for (const part of (req.headers.cookie || "").split(";")) {
    const i = part.indexOf("=");
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}
function locationFrom(req) {
  let lat = parseFloat(req.query.lat), lon = parseFloat(req.query.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    try { const c = JSON.parse(parseCookies(req).tabelog_loc || ""); lat = Number(c.lat); lon = Number(c.lng); } catch {}
  }
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;
  return { lat, lon };
}
function haversine(a, b) {
  const R = 6371000, toR = (d) => (d * Math.PI) / 180;
  const dLat = toR(b.lat - a.lat), dLng = toR(b.lng - a.lng);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toR(a.lat)) * Math.cos(toR(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}
const isPrivateIp = (ip) => /^(::1|::ffff:127\.|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|fe80:|fc|fd|::ffff:10\.|::ffff:192\.168\.)/.test(ip);

// ---------- API ----------
const app = express();
app.set("trust proxy", true);
app.use(express.static(path.join(__dirname, "public")));

app.get("/api/health", async (_req, res) => res.json({ ok: true, cache: cache.name, ...(await cache.stats()) }));
app.get("/api/genres", (_req, res) => res.json(GENRES.map(([code, label]) => ({ code, label }))));

// Coarse location from the caller's IP (geoip-lite's bundled MaxMind data).
// From a private/loopback address the public IP of this machine is looked up instead.
app.get("/api/locate", async (req, res) => {
  const ip = (req.ip || "").replace(/^::ffff:/, "");
  try {
    let hit = isPrivateIp(ip) ? null : geoip.lookup(ip);
    let src = "ip";
    if (!hit) {
      hit = await cached("iploc:self", IPLOC_TTL, async () => {
        const r = await fetch("https://ipapi.co/json/", { headers: { "user-agent": "tabelog-map/1.0" } });
        if (!r.ok) throw new Error(`ipapi ${r.status}`);
        const j = await r.json();
        if (!Number.isFinite(j.latitude)) throw new Error("no coordinates from ipapi");
        return { ll: [j.latitude, j.longitude], city: j.city || "", country: j.country_code || "" };
      });
      src = "ip (public)";
    }
    res.json({ lat: hit.ll[0], lng: hit.ll[1], acc: 5000, src, city: hit.city || "", country: hit.country || "" });
  } catch (e) {
    res.status(502).json({ error: e.message });
  }
});

// The one search endpoint. Every filter and sort is applied here so the client only renders.
//   lat, lon        centre (or tabelog_loc cookie)
//   range           F..E Tabelog radius code
//   q               free text, resolved to a Tabelog genre
//   sort            distance | rating | reviews
//   pay             comma list of card,qr,emoney
//   pmin, pmax      price codes 0..16 (see PRICE_CODES), meal = dinner | lunch
//   minRating       e.g. 3.5
//   open            1 = only places open right now (JST)
//   page            1-based, each page = TABELOG_PAGES_PER_CALL Tabelog pages
app.get("/api/search", async (req, res) => {
  const loc = locationFrom(req);
  if (!loc) return res.status(400).json({ error: "No location. Pass lat & lon or set the tabelog_loc cookie." });
  const range = RANGES[req.query.range] ? String(req.query.range) : "A";
  const genre = resolveGenre(req.query.q);
  const sort = ["distance", "rating", "reviews"].includes(req.query.sort) ? req.query.sort : "distance";
  const pay = new Set(String(req.query.pay || "").split(",").filter(Boolean));
  const pmin = Math.max(0, Math.min(16, parseInt(req.query.pmin, 10) || 0));
  const pmax = Math.max(0, Math.min(16, parseInt(req.query.pmax, 10) || 0));
  const meal = req.query.meal === "lunch" ? "1" : "2";
  const minRating = Math.max(0, Math.min(5, parseFloat(req.query.minRating) || 0));
  const open = req.query.open === "1";
  const page = Math.max(1, Math.min(30, parseInt(req.query.page, 10) || 1));

  const q = new URLSearchParams({ lat: loc.lat.toString(), lon: loc.lon.toString(), LstRange: range });
  if (sort === "rating" || minRating > 0) q.set("SrtT", "rt"); // Tabelog sorts by rating natively
  if (pay.has("card")) q.set("ChkCard", "1");
  if (pay.has("qr")) q.set("ChkQrcodePayment", "1");
  if (pay.has("emoney")) q.set("ChkEMoneyPayment", "1");
  if (pmin || pmax) { q.set("LstCos", String(pmin)); q.set("LstCosT", String(pmax)); q.set("RdoCosTp", meal); }
  const pageUrl = (n) => `https://s.tabelog.com/en/rstLst/${genre.code}/${n > 1 ? n + "/" : ""}?${q}`;
  const first = (page - 1) * TABELOG_PAGES_PER_CALL + 1;
  const urls = Array.from({ length: TABELOG_PAGES_PER_CALL }, (_, i) => pageUrl(first + i));

  try {
    const pages = await Promise.all(urls.map(loadPage));
    const origin = { lat: loc.lat, lng: loc.lon };
    const seen = new Set();
    let items = [];
    for (const p of pages) for (const it of p.items) if (!seen.has(it.id)) { seen.add(it.id); items.push(it); }
    const lastFull = pages[pages.length - 1].items.length >= 20;
    items = items.map((r) => ({
      ...r,
      distM: r.lat != null ? Math.round(haversine(origin, r)) : r.tabelogDistanceM,
      open: openNow(r.hours, r.closed),
    }));
    const ratingCutoff = minRating > 0 && items.length && items[items.length - 1].rating != null && items[items.length - 1].rating < minRating;
    if (minRating > 0) items = items.filter((r) => (r.rating ?? 0) >= minRating);
    if (open) items = items.filter((r) => r.open === true);
    const key = { distance: (r) => r.distM ?? 1e12, rating: (r) => -(r.rating ?? 0), reviews: (r) => -(r.reviews ?? 0) }[sort];
    items.sort((a, b) => key(a) - key(b));
    const widened = items.length > 0 && items.every((r) => r.distM != null && r.distM > RANGES[range]);
    res.json({
      fetchedAt: pages[0].fetchedAt, source: urls[0], page, hasMore: lastFull && !ratingCutoff,
      origin, radiusM: RANGES[range], genre, sort, widened,
      items: items.map(({ hours, closed, genreFull, error, station, ...r }) => r),
    });
  } catch (e) {
    res.status(502).json({ error: e.message, source: urls[0] });
  }
});

app.listen(PORT, () => console.log(`tabelog-map running at http://localhost:${PORT}`));
