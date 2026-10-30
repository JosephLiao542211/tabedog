// Tabelog has no public API, so this scrapes it. The mobile site is the only one that honours
// lat/lon ("near me") search, so every listing goes through it; detail pages come from the desktop
// site, which embeds coordinates in a static-map URL and lists business hours. Server only.
import * as cheerio from "cheerio";
import { cached } from "./cache";
import { haversine } from "./geo";
import { bigPhoto, priceYenOf } from "./format";
import { nameMatches, parseQuery, RANGES } from "./genres";
import { parseSchedule } from "./hours";
import type { Pay, PlaceHit, Restaurant, Review, ReviewsResponse, SearchResponse, SortKey } from "./types";

const MOBILE_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
const DESKTOP_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

const LIST_TTL = 15 * 60;              // seconds: a scraped listing page
const INFO_TTL = 90 * 24 * 60 * 60;    // seconds: a restaurant's coordinates, address, hours
const DETAIL_CONCURRENCY = 6;
// Tabelog pages (20 results each) per search call: small circles get 3, so a tight area still shows its best 60
const pagesPerCall = (range: string) => (RANGES[range] <= 500 ? 3 : 2);
const VIEW_PER_PAGE = 40;              // results per call when searching the map view (one /xml/rstmap page)
const SORTS: SortKey[] = ["distance", "rating", "reviews", "price_asc", "price_desc"];

export class TabelogError extends Error {
  constructor(message: string, public source?: string) { super(message); }
}

async function fetchHtml(url: string, ua: string) {
  const res = await fetch(url, { headers: { "user-agent": ua, "accept-language": "en-US,en;q=0.9" }, cache: "no-store" });
  if (!res.ok) throw new Error(`Tabelog returned ${res.status} for ${url}`);
  return res.text();
}

// ---------- listing scrape (mobile markup) ----------
export type ListItem = Omit<Restaurant, "lat" | "lng" | "address" | "hours" | "pay" | "photos" | "access" | "distM" | "open">;

function thumb(img: ReturnType<ReturnType<typeof cheerio.load>>): string | null {
  const u = img.attr("data-lazy") || img.attr("data-src") || img.attr("src") || "";
  return /^https?:\/\//.test(u) ? u : null; // skip the clear.gif placeholder
}

export function parseList(html: string): ListItem[] {
  const $ = cheerio.load(html);
  const text = (el: unknown) => $(el as string).text().replace(/\s+/g, " ").trim();
  const items: ListItem[] = [];
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
    const prices: Record<string, string> = {};
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
      // the first card on a page is eagerly loaded (src), the rest are lazy (data-lazy)
      image: thumb(card.find(".list-rst__photo-img").first()),
    });
  });
  return items;
}

// ---------- coordinates, hours, payment, photos from the desktop detail page ----------

// v3 adds what a listing card shows (English name, categories, budget): map-view results come with Japanese text only
type Card = { name: string; genreFull: string; dinner: string; lunch: string };
type Info = { v: 3; lat: number; lng: number; address: string; hours: string; pay: Pay; photos: string[]; access: string; card?: Card };
type InfoResult = Omit<Info, "v" | "card"> | { lat: null; lng: null; address: ""; hours: ""; pay: null; photos: never[]; access: ""; error: string };

