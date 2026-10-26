// The blog agent's tools. Every Tabelog fact the agent writes comes through here, from the same
// scrapers the map uses (lib/tabelog, lib/rankings), so drafts quote real ratings, prices, hours,
// payment methods and reviews. Results are trimmed to what a writer needs to keep the context small.
import "server-only";
import { anthropic } from "@ai-sdk/anthropic";
import { tool } from "ai";
import { z } from "zod";
import { cached } from "../cache";
import { fmtDist, fmtPrice } from "../format";
import { RANGES } from "../genres";
import { topRated } from "../rankings";
import { CITIES, CUISINES, cityBySlug, cuisineBySlug } from "../seo";
import { findByName, getRestaurant, getReviews, isRestaurantUrl, search } from "../tabelog";
import { searchPhotos, tabelogPhotos } from "../photos";
import { TOPICS, slugify } from "../blog";
import { seoChecks } from "../blog-seo";
import type { Pay } from "../types";

const RADIUS = { "300m": "F", "500m": "G", "800m": "A", "1km": "B", "3km": "C", "5km": "D", "10km": "E" } as const;
const citySlugs = CITIES.map((c) => c.slug) as [string, ...string[]];

const payList = (p: Pay | null) => (p ? [p.cash && "cash", p.card && "credit card", p.emoney && "IC card / e-money", p.qr && "QR (PayPay etc.)"].filter(Boolean).join(", ") : "unknown");
const restaurantUrl = z.string().refine(isRestaurantUrl, "Must be a tabelog.com/en restaurant URL from a previous tool result, e.g. https://tabelog.com/en/tokyo/A1304/A130401/13001234/");

