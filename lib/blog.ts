// Blog content: the post type, topics, and the derived SEO fields every post gets for free
// (reading time, meta description, word count). Client-safe; data access lives in blog-server.ts.
import GithubSlugger from "github-slugger";
import { OPERATOR, SITE } from "./seo";

export type PostStatus = "draft" | "published";

export type Post = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  topic: string;
  tags: string[];
  cover_url: string | null;
  cover_alt: string;
  author_name: string;
  author_role: string;
  author_avatar: string | null;
  author_color: string | null;    // the dog avatar's background when there's no photo
  seo_title: string;
  seo_description: string;
  focus_keyword: string;
  canonical_url: string | null;
  noindex: boolean;
  featured: boolean;
  status: PostStatus;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

/** What the dashboard saves: a post without its timestamps; a null id inserts. */
export type PostInput = Omit<Post, "id" | "created_at" | "updated_at"> & { id: string | null };

export const emptyPost = (): PostInput => ({
  id: null, slug: "", title: "", excerpt: "", content: "", topic: TOPICS[0].slug, tags: [], cover_url: null, cover_alt: "",
  author_name: "", author_role: "", author_avatar: null, author_color: null,
  seo_title: "", seo_description: "", focus_keyword: "", canonical_url: null, noindex: false, featured: false, status: "draft", published_at: null,
});

/** The fields a list or card needs; keeps index queries from pulling every body. */
export type PostCard = Pick<Post, "id" | "slug" | "title" | "excerpt" | "topic" | "cover_url" | "cover_alt" | "author_name" | "author_role" | "author_avatar" | "author_color" | "published_at" | "updated_at" | "featured">;
export const CARD_COLUMNS = "id, slug, title, excerpt, topic, cover_url, cover_alt, author_name, author_role, author_avatar, author_color, published_at, updated_at, featured";

// Edit freely: a topic is a slug stored on the post plus a label and a one-line pitch for its page.
export const TOPICS = [
  { slug: "guides", name: "Guides", blurb: "Where and how to eat, city by city and dish by dish." },
  { slug: "tabelog", name: "Tabelog explained", blurb: "How Tabelog scores work and how to read them like a local." },
  { slug: "food-culture", name: "Food culture", blurb: "Etiquette, history and the habits behind Japan's restaurants." },
  { slug: "travel", name: "Travel", blurb: "Planning a trip around what you'll eat." },
  { slug: "tabedog", name: "TabeDog HQ", blurb: "Product news and how TabeDog is built." },
] as const;
export const topicBySlug = (slug: string) => TOPICS.find((t) => t.slug === slug);
export const topicName = (slug: string) => topicBySlug(slug)?.name ?? slug;

export const BLOG = {
  name: `The ${SITE.name} Blog`,
  tagline: "Eating in Japan, the way locals do",
  description: `Guides to Japan's best restaurants, Tabelog ratings explained, and food culture from the people who build ${SITE.name}.`,
  pageSize: 12,
  defaultAuthor: { name: OPERATOR.name, role: `Founder, ${SITE.name}` },
} as const;

// Bylines rotate between pen names. Saving a post that's unsigned (or signed by the founder) stores a pen
// name and an avatar color picked at random from the ones the latest posts didn't use (lib/blog-write.ts),
// so neighbours differ. authorOf still falls back to one hashed from the slug for anything unsaved.
// The migration that spread these over older posts copies both lists; keep them in sync.
export const PEN_NAMES = [
  { name: "Hachi", role: "Food editor, TabeDog" },
  { name: "Mochi", role: "Ramen & noodles, TabeDog" },
  { name: "Kuro", role: "Izakaya & nightlife, TabeDog" },
  { name: "Shiro", role: "Sushi & seafood, TabeDog" },
  { name: "Kuma", role: "Travel & neighborhoods, TabeDog" },
  { name: "Pochi", role: "Cafes & sweets, TabeDog" },
] as const;

// background colors for the dog-logo avatar; each one keeps white text readable
export const AVATAR_COLORS = ["#ff6347", "#2f7de1", "#2e9e6b", "#8a5cd6", "#e08a1e", "#d6457a", "#1f8a99", "#5b6b2e"] as const;