async function getInfo(item: Pick<ListItem, "id" | "url">): Promise<InfoResult> {
  return getInfoCard(item, false).then(([info]) => info);
}
/** The detail-page half of a restaurant, plus (needCard) its card text in English. */
async function getInfoCard(item: Pick<ListItem, "id" | "url">, needCard: boolean): Promise<[InfoResult, Card | null]> {
  return cached<Info>(`coords:${item.id}`, INFO_TTL, async () => {
    const html = await fetchHtml(item.url, DESKTOP_UA);
    const m = html.match(/center=(-?\d+\.\d+),(-?\d+\.\d+)/);
    const $ = cheerio.load(html);
    const row = (label: string) => $("th").filter((_, th) => $(th).text().trim().toLowerCase() === label).first().next("td").text().replace(/\s+/g, " ").trim();
    const address = $(".rstinfo-table__address").first().text().replace(/\s+/g, " ").trim();
    if (!m) throw new Error("no coordinates on detail page");
    const payText = row("payment methods");
    const pay: Pay = {
      card: /credit cards? accepted/i.test(payText),
      emoney: /electronic money accepted/i.test(payText),
      qr: /qr code payments? accepted/i.test(payText),
      cash: !/cash(?:less| not accepted)/i.test(payText),
    };
    // two thumbnail sizes of one photo enlarge to the same URL, so dedupe after bigPhoto
    const photos = [...new Set($(".rstdtl-top-postphoto__item img").map((_, i) => bigPhoto($(i).attr("src"))).get().filter((p): p is string => !!p))].slice(0, 10);
    const access = row("transportation").split(/\s*(?:・|^-\s|\s-\s)\s*/).map((t) => t.trim()).filter((t) => /walk|station|min/i.test(t))[0] || "";
    const hours = row("business hours").replace(/Hours and closed days may change.*$/i, "").trim();
    const budget = $(".rdheader-budget__price-target").map((_, e) => $(e).text().replace(/\s+/g, " ").trim()).get();
    const price = (t?: string) => (!t || t === "-" ? "" : t);
    return {
      v: 3, lat: Number(m[1]), lng: Number(m[2]), address, hours, pay, photos, access,
      card: { name: row("restaurant name") || $(".display-name").first().text().trim(), genreFull: row("categories"), dinner: price(budget[0]), lunch: price(budget[1]) },
    };
    // bump v when the scraped shape changes; older entries get refreshed (v2 still serves listings, which carry their own card text)
  }, (v) => v?.v === 3 || (!needCard && (v as { v?: number })?.v === 2))
    .then(({ v: _v, card, ...info }): [InfoResult, Card | null] => [info, card ?? null])
    .catch((e: Error): [InfoResult, Card | null] => [{ lat: null, lng: null, address: "", hours: "", pay: null, photos: [], access: "", error: e.message }, null]);
}

// ---------- open / closed right now (JST) ----------
// Uses the structured schedule from lib/hours.ts. "Closed on …" text (from the listing and the
// detail-page notes) can also rule today out, except for things like "the second Tuesday of each month".
const DAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
const ORDINAL_DAY = /\b(?:1st|2nd|3rd|4th|5th|first|second|third|fourth|fifth|last)(?:\s*(?:,|and|&)\s*(?:1st|2nd|3rd|4th|5th|first|second|third|fourth|fifth|last))*\s+(?:mon|tue|wed|thu|fri|sat|sun)[a-z]*/gi;

export function openNow(hoursText: string | null | undefined, closedText: string | null | undefined, at = Date.now()): boolean | null {
  const d = new Date(at + 9 * 3600e3); // JST
  const day = d.getUTCDay(), now = d.getUTCHours() * 60 + d.getUTCMinutes();
  const sched = parseSchedule(hoursText);
  const closedPart = [closedText || "", ...sched.notes.filter((n) => /closed|holiday/i.test(n.label) || /^closed on/i.test(n.text)).map((n) => n.text)]
    .join(" ").replace(ORDINAL_DAY, "");
  if (!/every ?day|no holiday|none|daily|year-round/i.test(closedPart) && new RegExp(`\\b${DAYS[day]}`, "i").test(closedPart)) return false;
  const rows = sched.rows;
  if (!rows.length) return null;
  const forDay = (dd: number) => rows.filter((r) => !r.days || r.days.includes(dd as 0)).flatMap((r) => (r.closed ? [] : r.slots.map((s) => [s.start, s.end] as const)));
  const today = forDay(day), yesterday = forDay((day + 6) % 7);
  const anyDayed = rows.some((r) => r.days);
  if (anyDayed && !today.length && !yesterday.some(([, e]) => e > 1440)) return false;
  if (!today.length && !yesterday.length) return null;
  return today.some(([s, e]) => now >= s && now < e) || yesterday.some(([s, e]) => e > 1440 && now + 1440 >= s && now + 1440 < e);
}

