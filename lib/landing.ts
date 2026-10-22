// Real, top-rated restaurants around Shibuya for the public landing page's map. One Tabelog search a day, cached.
import { cached } from "./cache";
import { openNow, search } from "./tabelog";
import type { Pay } from "./types";

export type Spot = {
  id: string; url: string; name: string; rating: number | null; reviews: number; genre: string; station: string;
  lat: number; lng: number; photo: string | null; lunch: string; dinner: string; pay: Pay | null;
  hours: string; closed: string;
  open?: boolean | null; // filled in per request, not cached
};

export const LANDING_CENTER = { lat: 35.6595, lng: 139.7005 }; // Shibuya station

const TTL = 24 * 60 * 60;

export async function landingSpots(): Promise<Spot[]> {
  const spots = await cached<Spot[]>("landing:spots:v1", TTL, async () => {
    const res = await search({
      lat: LANDING_CENTER.lat, lon: LANDING_CENTER.lng, range: "C", q: "", sort: "rating",
      pay: new Set(), pmin: 0, pmax: 0, meal: "dinner", minRating: 0, open: false, page: 1,
    });
    return res.items
      .filter((r): r is typeof r & { lat: number; lng: number } => r.lat != null && r.lng != null)
      .map((r) => ({
        id: r.id, url: r.url, name: r.name, rating: r.rating, reviews: r.reviews, genre: r.genre, station: r.station,
        lat: r.lat, lng: r.lng, photo: r.photos?.[0] || r.image || null, lunch: r.lunch, dinner: r.dinner, pay: r.pay,
        hours: r.hours, closed: r.closed,
      }));
  }, (v) => Array.isArray(v) && v.length >= 10);
  return spots.map((s) => ({ ...s, open: openNow(s.hours, s.closed) }));
}
