// Words and patterns that make writing read as machine-made. The prompt lists them for the agent and
// presentDraft checks every draft against them, so this file is the one place to edit the list.

export const BANNED_WORDS = [
  // overused verbs and adjectives
  "delve", "delves", "delving", "foster", "fosters", "fostering", "underscore", "underscores", "underscoring", "realm", "realms",
  "meticulous", "meticulously", "multifaceted", "testament", "tapestry", "crucial", "dependable", "clearer",
  "elevate", "elevates", "elevated", "tantalizing", "mouthwatering", "mouth-watering", "nestled", "vibrant", "bustling", "seamless", "seamlessly",
  "unparalleled", "unforgettable", "boasts", "embark", "journey", "navigate", "navigating", "landscape", "beacon", "symphony", "treasure trove",
  // transitions
  "furthermore", "moreover", "additionally", "in conclusion", "it is important to note", "it's important to note", "it is worth noting", "it's worth noting",
  "ultimately", "in summary", "that being said", "all in all",
  // stock phrases
  "hidden gem", "hidden gems", "must-try", "must-visit", "culinary journey", "foodie paradise", "look no further", "something for everyone",
  "a feast for the senses", "whether you're", "whether you are", "let's dive in", "dive into", "here's the thing", "in today's",
] as const;

export const BANNED_PATTERNS: { label: string; re: RegExp }[] = [
  { label: "em dash (—); use a colon, comma or new sentence", re: /—/g },
  { label: "negative parallelism (\"It's not X, it's Y\" / \"isn't just X, it's Y\")", re: /\b(?:it|this|that)(?:'s| is| was)(?:n't| not) (?:just |only |merely )?[^.!?\n]{1,60}[,;:—-]\s*(?:it|this|that)(?:'s| is| was)\b/gi },
  { label: "\"not just X but Y\"", re: /\bnot (?:just|only|merely) [^.!?\n]{1,50},? but (?:also )?/gi },
  { label: "triple countdown (\"Not X. Not Y. Just Z.\")", re: /\bNo(?:t|) [^.!?\n]{1,40}[.!] No(?:t|) [^.!?\n]{1,40}[.!]/g },
  { label: "rhetorical question opener (\"Looking for...?\" / \"Ever wondered...?\")", re: /^(?:looking for|ever wondered|craving|wondering|want to)\b[^?\n]{0,120}\?/gim },
];

/** Every banned word or pattern found in `text`, with a count, for presentDraft to send back. */
export function styleProblems(text: string): string[] {
  const out: string[] = [];
  const words = new Map<string, number>();
  for (const w of BANNED_WORDS) {
    const n = (text.match(new RegExp(`(?<![\\w-])${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\w-])`, "gi")) ?? []).length;
    if (n) words.set(w, n);
  }
  if (words.size) out.push(`Banned words: ${[...words].map(([w, n]) => (n > 1 ? `"${w}" ×${n}` : `"${w}"`)).join(", ")}. Rewrite those sentences in plain words.`);
  for (const p of BANNED_PATTERNS) {
    const hits = text.match(p.re) ?? [];
    if (hits.length) out.push(`Banned pattern, ${p.label}: ${hits.slice(0, 3).map((h) => `"${h.slice(0, 70)}"`).join(", ")}${hits.length > 3 ? ` and ${hits.length - 3} more` : ""}.`);
  }
  return out;
}