async function mapLimit<T, R>(arr: T[], limit: number, fn: (t: T) => Promise<R>): Promise<R[]> {
  const out = new Array<R>(arr.length);
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(limit, arr.length) }, async () => {
    while (i < arr.length) { const idx = i++; out[idx] = await fn(arr[idx]); }
  }));
  return out;
}

type PageItem = ListItem & InfoResult;
type Page = { source: string; fetchedAt: string; items: PageItem[] };

// one Tabelog listing page, with coordinates/hours merged in
async function loadPage(url: string): Promise<Page> {
  return cached<Page>(`list:${url}`, LIST_TTL, async () => {
    const listing = parseList(await fetchHtml(url, MOBILE_UA));
    const info = await mapLimit(listing, DETAIL_CONCURRENCY, getInfo);
    const items = listing.map((it, i) => ({ ...it, ...info[i] }) as PageItem);
    return { source: url, fetchedAt: new Date().toISOString(), items };
  });
}

// ---------- search ----------
export type SearchParams = {
  lat: number; lon: number;
  range: string;            // F..E Tabelog radius code
  q: string;                // free text: a genre, search conditions and a keyword (see parseQuery)
  sort: SortKey;
  pay: Set<string>;         // card, qr, emoney
  pmin: number; pmax: number; meal: "dinner" | "lunch";
  minRating: number;
  open: boolean;            // only places open right now (JST)
  page: number;             // 1-based, each page = pagesPerCall(range) Tabelog pages
  view?: View | null;       // search exactly this box (the map view) instead of the circle around lat/lon
};
export type View = { s: number; w: number; n: number; e: number };

export function locationFrom(sp: URLSearchParams, cookieValue?: string): { lat: number; lon: number } | null {
  let lat = parseFloat(sp.get("lat") ?? ""), lon = parseFloat(sp.get("lon") ?? "");
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    try { const c = JSON.parse(decodeURIComponent(cookieValue || "")); lat = Number(c.lat); lon = Number(c.lng); } catch { /* no cookie */ }
  }
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;
  return { lat, lon };
}

export function parseSearchParams(sp: URLSearchParams, loc: { lat: number; lon: number }): SearchParams {
  const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
  const sortRaw = sp.get("sort") as SortKey | null;
  return {
    lat: loc.lat, lon: loc.lon,
    range: RANGES[sp.get("range") ?? ""] ? String(sp.get("range")) : "A",
    q: sp.get("q") ?? "",
    sort: sortRaw && SORTS.includes(sortRaw) ? sortRaw : "rating",
    pay: new Set(String(sp.get("pay") || "").split(",").filter(Boolean)),
    pmin: clamp(parseInt(sp.get("pmin") ?? "", 10) || 0, 0, 16),
    pmax: clamp(parseInt(sp.get("pmax") ?? "", 10) || 0, 0, 16),
    meal: sp.get("meal") === "lunch" ? "lunch" : "dinner",
    minRating: clamp(parseFloat(sp.get("minRating") ?? "") || 0, 0, 5),
    open: sp.get("open") === "1",
    page: clamp(parseInt(sp.get("page") ?? "", 10) || 1, 1, 30),
    view: viewFrom(sp.get("bbox")),
  };
}

// "s,w,n,e" in degrees; no bigger than a few km, since past that the circle search covers it
function viewFrom(v: string | null): View | null {
  const [s, w, n, e] = String(v || "").split(",").map(Number);
  if (![s, w, n, e].every(Number.isFinite) || n <= s || e <= w || n - s > 0.05 || e - w > 0.05 || Math.abs(n) > 90 || Math.abs(e) > 180) return null;
  return { s, w, n, e };
}

