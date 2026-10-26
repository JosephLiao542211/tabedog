// Photo search for blog drafts. Openverse (CC-licensed photos indexed from Flickr and others) and
// Wikimedia Commons need no key; Brave image search joins in when BRAVE_SEARCH_API_KEY is set, for
// general web results whose rights you have to clear yourself. Tabelog photos come from the
// restaurant's own page (lib/tabelog). Server only.
import "server-only";
import { cached } from "./cache";

export type Photo = {
  url: string;                // full-size image to embed
  thumb: string;              // small preview for the picker
  width: number | null; height: number | null;
  title: string;
  credit: string;             // photographer / uploader, "" when unknown
  license: string;            // "CC BY 2.0", "Tabelog user photo", "unknown — check rights"
  page: string;               // where the photo lives, for attribution and checking
  source: "openverse" | "wikimedia" | "brave" | "tabelog";
};

const TTL = 7 * 24 * 60 * 60;
const UA = "TabeDogBlogAgent/1.0 (https://tabedog.com)";
const stripHtml = (s = "") => s.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();

async function openverse(q: string, n: number): Promise<Photo[]> {
  const u = `https://api.openverse.org/v1/images/?${new URLSearchParams({ q, page_size: String(n), license_type: "commercial", mature: "false" })}`;
  const res = await fetch(u, { headers: { "user-agent": UA } });
  if (!res.ok) throw new Error(`Openverse ${res.status}`);
  const data = (await res.json()) as { results: { url: string; thumbnail: string; width: number | null; height: number | null; title: string; creator: string | null; license: string; license_version: string | null; foreign_landing_url: string }[] };
  return data.results.map((r) => ({
    url: r.url, thumb: r.thumbnail || r.url, width: r.width, height: r.height, title: r.title || "",
    credit: r.creator || "", license: `CC ${r.license.toUpperCase()}${r.license_version ? " " + r.license_version : ""}`.replace("CC CC0", "CC0").replace("CC PDM", "Public domain"),
    page: r.foreign_landing_url, source: "openverse" as const,
  }));
}

async function wikimedia(q: string, n: number): Promise<Photo[]> {
  const u = `https://commons.wikimedia.org/w/api.php?${new URLSearchParams({
    action: "query", format: "json", generator: "search", gsrsearch: `filetype:bitmap ${q}`, gsrnamespace: "6", gsrlimit: String(n),
    prop: "imageinfo", iiprop: "url|size|extmetadata", iiurlwidth: "1600",
  })}`;
  const res = await fetch(u, { headers: { "user-agent": UA } });
  if (!res.ok) throw new Error(`Wikimedia ${res.status}`);
  const data = (await res.json()) as { query?: { pages: Record<string, { title: string; index: number; imageinfo?: { url: string; thumburl?: string; width: number; height: number; descriptionurl: string; extmetadata?: Record<string, { value: string }> }[] }> } };
  return Object.values(data.query?.pages ?? {}).sort((a, b) => a.index - b.index).flatMap((p) => {
    const ii = p.imageinfo?.[0];
    if (!ii) return [];
    const meta = ii.extmetadata ?? {};
    return [{
      url: ii.thumburl || ii.url, thumb: (ii.thumburl || ii.url).replace(/\/\d+px-/, "/400px-"), width: ii.width, height: ii.height,
      title: stripHtml(meta.ObjectName?.value) || p.title.replace(/^File:|\.\w+$/g, ""),
      credit: stripHtml(meta.Artist?.value), license: stripHtml(meta.LicenseShortName?.value) || "see page",
      page: ii.descriptionurl, source: "wikimedia" as const,
    }];
  });
}

async function brave(q: string, n: number): Promise<Photo[]> {
  const key = process.env.BRAVE_SEARCH_API_KEY;
  if (!key) return [];
  const res = await fetch(`https://api.search.brave.com/res/v1/images/search?${new URLSearchParams({ q, count: String(n), safesearch: "strict" })}`, {
    headers: { accept: "application/json", "x-subscription-token": key },
  });
  if (!res.ok) throw new Error(`Brave ${res.status}`);
  const data = (await res.json()) as { results: { title: string; url: string; source: string; thumbnail: { src: string }; properties: { url: string; width?: number; height?: number } }[] };
  return data.results.map((r) => ({
    url: r.properties.url, thumb: r.thumbnail.src, width: r.properties.width ?? null, height: r.properties.height ?? null,
    title: r.title, credit: r.source, license: "unknown — check rights", page: r.url, source: "brave" as const,
  }));
}

/** Photos for `q` from every configured source, interleaved so no one source crowds out the rest. Sources that fail are skipped. */
export async function searchPhotos(q: string, perSource = 8): Promise<Photo[]> {
  const query = q.trim().slice(0, 120);
  if (!query) return [];
  return cached<Photo[]>(`photos:v1:${query.toLowerCase()}:${perSource}`, TTL, async () => {
    const lists = await Promise.all([openverse, wikimedia, brave].map((f) => f(query, perSource).catch((e: Error) => { console.error("[photos]", f.name, e.message); return [] as Photo[]; })));
    const out: Photo[] = [];
    const seen = new Set<string>();
    for (let i = 0; i < perSource; i++) for (const l of lists) if (l[i] && !seen.has(l[i].url)) { seen.add(l[i].url); out.push(l[i]); }
    return out;
  }, (v) => v.length > 0);
}

export const tabelogPhotos = (urls: string[], restaurant: string, page: string): Photo[] =>
  urls.filter((u) => !/\/150x150_/.test(u)).map((u) => ({ url: u, thumb: u, width: 640, height: 640, title: restaurant, credit: "Tabelog reviewer", license: "Tabelog user photo", page, source: "tabelog" as const }));
