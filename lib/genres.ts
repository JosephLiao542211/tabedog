// Client-safe constants shared by the API and the UI (no scraping code here).
import type { Genre } from "./types";

// Tabelog's LstRange codes for near-me radius, in metres
export const RANGES: Record<string, number> = { F: 300, G: 500, A: 800, B: 1000, C: 3000, D: 5000, E: 10000 };

// Genre slugs understood by s.tabelog.com/en/rstLst/{slug}/ with the words people type for them
export const GENRES: ReadonlyArray<readonly [code: string, label: string, keywords: string]> = [
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
const GENRE_LABEL: Record<string, string> = Object.fromEntries(GENRES.map(([c, l]) => [c, l]));

// free text -> genre slug. Exact slug, then label/word match, then keyword match, else all restaurants.
export function resolveGenre(q: unknown): Genre {
  const s = String(q || "").toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
  if (!s) return { code: "RC", label: GENRE_LABEL.RC, matched: true };
  const words = s.split(" ");
  let best: string | null = null, bestScore = 0;
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
