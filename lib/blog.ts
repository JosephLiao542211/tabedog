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

/** The fields a list or card needs; keeps index queries from pulling every body. */
export type PostCard = Pick<Post, "id" | "slug" | "title" | "excerpt" | "topic" | "cover_url" | "cover_alt" | "author_name" | "author_role" | "author_avatar" | "published_at" | "updated_at" | "featured">;
export const CARD_COLUMNS = "id, slug, title, excerpt, topic, cover_url, cover_alt, author_name, author_role, author_avatar, published_at, updated_at, featured";

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

export const formatDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "Asia/Tokyo" }) : "";

export const isLive = (p: Pick<Post, "status" | "published_at">) => p.status === "published" && !!p.published_at && new Date(p.published_at) <= new Date();
