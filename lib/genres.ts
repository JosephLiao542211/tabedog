// Client-safe constants shared by the API and the UI (no scraping code here).
import type { Genre } from "./types";

// Tabelog's LstRange codes for near-me radius, in metres
export const RANGES: Record<string, number> = { F: 300, G: 500, A: 800, B: 1000, C: 3000, D: 5000, E: 10000 };

// Genre slugs understood by s.tabelog.com/en/rstLst/{slug}/ with the phrases people type for them (comma separated)
export const GENRES: ReadonlyArray<readonly [code: string, label: string, keywords: string]> = [
  ["RC", "All restaurants", "anything, everything"],
  ["ramen", "Ramen", "tsukemen, noodle, tonkotsu, iekei"],
  ["sushi", "Sushi", "sashimi, nigiri, omakase, kaitenzushi, conveyor belt sushi, conveyor sushi"],
  ["washoku", "Washoku", "traditional japanese, japanese cuisine, kaiseki, kappo"],
  ["japanese", "Japanese", "japanese food"],
  ["yakiniku", "Yakiniku", "japanese bbq, bbq, barbecue, grilled meat, wagyu, beef"],
  ["yakitori", "Yakitori", "grilled chicken, chicken skewers, skewers, kushiyaki"],
  ["izakaya", "Izakaya", "tavern, pub, beer, drinks, drinking"],
  ["tempura", "Tempura", ""],
  ["tonkatsu", "Tonkatsu", "pork cutlet, katsu"],
  ["soba", "Soba", "buckwheat, soba noodles"],
  ["udon", "Udon", "udon noodles"],
  ["unagi", "Unagi", "eel"],
  ["gyouza", "Gyoza", "dumpling, gyouza"],
  ["seafood", "Seafood", "fish, crab, oyster, shellfish, kaisendon"],
  ["curry", "Curry", "japanese curry, curry rice, indian, naan"],
  ["chinese", "Chinese", "dim sum, chinese food, mapo tofu"],
  ["korea", "Korean", "korean bbq, kbbq, bibimbap, samgyeopsal"],
  ["thai", "Thai", "pad thai, tom yum"],
  ["steak", "Steak", "steakhouse"],
  ["hamburger", "Hamburger", "burger"],
  ["hamburgersteak", "Hamburger steak", "hambagu, hamburg steak, hamburg"],
  ["pizza", "Pizza", "pizzeria"],
  ["pasta", "Pasta", "spaghetti"],
  ["italian", "Italian", "trattoria"],
  ["french", "French", "brasserie"],
  ["spain", "Spanish", "tapas, paella"],
  ["bistro", "Bistro", ""],
  ["yoshoku", "Yoshoku", "western, omurice"],
  ["okonomiyaki", "Okonomiyaki", "savory pancake"],
  ["monjya", "Monjayaki", "monja"],
  ["nabe", "Nabe", "hot pot, hotpot"],
  ["syabusyabu", "Shabu shabu", "shabu, shabushabu"],
  ["motsu", "Motsunabe", "offal hot pot"],
  ["horumon", "Horumon", "tripe, offal"],
  ["kushiage", "Kushiage", "kushikatsu, fried skewers, deep fried skewers"],
  ["teishoku", "Teishoku", "set meal, cafeteria, shokudo"],
  ["okinawafood", "Okinawan", "okinawa"],
  ["cafe", "Cafe", "coffee, espresso, latte, coffee shop"],
  ["kissaten", "Kissaten", "retro cafe"],
  ["sweets", "Sweets", "dessert, parfait, ice cream, gelato, crepe"],
  ["cake", "Cake", "patisserie, pastry, pastries"],
  ["pan", "Bakery", "bread, sandwich, croissant"],
  ["tapioca", "Bubble tea", "boba, tapioca"],
  ["bar", "Bar", "cocktail, whisky, whiskey, speakeasy"],
  ["viking", "Buffet", ""],
  ["lunch", "Lunch", ""],
  ["ryokan", "Ryokan", "inn"],
];
const GENRE_LABEL: Record<string, string> = Object.fromEntries(GENRES.map(([c, l]) => [c, l]));