/** Place name -> coordinates, via OpenStreetMap's Nominatim (limited to Japan). Cached for a month. */
async function geocode(place: string): Promise<{ lat: number; lng: number; label: string } | null> {
  return cached(`geocode:${place.toLowerCase()}`, 30 * 24 * 3600, async () => {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?${new URLSearchParams({ q: place, format: "json", limit: "1", countrycodes: "jp", "accept-language": "en" })}`, {
      headers: { "user-agent": "TabeDogBlogAgent/1.0 (https://tabedog.com)" },
    });
    const hit = ((await res.json()) as { lat: string; lon: string; display_name: string }[])[0];
    return hit ? { lat: Number(hit.lat), lng: Number(hit.lon), label: hit.display_name } : null;
  }).catch(() => null);
}

/** What presentDraft takes: the whole post, with photos as slots the dashboard can swap. */
export const draftSchema = z.object({
  title: z.string().describe("Headline, ideally 30-60 characters, focus keyword near the start"),
  excerpt: z.string().describe("Dek: one or two sentences, 120-160 characters, shown under the title and in search results"),
  slug: z.string().describe("Short URL slug with the focus keyword"),
  topic: z.enum(TOPICS.map((t) => t.slug) as [string, ...string[]]),
  tags: z.array(z.string()).max(8),
  focusKeyword: z.string(),
  seoTitle: z.string().describe("Only if the headline is over 60 characters, else empty"),
  coverSlot: z.string().describe("The photo slot used as the cover image"),
  content: z.string().describe("The post body in markdown. Start at ## headings (no H1). Images as ![alt text](photo:slot-id) on their own line."),
  photos: z.array(z.object({
    slot: z.string().describe("Short id, e.g. cover, fuunji, omoide-yokocho"),
    url: z.string().regex(/^https:\/\/\S+$/, "Must be an https image URL from a findPhotos result"),
    alt: z.string().describe("What's in the photo, specific and descriptive"),
    caption: z.string().describe("Short caption shown under the photo; may be empty"),
    credit: z.string(), license: z.string(), page: z.string(),
    source: z.enum(["openverse", "wikimedia", "brave", "tabelog"]),
    query: z.string().describe("The search query that would find alternatives for this slot"),
    restaurantUrl: z.string().optional().describe("Tabelog URL if the photo is of a restaurant in the post"),
  })),
  restaurants: z.array(z.object({ name: z.string(), url: z.string(), rating: z.number().nullable() })).describe("Every restaurant mentioned, with the Tabelog URL you got it from"),
  sources: z.array(z.object({ title: z.string(), url: z.string() })).describe("Non-Tabelog sources used"),
  verify: z.array(z.string()).describe("Things the author should double check or add from their own experience before publishing"),
});
export type Draft = z.infer<typeof draftSchema>;

export const blogTools = {
  searchTabelog: tool({
    description: "Search Tabelog for restaurants around a place (a station, neighborhood or landmark) or a TabeDog city. Returns live ratings, review counts, budgets, hours, closed days, payment methods, nearest station and coordinates. Use this to build shortlists; then call restaurantProfile and restaurantReviews on the ones you'll write about.",
    inputSchema: z.object({
      near: z.string().optional().describe('A place in Japan to search around, e.g. "Ebisu Station, Tokyo" or "Nishiki Market, Kyoto". Omit to use the city center.'),
      city: z.enum(citySlugs).optional().describe("TabeDog city, used for the center when `near` is omitted"),
      cuisine: z.string().default("").describe('What to eat, in plain English: "ramen", "tsukemen", "yakitori", "kissaten". Empty for all restaurants.'),
      radius: z.enum(Object.keys(RADIUS) as [keyof typeof RADIUS, ...(keyof typeof RADIUS)[]]).default("1km"),
      sort: z.enum(["rating", "reviews", "distance", "price_asc", "price_desc"]).default("rating"),
      minRating: z.number().min(0).max(5).default(0),
      payment: z.array(z.enum(["card", "qr", "emoney"])).default([]).describe("Only places accepting all of these"),
      openNow: z.boolean().default(false),
      limit: z.number().int().min(1).max(40).default(15),
    }),
    execute: async ({ near, city, cuisine, radius, sort, minRating, payment, openNow, limit }) => {
      const c = city ? cityBySlug(city) : undefined;
      const place = near ? await geocode(near) : null;
      const center = place ?? (c ? { ...c.center, label: c.name } : null);
      if (!center) return { error: `Couldn't locate "${near ?? ""}". Try a station name plus the city, or pass a city.` };
      const res = await search({
        lat: center.lat, lon: center.lng, range: RADIUS[radius], q: cuisine, sort, pay: new Set(payment),
        pmin: 0, pmax: 0, meal: "dinner", minRating, open: openNow, page: 1,
      });
      return {
        searchedAround: center.label, genre: res.genre.label, radiusM: RANGES[RADIUS[radius]], source: res.source,
        results: res.items.slice(0, limit).map((r) => ({
          name: r.name, url: r.url, rating: r.rating, reviews: r.reviews, genre: r.genreFull,
          station: r.station || r.access, distance: fmtDist(r.distM),
          dinner: fmtPrice(r.dinner) || "n/a", lunch: fmtPrice(r.lunch) || "n/a",
          closedDays: r.closed, hours: r.hours.slice(0, 300), payment: payList(r.pay), address: r.address,
          lat: r.lat, lng: r.lng, photoCount: r.photos.length,
        })),
      };
    },
  }),

  tabelogRanking: tool({
    description: "Tabelog's own best-rated list for a whole TabeDog city, optionally one cuisine. The canonical 'top restaurants in X' ranking.",
    inputSchema: z.object({
      city: z.enum(citySlugs),
      cuisine: z.enum(CUISINES.map((c) => c.slug) as [string, ...string[]]).optional(),
      limit: z.number().int().min(1).max(20).default(15),
    }),
    execute: async ({ city, cuisine, limit }) => {
      const r = await topRated(cityBySlug(city)!.tabelogArea, cuisine ? cuisineBySlug(cuisine)!.code : "", limit);
      if (!r.items.length) return { error: "Tabelog ranking unavailable right now; fall back to searchTabelog with sort=rating." };
      return { source: r.source, results: r.items.map((i) => ({ ...i, dinner: fmtPrice(i.dinner) || "n/a", lunch: fmtPrice(i.lunch) || "n/a" })) };
    },
  }),

  findRestaurant: tool({
    description: "Find a specific restaurant on Tabelog by name (English or Japanese). Use when the user names a place. Check the station/genre to be sure you have the right branch.",
    inputSchema: z.object({ name: z.string().describe('e.g. "Fuunji Shinjuku" or "風雲児"') }),
    execute: async ({ name }) => {
      const hits = (await findByName(name)).slice(0, 6);
      return hits.length
        ? { results: hits.map((h) => ({ name: h.name, url: h.url, rating: h.rating, reviews: h.reviews, station: h.station, genre: h.genreFull, dinner: fmtPrice(h.dinner) || "n/a", lunch: fmtPrice(h.lunch) || "n/a" })) }
        : { error: `No Tabelog match for "${name}". Try the Japanese name, a shorter name, or searchTabelog near its neighborhood.` };
    },
  }),

  restaurantProfile: tool({
    description: "The full Tabelog page for one restaurant: rating, budgets, every info-table row (hours, closed days, payment methods in detail, seats, reservations, private rooms, smoking, opening date, awards like Hyakumeiten, the restaurant's own highlights), and whether it has permanently closed. Call before writing about any restaurant.",
    inputSchema: z.object({ url: restaurantUrl }),
    execute: async ({ url }) => {
      const p = await getRestaurant(url);
      const { photos, budget, ...rest } = p;
      return { ...rest, dinner: fmtPrice(budget.dinner) || "n/a", lunch: fmtPrice(budget.lunch) || "n/a", payment: payList(p.pay), photoCount: photos.length };
    },
  }),

  restaurantReviews: tool({
    description: "The newest Tabelog reviews for a restaurant (translated to English by Tabelog): what people ordered, what they paid per person, when they went, what they loved or didn't. Use for specific dishes, prices, queue times and atmosphere; quote sparingly and attribute to 'a Tabelog reviewer'.",
    inputSchema: z.object({ url: restaurantUrl, limit: z.number().int().min(1).max(10).default(6) }),
    execute: async ({ url, limit }) => {
      const r = await getReviews(url);
      return {
        source: r.url,
        reviews: r.items.slice(0, limit).map((v) => ({
          title: v.title, rating: v.rating, meal: v.meal, paidPerPerson: v.amount, visited: v.visited, visits: v.visits,
          text: v.text.slice(0, 1400), complete: v.full, url: v.url,
        })),
      };
    },
  }),

  findPhotos: tool({
    description: "Search for photos to illustrate the post. Searches CC-licensed libraries (Openverse/Flickr, Wikimedia Commons) and the web, and, when you pass a restaurant URL, that restaurant's own Tabelog photos. Returns candidates with credit and license; pick the best per slot. Use specific queries (\"tsukemen dipping noodles close up\", \"Omoide Yokocho at night\").",
    inputSchema: z.object({
      query: z.string().describe("What the photo should show, in English"),
      restaurantUrl: restaurantUrl.optional().describe("Also include this restaurant's Tabelog photos"),
      limit: z.number().int().min(1).max(12).default(6),
    }),
    execute: async ({ query, restaurantUrl, limit }) => {
      const [web, own] = await Promise.all([
        searchPhotos(query, Math.ceil(limit / 2) + 1),
        restaurantUrl ? getRestaurant(restaurantUrl).then((p) => tabelogPhotos(p.photos.slice(0, 4), p.name, p.url)).catch(() => []) : Promise.resolve([]),
      ]);
      const photos = [...own, ...web].slice(0, limit + own.length);
      return photos.length
        ? { photos: photos.map(({ thumb: _t, ...p }) => p) }
        : { error: "No photos found; try a broader query (the dish or neighborhood rather than the restaurant name)." };
    },
  }),

  // Anthropic runs this search server-side; it must be enabled in the Console (Settings → Privacy)
  web_search: anthropic.tools.webSearch_20260318({ maxUses: 6 }),

  presentDraft: tool({
    description: "Hand the finished draft to the editor. Call exactly once per draft or revision, after research is done. The result reports SEO checks and problems; if it lists problems, fix them and call presentDraft again.",
    inputSchema: draftSchema,
    execute: async (d) => {
      const problems: string[] = [];
      const slots = new Set(d.photos.map((p) => p.slot));
      const used = [...d.content.matchAll(/!\[[^\]]*\]\(photo:([\w-]+)/g)].map((m) => m[1]);
      for (const s of used) if (!slots.has(s)) problems.push(`Body uses photo:${s} but no photo has that slot.`);
      if (!slots.has(d.coverSlot)) problems.push(`coverSlot "${d.coverSlot}" isn't one of the photos.`);
      if (/^#\s/m.test(d.content)) problems.push("Remove the H1 from the body; the title is the H1.");
      for (const r of d.restaurants) if (!isRestaurantUrl(r.url)) problems.push(`${r.name}: "${r.url}" isn't a Tabelog restaurant URL from your research.`);
      const cover = d.photos.find((p) => p.slot === d.coverSlot);
      const checks = seoChecks({
        title: d.title, seo_title: d.seoTitle, excerpt: d.excerpt, seo_description: "", content: d.content.replace(/\(photo:[\w-]+/g, "(https://x"),
        focus_keyword: d.focusKeyword, slug: slugify(d.slug), cover_url: cover?.url ?? null, cover_alt: cover?.alt ?? "",
      });
      const failing = checks.filter((c) => !c.ok).map((c) => `${c.label}: ${c.hint}`);
      return { ok: problems.length === 0, problems, seoNotPassing: failing };
    },
  }),
};
