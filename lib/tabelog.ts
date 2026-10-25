// Tabelog has no public API, so this scrapes it. The mobile site is the only one that honours
// lat/lon ("near me") search, so every listing goes through it; detail pages come from the desktop
// site, which embeds coordinates in a static-map URL and lists business hours. Server only.
import * as cheerio from "cheerio";
import { cached } from "./cache";
import { haversine } from "./geo";
import { bigPhoto, priceYenOf } from "./format";
import { RANGES, resolveGenre } from "./genres";
import { parseSchedule } from "./hours";
import type { Pay, Restaurant, Review, ReviewsResponse, SearchResponse, SortKey } from "./types";

const MOBILE_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
const DESKTOP_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

const LIST_TTL = 15 * 60;              // seconds: a scraped listing page
const INFO_TTL = 90 * 24 * 60 * 60;    // seconds: a restaurant's coordinates, address, hours
const DETAIL_CONCURRENCY = 6;
const TABELOG_PAGES_PER_CALL = 2;      // 2 x 20 results per search call
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
type ListItem = Omit<Restaurant, "lat" | "lng" | "address" | "hours" | "pay" | "photos" | "access" | "distM" | "open">;

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

type Info = { v: 2; lat: number; lng: number; address: string; hours: string; pay: Pay; photos: string[]; access: string };
type InfoResult = Omit<Info, "v"> | { lat: null; lng: null; address: ""; hours: ""; pay: null; photos: never[]; access: ""; error: string };

async function getInfo(item: ListItem): Promise<InfoResult> {
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
    const photos = $(".rstdtl-top-postphoto__item img").map((_, i) => bigPhoto($(i).attr("src"))).get().filter((p): p is string => !!p).slice(0, 10);
    const access = row("transportation").split(/\s*(?:・|^-\s|\s-\s)\s*/).map((t) => t.trim()).filter((t) => /walk|station|min/i.test(t))[0] || "";
    const hours = row("business hours").replace(/Hours and closed days may change.*$/i, "").trim();
    return { v: 2, lat: Number(m[1]), lng: Number(m[2]), address, hours, pay, photos, access };
  }, (v) => v?.v === 2) // bump v when the scraped shape changes; older entries get refreshed
    .then(({ v: _v, ...info }) => info)
    .catch((e: Error) => ({ lat: null, lng: null, address: "", hours: "", pay: null, photos: [], access: "", error: e.message }));
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
  q: string;                // free text, resolved to a Tabelog genre
  sort: SortKey;
  pay: Set<string>;         // card, qr, emoney
  pmin: number; pmax: number; meal: "dinner" | "lunch";
  minRating: number;
  open: boolean;            // only places open right now (JST)
  page: number;             // 1-based, each page = TABELOG_PAGES_PER_CALL Tabelog pages
};

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
  };
}

/** The one search. Every filter and sort is applied here so the client only renders. */
export async function search(p: SearchParams): Promise<SearchResponse> {
  const genre = resolveGenre(p.q);
  const q = new URLSearchParams({ lat: p.lat.toString(), lon: p.lon.toString(), LstRange: p.range });
  if (p.sort === "rating" || p.minRating > 0) q.set("SrtT", "rt"); // Tabelog sorts by rating natively
  if (p.pay.has("card")) q.set("ChkCard", "1");
  if (p.pay.has("qr")) q.set("ChkQrcodePayment", "1");
  if (p.pay.has("emoney")) q.set("ChkEMoneyPayment", "1");
  if (p.pmin || p.pmax) { q.set("LstCos", String(p.pmin)); q.set("LstCosT", String(p.pmax)); q.set("RdoCosTp", p.meal === "lunch" ? "1" : "2"); }
  const pageUrl = (n: number) => `https://s.tabelog.com/en/rstLst/${genre.code}/${n > 1 ? n + "/" : ""}?${q}`;
  const first = (p.page - 1) * TABELOG_PAGES_PER_CALL + 1;
  const urls = Array.from({ length: TABELOG_PAGES_PER_CALL }, (_, i) => pageUrl(first + i));

  let pages: Page[];
  try { pages = await Promise.all(urls.map(loadPage)); }
  catch (e) { throw new TabelogError((e as Error).message, urls[0]); }

  const origin = { lat: p.lat, lng: p.lon };
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
  const lastFull = pages[pages.length - 1].items.length >= 20;
  const last = items[items.length - 1];
  const ratingCutoff = p.minRating > 0 && !!last && last.rating != null && last.rating < p.minRating;
  if (p.minRating > 0) items = items.filter((r) => (r.rating ?? 0) >= p.minRating);
  if (p.open) items = items.filter((r) => r.open === true);
  const key: Record<SortKey, (r: Restaurant) => number> = {
    distance: (r) => r.distM ?? 1e12, rating: (r) => -(r.rating ?? 0), reviews: (r) => -(r.reviews ?? 0),
    price_asc: (r) => priceYenOf(r, p.meal) ?? 1e12, price_desc: (r) => -(priceYenOf(r, p.meal) ?? -1), // unknown budgets sink to the bottom either way
  };
  items.sort((a, b) => key[p.sort](a) - key[p.sort](b));
  const widened = items.length > 0 && items.every((r) => r.distM != null && r.distM > RANGES[p.range]);
  return {
    fetchedAt: pages[0].fetchedAt, source: urls[0], page: p.page, hasMore: lastFull && !ratingCutoff,
    origin, radiusM: RANGES[p.range], genre, sort: p.sort, widened, items,
  };
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
    photos: it.find(".rvw-photo__list-item img").map((_, i) => bigPhoto($(i).attr("src") || $(i).attr("data-src"))).get().filter((p): p is string => !!p).slice(0, 6),
  };
}

/** The newest reviews for a restaurant. The list page only carries excerpts, so the first few are completed from their own pages. */
export async function getReviews(url: string): Promise<ReviewsResponse> {
  if (!isRestaurantUrl(url)) throw new TabelogError("not a Tabelog restaurant URL", url);
  const id = url.match(/(\d+)\/$/)![1];
  return cached<ReviewsResponse>(`reviews:v2:${id}`, REVIEWS_TTL, async () => {
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