// Tabelog's category codes for the genre slugs, deepest level (the map search filters by cat0..cat3 prefixes of it)
const CATS: Record<string, string> = {
  RC: "RC", ramen: "MC01", sushi: "RC0102", washoku: "RC01", japanese: "RC0101", yakiniku: "RC1301", yakitori: "RC010601",
  izakaya: "RC2101", tempura: "RC0103", tonkatsu: "RC012501", soba: "RC010401", udon: "RC012301", unagi: "RC010501",
  gyouza: "RC0308", seafood: "RC0112", curry: "RC12", chinese: "RC03", korea: "RC0401", thai: "RC040201", steak: "RC020101",
  hamburger: "RC022004", hamburgersteak: "RC020903", pizza: "RC021203", pasta: "RC021202", italian: "RC0212", french: "RC0211",
  spain: "RC0213", bistro: "RC021102", yoshoku: "RC020901", okonomiyaki: "RC010901", monjya: "RC010902", nabe: "RC14",
  syabusyabu: "RC012101", motsu: "RC1403", horumon: "RC1303", kushiage: "RC012503", teishoku: "RC980103", okinawafood: "RC019915",
  cafe: "SC10", kissaten: "SC1002", sweets: "SC02", cake: "SC0212", pan: "SC01", tapioca: "SC1009", bar: "BC", viking: "RC9810",
  ryokan: "YC0101",
};

const attr = (tag: string, name: string) => (tag.match(new RegExp(`\\s${name}="([^"]*)"`)) || [])[1] ?? "";

// one page of Tabelog's map search (/xml/rstmap): the best-rated places inside a box, with coordinates already on them.
// The text there is Japanese, so names, categories and budgets come from the English detail pages (cached for months).
async function loadViewPage(url: string): Promise<Page & { total: number }> {
  return cached(`rstmap:${url}`, LIST_TTL, async () => {
    const xml = await fetchHtml(url, DESKTOP_UA);
    const total = Number(attr(xml.match(/<srchinfo[^>]*>/)?.[0] ?? "", "cnt")) || 0;
    const markers = (xml.match(/<marker\s[^>]*>/g) || []).map((m) => ({
      id: attr(m, "id"), url: `https://tabelog.com/en${attr(m, "rsturl")}`, jaName: attr(m, "rstname"),
      score: parseFloat(attr(m, "score")) || null, reviews: Number(attr(m, "rvwcnt")) || 0,
      lat: Number(attr(m, "lat")), lng: Number(attr(m, "lng")), image: attr(m, "image_url") || null,
    })).filter((m) => /^\d+$/.test(m.id));
    const info = await mapLimit(markers, DETAIL_CONCURRENCY, (m) => getInfoCard(m, true));
    const items = markers.map((m, i): PageItem => {
      const [inf, card] = info[i], genreFull = card?.genreFull || "";
      return {
        ...inf,
        id: m.id, url: m.url, name: card?.name || m.jaName, rating: m.score, reviews: m.reviews,
        station: "", tabelogDistanceM: null,
        genre: genreFull.split(",")[0].replace(/\s*\(.*?\)\s*/g, "").trim(), genreFull,
        dinner: card?.dinner || "", lunch: card?.lunch || "", closed: "", image: m.image,
        // the marker's own coordinates when the detail page failed
        lat: inf.lat ?? m.lat, lng: inf.lng ?? m.lng,
      } as PageItem;
    });
    return { source: url, fetchedAt: new Date().toISOString(), items, total };
  });
}