/** Small stable hash, so a seed always lands on the same pen name or color. */
export const seedIndex = (seed: string, n: number) => {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return (h >>> 0) % n;
};
export const avatarColor = (seed: string) => AVATAR_COLORS[seedIndex(seed, AVATAR_COLORS.length)];

/** True when the byline should be a pen name: nobody signed it, or the founder did. */
export const wantsPenName = (name: string) => !name.trim() || name.trim() === OPERATOR.name;

/** The name and role shown on a post. */
export function authorOf(p: Pick<Post, "slug" | "author_name" | "author_role">): { name: string; role: string } {
  if (!wantsPenName(p.author_name)) return { name: p.author_name.trim(), role: p.author_role };
  return PEN_NAMES[seedIndex(p.slug || "tabedog", PEN_NAMES.length)];
}

/** The body without any image that repeats the cover (the cover already sits above the post). */
export function withoutCover(md: string, cover: string | null) {
  if (!cover) return md;
  const esc = cover.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return md.replace(new RegExp(`^[ \\t]*!\\[[^\\]]*\\]\\(<?${esc}>?(?:\\s+"[^"]*")?\\)[ \\t]*\\n?`, "gm"), "").replace(/\n{3,}/g, "\n\n");
}

export const postUrl = (slug: string) => `/blog/${slug}`;
export const topicUrl = (slug: string) => `/blog/topic/${slug}`;

export const slugify = (s: string) =>
  s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/['’]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80).replace(/-+$/, "");

/** Markdown down to the words a reader sees: no syntax, no image alt, no link targets. */
export function plainText(md: string) {
  return md
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/^\s{0,3}(#{1,6}|>|[-*+]|\d+\.)\s+/gm, "")
    .replace(/[*_~`|]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export const wordCount = (md: string) => (plainText(md).match(/\S+/g) ?? []).length;
export const readingMinutes = (md: string) => Math.max(1, Math.round(wordCount(md) / 230));

/** Cut at a word boundary, at most `max` characters, with an ellipsis when something was cut. */
export function clip(s: string, max: number) {
  if (s.length <= max) return s;
  const cut = s.slice(0, max - 1);
  return cut.slice(0, Math.max(cut.lastIndexOf(" "), max - 20)).replace(/[\s,.;:]+$/, "") + "…";
}

export const metaTitle = (p: Pick<Post, "seo_title" | "title">) => p.seo_title.trim() || p.title.trim();
export const metaDescription = (p: Pick<Post, "seo_description" | "excerpt" | "content">) =>
  clip(p.seo_description.trim() || p.excerpt.trim() || plainText(p.content), 160);

/** h2/h3 headings with the same ids rehype-slug gives them in the rendered post. */
export function headings(md: string) {
  const slugger = new GithubSlugger();
  const out: { depth: 2 | 3; text: string; id: string }[] = [];
  for (const m of md.replace(/```[\s\S]*?```/g, "").matchAll(/^(#{2,3})\s+(.+?)\s*#*\s*$/gm)) {
    const text = plainText(m[2]);
    out.push({ depth: m[1].length as 2 | 3, text, id: slugger.slug(text) });
  }
  return out;
}

/** Question/answer pairs from a "## Frequently asked questions" (or "## FAQ") section: each ### is a question, the text under it the answer. */
export function faqs(md: string): { q: string; a: string }[] {
  const body = md.replace(/```[\s\S]*?```/g, "");
  const start = body.search(/^##\s+(?:frequently asked questions|faqs?)\b.*$/im);
  if (start < 0) return [];
  const rest = body.slice(start).replace(/^##[^\n]*\n/, "");
  const section = rest.slice(0, rest.search(/^##\s/m) >= 0 ? rest.search(/^##\s/m) : undefined);
  return section.split(/^###\s+/m).slice(1).map((chunk) => {
    const [q, ...a] = chunk.split("\n");
    return { q: plainText(q).replace(/\s*#*$/, ""), a: plainText(a.join("\n")) };
  }).filter((f) => f.q && f.a);
}

export const formatDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "Asia/Tokyo" }) : "";

export const isLive = (p: Pick<Post, "status" | "published_at">) => p.status === "published" && !!p.published_at && new Date(p.published_at) <= new Date();
