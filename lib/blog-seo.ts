// The editor's SEO checklist. Each check is cheap and runs on every keystroke; the score is
// the share of weight passed. Rules follow what Google documents (unique title, useful meta
// description, descriptive alt text, crawlable links) plus common on-page conventions.
import { headings, metaDescription, metaTitle, plainText, wordCount, type Post } from "./blog";

export type SeoCheck = { id: string; label: string; ok: boolean; hint: string; weight: number };

const has = (hay: string, needle: string) => !!needle && hay.toLowerCase().includes(needle.toLowerCase());

export function seoChecks(p: Pick<Post, "title" | "seo_title" | "excerpt" | "seo_description" | "content" | "focus_keyword" | "slug" | "cover_url" | "cover_alt">): SeoCheck[] {
  const title = metaTitle(p);
  const desc = metaDescription(p);
  const kw = p.focus_keyword.trim();
  const words = wordCount(p.content);
  const firstPara = plainText(p.content.split(/\n\s*\n/).find((b) => b.trim() && !b.trim().startsWith("#") && !b.trim().startsWith("!")) ?? "");
  const images = [...p.content.matchAll(/!\[([^\]]*)\]\(([^)\s]+)/g)];
  const links = [...p.content.matchAll(/(?<!!)\[[^\]]*\]\(([^)\s]+)/g)].map((m) => m[1]);
  const internal = links.filter((h) => h.startsWith("/") || h.includes("tabedog.com"));
  const external = links.filter((h) => /^https?:\/\//.test(h) && !h.includes("tabedog.com"));
  const hs = headings(p.content);
  const kwSlug = kw.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const density = kw && words ? (plainText(p.content).toLowerCase().split(kw.toLowerCase()).length - 1) / words * 100 : 0;

  return [
    { id: "title-len", weight: 3, label: `Title is 30–60 characters (${title.length})`, ok: title.length >= 30 && title.length <= 60, hint: "Google cuts titles at roughly 60 characters. Set an SEO title if the headline is longer." },
    { id: "desc-len", weight: 3, label: `Meta description is 120–160 characters (${desc.length})`, ok: desc.length >= 120 && desc.length <= 160, hint: "Write a dek or an SEO description that sums up the post and makes someone want to click." },
    { id: "kw-set", weight: 2, label: "Focus keyword is set", ok: !!kw, hint: "The one search phrase this post should rank for, e.g. \"best ramen in Tokyo\"." },
    { id: "kw-title", weight: 3, label: "Keyword appears in the title", ok: has(title, kw), hint: "Put the focus keyword in the title, ideally near the start." },
    { id: "kw-desc", weight: 1, label: "Keyword appears in the meta description", ok: has(desc, kw), hint: "Google bolds matching words in the snippet." },
    { id: "kw-intro", weight: 2, label: "Keyword appears in the opening paragraph", ok: has(firstPara, kw), hint: "Say what the post is about in the first two sentences." },
    { id: "kw-slug", weight: 1, label: "Keyword appears in the URL", ok: !!kwSlug && p.slug.includes(kwSlug.replace(/^-|-$/g, "")), hint: "Short, readable slugs with the keyword do best." },
    { id: "kw-heading", weight: 1, label: "Keyword appears in a subheading", ok: hs.some((h) => has(h.text, kw)), hint: "Use it (or a close variant) in at least one ## heading." },
    { id: "density", weight: 1, label: `Keyword density 0.5–2.5% (${density.toFixed(1)}%)`, ok: density >= 0.5 && density <= 2.5, hint: "Use it naturally; repeating it too often reads as spam." },
    { id: "length", weight: 3, label: `At least 600 words (${words})`, ok: words >= 600, hint: "Thorough posts answer more of the questions people search for." },
    { id: "headings", weight: 2, label: `Uses ## subheadings (${hs.length})`, ok: hs.length >= 2, hint: "Break the post into sections; they become jump links and help featured snippets." },
    { id: "no-h1", weight: 1, label: "No extra H1 in the body", ok: !/^#\s/m.test(p.content.replace(/```[\s\S]*?```/g, "")), hint: "The title is the page's only H1. Start body headings at ##." },
    { id: "cover", weight: 2, label: "Has a cover image with alt text", ok: !!p.cover_url && p.cover_alt.trim().length > 4, hint: "The cover is the social preview image; alt text describes it for search and screen readers." },
    { id: "alt", weight: 2, label: `Every image has alt text (${images.filter((m) => m[1].trim()).length}/${images.length})`, ok: images.every((m) => m[1].trim().length > 2), hint: "Describe what's in each photo, e.g. \"Tonkotsu ramen at Ichiran Shibuya\"." },
    { id: "internal", weight: 2, label: `Links to other TabeDog pages (${internal.length})`, ok: internal.length >= 2, hint: "Link to city or cuisine pages like /tokyo or /cuisine/ramen, and to other posts." },
    { id: "external", weight: 1, label: `Cites at least one source (${external.length})`, ok: external.length >= 1, hint: "Linking to a Tabelog listing or an official site builds trust." },
  ];
}

export const seoScore = (checks: SeoCheck[]) => {
  const total = checks.reduce((n, c) => n + c.weight, 0);
  return Math.round((checks.reduce((n, c) => n + (c.ok ? c.weight : 0), 0) / total) * 100);
};