/** The one search. Every filter and sort is applied here so the client only renders. */
export async function search(p: SearchParams): Promise<SearchResponse> {
  const parsed = parseQuery(p.q);
  const { genre, features } = parsed;
  // words in the search can stand in for the price and open-now filters, but never override them
  let { pmin, pmax, open } = p;
  const q = new URLSearchParams({ lat: p.lat.toString(), lon: p.lon.toString(), LstRange: p.range });
  for (const f of features) for (const [k, v] of new URLSearchParams(f.param)) {
    if (k === "pmin" || k === "pmax") { if (!p.pmin && !p.pmax) { if (k === "pmin") pmin = +v; else pmax = +v; } }
    else if (k === "open") open = true;
    else q.set(k, v);
  }
  if (p.sort === "rating" || p.minRating > 0) q.set("SrtT", "rt"); // Tabelog sorts by rating natively
  if (p.pay.has("card")) q.set("ChkCard", "1");
  if (p.pay.has("qr")) q.set("ChkQrcodePayment", "1");
  if (p.pay.has("emoney")) q.set("ChkEMoneyPayment", "1");
  if (pmin || pmax) { q.set("LstCos", String(pmin)); q.set("LstCosT", String(pmax)); q.set("RdoCosTp", p.meal === "lunch" ? "1" : "2"); }
  const per = pagesPerCall(p.range), first = (p.page - 1) * per + 1;
  const urlsFor = (keyword: string) => {
    const qq = new URLSearchParams(q);
    if (keyword) qq.set("sw", keyword);
    // a keyword with no genre searches /rstLst/ itself: under /rstLst/RC/ Tabelog's keyword matching goes loose
    const base = keyword && genre.code === "RC" ? "https://s.tabelog.com/en/rstLst/" : `https://s.tabelog.com/en/rstLst/${genre.code}/`;
    return Array.from({ length: per }, (_, i) => `${base}${first + i > 1 ? first + i + "/" : ""}?${qq}`);
  };
  // the map view, when the map is zoomed in past the smallest circle: Tabelog's map search takes a box, so every
  // result is on screen. It only understands Japanese keywords, so a search with one keeps to the circle.
  const view = p.view && CATS[genre.code] && !parsed.keyword ? p.view : null;
  const viewUrl = () => {
    const vq = new URLSearchParams(q);
    for (const k of ["lat", "lon", "LstRange"]) vq.delete(k);
    const cat = CATS[genre.code];
    vq.set("maxLat", String(view!.n)); vq.set("minLat", String(view!.s)); vq.set("maxLon", String(view!.e)); vq.set("minLon", String(view!.w));
    [2, 4, 6, 8].forEach((n, i) => { if (cat.length >= n) vq.set(`cat${i}`, cat.slice(0, n)); });
    vq.set("SrtT", "rt"); // best first whatever the sort: the box is the area, the sort orders what's in it
    vq.set("lst", String(VIEW_PER_PAGE)); vq.set("pg", String(p.page));
    return `https://tabelog.com/xml/rstmap?${vq}`;
  };

  let urls = view ? [viewUrl()] : urlsFor(parsed.keyword), pages: Page[], keywordDropped = false, total: number | null = null;
  try {
    if (view) { const pg = await loadViewPage(urls[0]); pages = [pg]; total = pg.total; }
    else pages = await Promise.all(urls.map(loadPage));
    // a keyword nothing matches, alongside a genre or a condition: those still mean something, so search without it
    if (!view && parsed.keyword && p.page === 1 && !pages[0].items.length && (genre.code !== "RC" || features.length)) {
      urls = urlsFor(""); pages = await Promise.all(urls.map(loadPage)); keywordDropped = true;
    }
  } catch (e) { throw new TabelogError((e as Error).message, urls[0]); }

  const origin = view ? { lat: (view.n + view.s) / 2, lng: (view.e + view.w) / 2 } : { lat: p.lat, lng: p.lon };
  const seen = new Set<string>();
  let items: Restaurant[] = [];
  for (const pg of pages) for (const it of pg.items) if (!seen.has(it.id)) {
    seen.add(it.id);
    const { error: _error, image, ...rest } = it as PageItem & { error?: string };
    items.push({
      ...rest,
      image: image || rest.photos?.[0] || null, // 150px listing thumbnail; cards are 64px so no need to enlarge
      distM: rest.lat != null ? Math.round(haversine(origin, { lat: rest.lat, lng: rest.lng! })) : rest.tabelogDistanceM,
      open: openNow(rest.hours, rest.closed),
    });
  }
  const lastFull = total != null ? p.page * VIEW_PER_PAGE < total : pages[pages.length - 1].items.length >= 20;
  const last = items[items.length - 1];
  const ratingCutoff = p.minRating > 0 && !!last && last.rating != null && last.rating < p.minRating;
  if (p.minRating > 0) items = items.filter((r) => (r.rating ?? 0) >= p.minRating);
  if (open) items = items.filter((r) => r.open === true);
  const key: Record<SortKey, (r: Restaurant) => number> = {
    distance: (r) => r.distM ?? 1e12, rating: (r) => -(r.rating ?? 0), reviews: (r) => -(r.reviews ?? 0),
    price_asc: (r) => priceYenOf(r, p.meal) ?? 1e12, price_desc: (r) => -(priceYenOf(r, p.meal) ?? -1), // unknown budgets sink to the bottom either way
  };
  items.sort((a, b) => key[p.sort](a) - key[p.sort](b));
  // Tabelog's keyword matching is loose, so places actually named that come first ("ichiran" brings up Ichikan too)
  if (parsed.keyword && !keywordDropped) {
    const named = items.filter((r) => nameMatches(r.name, parsed.keyword));
    if (named.length) items = [...named, ...items.filter((r) => !named.includes(r))];
  }
  // the box's half-width stands in for a radius: how far "moved away" is, and the "within …" text
  const radiusM = view ? Math.round(Math.min(haversine({ lat: view.s, lng: origin.lng }, { lat: view.n, lng: origin.lng }), haversine({ lat: origin.lat, lng: view.w }, { lat: origin.lat, lng: view.e })) / 2) : RANGES[p.range];
  const widened = !view && items.length > 0 && items.every((r) => r.distM != null && r.distM > RANGES[p.range]);
  return {
    fetchedAt: pages[0].fetchedAt, source: urls[0], page: p.page, hasMore: lastFull && !ratingCutoff,
    origin, radiusM, view, total, genre, features: features.map((f) => f.label), keyword: keywordDropped ? "" : parsed.keyword,
    keywordDropped: keywordDropped ? parsed.keyword : "", sort: p.sort, widened, items,
  };
}

