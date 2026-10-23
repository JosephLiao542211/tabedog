// Tabelog's own "best of" ranking for a city (optionally one genre), for the public city and city × cuisine pages.
// Uses Next's fetch cache instead of lib/cache so the pages stay statically rendered and refresh once a day. Server only.
import { parseList } from "./tabelog";

export const RANKING_REVALIDATE = 24 * 60 * 60;

export type Ranked = {
  id: string; url: string; name: string; rating: number | null; reviews: number;
  station: string; genre: string; lunch: string; dinner: string;
};

export type Ranking = { source: string; fetchedAt: string; items: Ranked[] };

const MOBILE_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";

/** Top-rated restaurants in a Tabelog area ("tokyo", "kyoto/A2601"), best first. Empty on any failure: the page renders without it. */
export async function topRated(area: string, genreCode = "", limit = 15): Promise<Ranking> {
  const source = `https://s.tabelog.com/en/${area}/rstLst/${genreCode ? genreCode + "/" : ""}?SrtT=rt`;
  try {
    const res = await fetch(source, {
      headers: { "user-agent": MOBILE_UA, "accept-language": "en-US,en;q=0.9" },
      next: { revalidate: RANKING_REVALIDATE },
    });
    if (!res.ok) throw new Error(`Tabelog returned ${res.status}`);
    const items = parseList(await res.text())
      .filter((r) => r.rating != null && r.name)
      .slice(0, limit)
      .map(({ id, url, name, rating, reviews, station, genre, lunch, dinner }) => ({ id, url, name, rating, reviews, station, genre, lunch, dinner }));
    return { source: source.replace("https://s.tabelog.com/", "https://tabelog.com/"), fetchedAt: new Date().toISOString(), items };
  } catch (e) {
    console.error("[rankings]", source, (e as Error).message);
    return { source, fetchedAt: new Date().toISOString(), items: [] };
  }
}