// Tabelog's own search conditions (the list page's filter form), with the phrases people type for them.
// pmin / pmax / open aren't Tabelog parameters: they fill in the app's price and open-now filters when those are unset.
export const FEATURES: ReadonlyArray<readonly [label: string, param: string, phrases: string]> = [
  ["Date night", "LstSitu=2", "date, date night, date spot, romantic, anniversary, couple"],
  ["Family friendly", "LstSitu=5", "family, family friendly"],
  ["Kids welcome", "ChkKids=1", "kid, children, child, kid friendly, kids welcome, with kids"],
  ["Solo dining", "LstSitu=6", "solo, alone, by myself, solo dining, eating alone, one person"],
  ["Groups", "LstSitu=4", "group, large group, big group, party, parties"],
  ["Business", "LstSitu=3", "business, client, business dinner, work dinner"],
  ["With friends", "LstSitu=1", "friend, with friends"],
  ["Private room", "ChkRoom=1", "private room, private, room, koshitsu"],
  ["Counter seats", "ChkCounter=1", "counter, counter seat, counter seating"],
  ["Tatami", "ChkZashiki=1", "tatami, zashiki"],
  ["Terrace", "ChkTerrace=1", "terrace, outdoor, outside, patio, open air"],
  ["Night view", "ChkNightView=1", "night view, view, skyline, city view, rooftop"],
  ["Ocean view", "ChkOceanView=1", "ocean view, sea view, ocean, waterfront, beach"],
  ["Hidden gem", "ChkKakurega=1", "hidden, hidden gem, hideaway, secret, hole in the wall"],
  ["Relaxed", "ChkRelax=1", "quiet, relaxed, relaxing, calm, cozy, cosy, chill"],
  ["Stylish", "ChkStylish=1", "stylish, trendy, hip, instagrammable, aesthetic"],
  ["Vegetarian", "ChkVegetarianMenu=1", "vegetarian, vegan, veggie, plant based, meatless"],
  ["Healthy", "ChkHealthy=1", "healthy"],
  ["English menu", "ChkEnglishMenu=1", "english, english menu, english speaking"],
  ["All you can drink", "ChkNomihoudai=1", "all you can drink, nomihodai, nomihoudai, free flow, bottomless, unlimited drinks"],
  ["All you can eat", "ChkTabehoudai=1", "all you can eat, tabehodai, tabehoudai, eat all you can"],
  ["Sake", "ChkSake=1", "sake, nihonshu"],
  ["Wine", "ChkWine=1", "wine, natural wine"],
  ["Shochu", "ChkShochu=1", "shochu"],
  ["Breakfast", "ChkMorningMenu=1", "breakfast, morning, brunch"],
  ["Happy hour", "ChkHappyHour=1", "happy hour"],
  ["Takeout", "ChkTakeout=1", "takeout, take out, takeaway, take away, to go"],
  ["Pet friendly", "ChkPet=1", "pet, dog, pet friendly, dog friendly"],
  ["Free Wi-Fi", "ChkFreeWifi=1", "wifi, wi fi, free wifi, laptop"],
  ["Power outlets", "ChkPowerSupply=1", "outlet, power outlet, charging"],
  ["Non-smoking", "LstSmoking=1", "non smoking, nonsmoking, no smoking, smoke free"],
  ["Smoking allowed", "LstSmoking=3", "smoking, smoking allowed, smoker"],
  ["Wheelchair access", "ChkWheelchair=1", "wheelchair, accessible, barrier free"],
  ["Celebration", "ChkCelebrate=1", "birthday, celebration, celebrate"],
  ["Cheap eats", "pmax=2", "cheap, cheap eats, budget, inexpensive, affordable, bargain"],
  ["Upscale", "pmin=8", "upscale, luxury, luxurious, splurge, high end, fine dining, expensive, fancy, michelin"],
  ["Open now", "open=1", "open, open now"],
];

// filler that says nothing about where to eat
const STOP = new Set(("a an the and or with for in at on of to near nearby around close me my here there this some any good best great nice top " +
  "tasty delicious yummy place spot restaurant food eat eating find want looking somewhere something local really very where i we").split(" "));

export type Feature = { label: string; param: string };
export type ParsedQuery = { genre: Genre; features: Feature[]; keyword: string };

// lower case, accents and punctuation gone, Japanese kept; "kids" and "kid" are the same word
const words = (s: string) => s.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim().split(" ").filter(Boolean);
const sing = (w: string) => (w.length > 3 && w.endsWith("s") && !w.endsWith("ss") ? w.slice(0, -1) : w);