// ---------- restaurants by name, for the search suggestions ----------
/** Restaurants whose names match what's being typed: ones near `origin` first, then the best known anywhere in Japan. */
export async function suggestPlaces(text: string, origin: { lat: number; lon: number } | null, max = 5): Promise<PlaceHit[]> {
  const { keyword, features } = parseQuery(text);
  const sw = (keyword || text).trim();
  if (sw.length < 2) return [];
  const list = (url: string) => cached<ListItem[]>(`names:${url}`, LIST_TTL, async () => parseList(await fetchHtml(url, MOBILE_UA))).catch(() => [] as ListItem[]);
  const [near, anywhere] = await Promise.all([
    origin ? list(`https://s.tabelog.com/en/rstLst/?${new URLSearchParams({ lat: origin.lat.toFixed(4), lon: origin.lon.toFixed(4), LstRange: "C", sw })}`) : [],
    list(`https://s.tabelog.com/en/rstLst/?${new URLSearchParams({ sw })}`),
  ]);
  // Tabelog's keyword search is fuzzy ("ichiran" brings up Ichirin), so keep only real name matches: on the whole text,
  // or failing that the keyword alone ("afuri ramen" still finds AFURI) unless the text is about features ("quiet sushi for a dat…"
  // is still being typed, not a name). Plenty nearby? Leave out the rest of Japan.
  const match = (words: string) => (it: ListItem) => nameMatches(it.name, words);
  const pickFrom = (words: string) => {
    const n = near.filter(match(words));
    return n.length >= 3 ? n : [...n, ...anywhere.filter(match(words))];
  };
  let found = pickFrom(text);
  if (!found.length && keyword && !features.length) found = pickFrom(keyword);
  const seen = new Set<string>();
  return found.filter((it) => !seen.has(it.id) && !!seen.add(it.id)).slice(0, max)
    .map(({ id, url, name, rating, reviews, station, tabelogDistanceM, genre, genreFull, dinner, lunch, closed, image }) =>
      ({ id, url, name, rating, reviews, station, tabelogDistanceM, genre, genreFull, dinner, lunch, closed, image }));
}

/** The detail-page half of a restaurant (coordinates, hours, payment, photos), for one picked from the suggestions. */
export async function placeInfo(url: string, closed = "") {
  if (!isRestaurantUrl(url)) throw new TabelogError("not a Tabelog restaurant URL", url);
  const info = await getInfo({ id: url.match(/(\d+)\/$/)![1], url } as ListItem);
  if (info.lat == null) throw new TabelogError("error" in info ? info.error : "no coordinates", url);
  return { ...info, open: openNow(info.hours, closed) };
}

// ---------- reviews (desktop review list + the first few full review pages) ----------
const REVIEWS_TTL = 24 * 60 * 60;   // seconds
const FULL_REVIEWS = 5;             // excerpts beyond this link to Tabelog for the rest
const RESTAURANT_URL = /^https:\/\/tabelog\.com\/en\/[a-z]+\/A\d{4}\/A\d{6}\/\d+\/$/;

export const isRestaurantUrl = (u: string) => RESTAURANT_URL.test(u);

function parseReviewItem($: cheerio.CheerioAPI, el: Parameters<cheerio.CheerioAPI>[0]): Review | null {
  const it = $(el);
  const clean = (s: string) => s.replace(/\s+/g, " ").trim();
  const href = it.find(".rvw-item__title-target").attr("href") || "";
  const id = (href.match(/\/dtlrvwlst\/(B\d+)\//) || [])[1] || it.attr("data-rvw-id") || "";
  if (!id) return null;
  const timeCls = it.find(".c-rating-v3__time").attr("class") || "";
  const avatar = it.find(".rvw-item__rvwr-img").attr("src") || it.find(".rvw-item__rvwr-img").attr("data-src") || null;
  const text = clean(it.find(".rvw-item__rvw-comment").text());
  return {
    id, url: href.split("?")[0],
    title: clean(it.find(".rvw-item__title").text()),
    text, full: !/\.{3}$|…$/.test(text),
    rating: parseFloat(clean(it.find(".c-rating-v3__val").first().text())) || null,
    meal: /--dinner/.test(timeCls) ? "dinner" : /--lunch/.test(timeCls) ? "lunch" : null,
    amount: clean(it.find(".rvw-item__payment-amount-delimiter").text()),
    visited: clean(it.find(".rvw-item__date-inner span").first().text()).replace(/^visited on\s*/i, ""),
    visits: clean(it.find(".rvw-item__count-num").text()),
    reviewer: clean(it.find(".rvw-item__rvwr-name").text()),
    reviewerUrl: it.find(".rvw-item__rvwr-name").attr("href") || "",
    avatar: avatar && /^https?:/.test(avatar) ? avatar : null,
    photos: [...new Set(it.find(".rvw-photo__list-item img").map((_, i) => bigPhoto($(i).attr("src") || $(i).attr("data-src"))).get().filter((p): p is string => !!p))].slice(0, 6),
  };
}

/** The newest reviews for a restaurant. The list page only carries excerpts, so the first few are completed from their own pages. */
export async function getReviews(url: string): Promise<ReviewsResponse> {
  if (!isRestaurantUrl(url)) throw new TabelogError("not a Tabelog restaurant URL", url);
  const id = url.match(/(\d+)\/$/)![1];
  // v3: review photo lists are deduped
  return cached<ReviewsResponse>(`reviews:v3:${id}`, REVIEWS_TTL, async () => {
    const $ = cheerio.load(await fetchHtml(url + "dtlrvwlst/", DESKTOP_UA));
    const seen = new Set<string>(); // a pinned review can appear twice on the page
    const items = $(".rvw-item").map((_, el) => parseReviewItem($, el)).get()
      .filter((r): r is Review => !!r && !seen.has(r.id) && !!seen.add(r.id));
    await mapLimit(items.slice(0, FULL_REVIEWS), 3, async (r) => {
      if (r.full || !r.url) return;
      try {
        const $$ = cheerio.load(await fetchHtml(r.url, DESKTOP_UA));
        const full = $$(".rvw-item__rvw-comment").first().text().replace(/\s+/g, " ").trim();
        if (full.length > r.text.length) { r.text = full; r.full = true; }
      } catch { /* keep the excerpt */ }
    });
    return { url: url + "dtlrvwlst/", items };
  });
}

// ---------- one restaurant in full, plus lookup by name (for the blog agent) ----------
const PROFILE_TTL = 3 * 24 * 60 * 60; // seconds

export type RestaurantProfile = {
  url: string; name: string; rating: number | null; reviews: number;
  closed: boolean;                       // permanently closed
  budget: { dinner: string; lunch: string };
  station: string; lat: number | null; lng: number | null; pay: Pay | null;
  facts: Record<string, string>;         // every row of the info table: hours, seats, reservations, smoking, awards…
  photos: string[];
};

/** Everything the detail page says about one restaurant. */
export async function getRestaurant(url: string): Promise<RestaurantProfile> {
  if (!isRestaurantUrl(url)) throw new TabelogError("not a Tabelog restaurant URL", url);
  return cached<RestaurantProfile>(`profile:v1:${url.match(/(\d+)\/$/)![1]}`, PROFILE_TTL, async () => {
    const html = await fetchHtml(url, DESKTOP_UA);
    const $ = cheerio.load(html);
    const clean = (s: string) => s.replace(/\s+/g, " ").trim();
    const facts: Record<string, string> = {};
    $("th").each((_, th) => {
      const k = clean($(th).text()), v = clean($(th).next("td").text()).replace(/Show larger map.*$|Hours and closed days may change.*$/i, "").trim();
      if (k && v && v !== "-" && v !== "−" && !(k in facts)) facts[k] = v.slice(0, 600);
    });
    const payText = facts["Payment methods"] || "";
    const [dinner = "", lunch = ""] = $(".rdheader-budget__price-target").map((_, e) => clean($(e).text())).get().map((v) => (v === "-" ? "" : v));
    const m = html.match(/center=(-?\d+\.\d+),(-?\d+\.\d+)/);
    return {
      url,
      name: clean($(".rdheader-rstname h2, .rdheader-rstname").first().text()).replace(/^閉店\s*/, ""),
      rating: parseFloat(clean($(".rdheader-rating__score-val").first().text())) || null,
      reviews: Number(clean($(".rdheader-rating__review").first().text()).replace(/[^\d]/g, "")) || 0,
      closed: /permanently closed/i.test(facts["Restaurant name"] || "") || $(".rdheader-rstname").text().includes("閉店"),
      budget: { dinner, lunch },
      station: (clean($(".rdheader-subinfo__item--station .rdheader-subinfo__item-text").first().text()).match(/^.*?Sta\./) || [""])[0],
      lat: m ? Number(m[1]) : null, lng: m ? Number(m[2]) : null,
      pay: payText ? {
        card: /credit cards? accepted/i.test(payText), emoney: /electronic money accepted/i.test(payText),
        qr: /qr code payments? accepted/i.test(payText), cash: !/cash(?:less| not accepted)/i.test(payText),
      } : null,
      facts,
      photos: $(".rstdtl-top-postphoto__item img").map((_, i) => bigPhoto($(i).attr("src"))).get().filter((p): p is string => !!p).slice(0, 10),
    };
  });
}

/** Restaurants whose name matches, best match first (Tabelog's own keyword search). */
export async function findByName(name: string): Promise<ListItem[]> {
  const url = `https://s.tabelog.com/en/rstLst/?sw=${encodeURIComponent(name)}`;
  return cached<ListItem[]>(`byname:${name.toLowerCase()}`, LIST_TTL, async () => parseList(await fetchHtml(url, MOBILE_UA)));
}