type Target = { kind: "genre"; code: string; label: string } | { kind: "feature"; label: string; param: string };
type Phrase = { words: string[]; target: Target; isLabel: boolean };
// every phrase, longest first so "all you can drink" wins over "drink" and "japanese bbq" over "japanese"
const PHRASES: Phrase[] = (() => {
  const out: Phrase[] = [], seen = new Set<string>();
  const add = (p: string, target: Target, isLabel: boolean) => {
    const ws = words(p).map(sing), k = ws.join(" ");
    if (ws.length && !seen.has(k)) { seen.add(k); out.push({ words: ws, target, isLabel }); }
  };
  for (const [code, label] of GENRES) if (code !== "RC") { add(label, { kind: "genre", code, label }, true); add(code, { kind: "genre", code, label }, true); }
  for (const [label, param] of FEATURES) add(label, { kind: "feature", label, param }, true);
  for (const [code, label, kws] of GENRES) for (const p of kws.split(",")) add(p, { kind: "genre", code, label }, false);
  for (const [label, param, ps] of FEATURES) for (const p of ps.split(",")) add(p, { kind: "feature", label, param }, false);
  return out.sort((a, b) => b.words.length - a.words.length);
})();

/** Free text -> one Tabelog genre, any of Tabelog's search conditions, and whatever's left (a restaurant name, or any
 *  other word) for Tabelog's keyword search. "quiet ramen afuri" is ramen + relaxed + "afuri". */
export function parseQuery(q: unknown): ParsedQuery {
  const ws = words(String(q || "")), sw = ws.map(sing);
  let genre: Genre | null = null;
  const features: Feature[] = [], rest: string[] = [];
  for (let i = 0; i < ws.length;) {
    const hit = PHRASES.find((p) => p.words.every((w, j) => sw[i + j] === w));
    if (hit) {
      const t = hit.target;
      if (t.kind === "genre") genre ??= { code: t.code, label: t.label, matched: true };
      else if (!features.some((f) => f.label === t.label)) features.push({ label: t.label, param: t.param });
      i += hit.words.length;
    } else {
      if (!STOP.has(ws[i])) rest.push(ws[i]);
      i++;
    }
  }
  // a lone half-typed word ("ram") still means the genre it starts
  if (!genre && !features.length && rest.length === 1 && rest[0].length >= 3) {
    const p = PHRASES.find((p) => p.isLabel && p.target.kind === "genre" && p.words.join(" ").startsWith(rest[0]));
    if (p && p.target.kind === "genre") { genre = { code: p.target.code, label: p.target.label, matched: true }; rest.length = 0; }
  }
  return { genre: genre ?? { code: "RC", label: GENRE_LABEL.RC, matched: true }, features, keyword: rest.join(" ") };
}

export type Suggestion = { kind: "genre" | "feature"; label: string; value: string };

/** Genres and search conditions that complete what's being typed: "nood" offers Ramen, Soba and Udon; "ramen pri" offers "ramen Private room". */
export function suggestions(text: string, max = 5): Suggestion[] {
  const ws = words(text);
  if (!ws.length) return [];
  const out: Array<Suggestion & { rank: number }> = [], seen = new Set<string>();
  // the last one, two or three words may be the start of a phrase; whatever comes before stays as typed
  for (let n = Math.min(3, ws.length); n >= 1; n--) {
    const head = ws.slice(0, ws.length - n).join(" "), part = ws.slice(-n).join(" ");
    if (part.length < 2) continue;
    for (const p of PHRASES) {
      const phrase = p.words.join(" "), label = p.target.label;
      const starts = phrase.startsWith(part) || (n === 1 && p.words.some((w) => w.startsWith(part)));
      if (!starts || seen.has(label)) continue;
      seen.add(label);
      out.push({ kind: p.target.kind, label, value: head ? `${head} ${label}` : label, rank: (p.isLabel ? 0 : 2) + (phrase.startsWith(part) ? 0 : 1) + (n > 1 ? -1 : 0) });
    }
  }
  return out.sort((a, b) => a.rank - b.rank).slice(0, max).map(({ rank: _rank, ...s }) => s);
}

/** "Ramen · Private room · “afuri”": how a search reads, for the suggestion row and the results line. */
export function describeQuery(p: ParsedQuery): string {
  return [p.genre.code === "RC" ? "" : p.genre.label, ...p.features.map((f) => f.label), p.keyword ? `“${p.keyword}”` : ""].filter(Boolean).join(" · ");
}

/** Does a restaurant name have every word of the text at the start of one of its words? Run-together text
 *  counts too, from a word start: "torikizoku" matches "Tori Kizoku", but "saito" doesn't match "Yasai to". */
export function nameMatches(name: string, text: string): boolean {
  const nw = words(name), tw = words(text);
  if (!tw.length) return false;
  if (tw.every((t) => nw.some((w) => w.startsWith(t)))) return true;
  const joined = nw.join(""), t = tw.join("");
  let at = 0;
  return t.length >= 4 && nw.some((w) => { const hit = joined.startsWith(t, at); at += w.length; return hit; });
}
