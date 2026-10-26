// Post writes with the service-role client. Callers check who's asking first: the dashboard's server
// actions via requireBlogAdmin, the queue runner via CRON_SECRET.
import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { AVATAR_COLORS, PEN_NAMES, slugify, wantsPenName, type Post, type PostInput } from "./blog";

export type SaveResult = { ok: true; post: Post } | { ok: false; error: string };

const RESERVED = new Set(["page", "topic", "rss-xml", "new", "admin"]);
const cleanUrl = (u: string | null) => (u && /^https?:\/\/\S+$/.test(u.trim()) ? u.trim() : null);

export function refreshBlog(...slugs: (string | null | undefined)[]) {
  revalidatePath("/blog", "layout"); // index, topic pages, pagination and every post
  for (const s of slugs) if (s) revalidatePath(`/blog/${s}`);
  revalidatePath("/sitemap.xml");
  revalidatePath("/blog/rss.xml");
}

const RECENT = 2; // a new pick avoids what this many of the latest posts used

const pickAvoiding = <T,>(all: readonly T[], avoid: Set<T>) => {
  const pool = all.filter((x) => !avoid.has(x));
  return (pool.length ? pool : all)[Math.floor(Math.random() * (pool.length || all.length))];
};

/** Fills in a pen name and an avatar color where the post leaves them open, unlike the latest posts' picks. */
async function withByline(admin: SupabaseClient, input: PostInput): Promise<PostInput> {
  const needName = wantsPenName(input.author_name), needColor = !input.author_avatar && !input.author_color;
  if (!needName && !needColor) return input;
  const { data } = await admin.from("posts").select("author_name, author_color")
    .neq("id", input.id ?? "00000000-0000-0000-0000-000000000000").order("created_at", { ascending: false }).limit(RECENT);
  const recent = data ?? [];
  const out = { ...input };
  if (needName) {
    const pen = pickAvoiding(PEN_NAMES, new Set(PEN_NAMES.filter((p) => recent.some((r) => r.author_name === p.name))));
    out.author_name = pen.name;
    out.author_role = pen.role;
  }
  if (needColor) out.author_color = pickAvoiding(AVATAR_COLORS, new Set(recent.map((r) => r.author_color)));
  return out;
}

export async function writePost(admin: SupabaseClient, raw: PostInput): Promise<SaveResult> {
  const input = await withByline(admin, raw);
  const slug = slugify(input.slug || input.title);
  if (!slug) return { ok: false, error: "Add a title or a URL slug first." };
  if (RESERVED.has(slug)) return { ok: false, error: `"${slug}" is reserved. Pick another URL slug.` };
  if (input.status === "published" && !input.title.trim()) return { ok: false, error: "A published post needs a title." };

  const clash = await admin.from("posts").select("id").eq("slug", slug).neq("id", input.id ?? "00000000-0000-0000-0000-000000000000").maybeSingle();
  if (clash.data) return { ok: false, error: `Another post already uses /blog/${slug}.` };

  const prev = input.id ? (await admin.from("posts").select("slug").eq("id", input.id).maybeSingle()).data : null;
  const row = {
    slug,
    title: input.title.trim(),
    excerpt: input.excerpt.trim(),
    content: input.content,
    topic: input.topic,
    tags: [...new Set(input.tags.map((t) => t.trim()).filter(Boolean))].slice(0, 12),
    cover_url: cleanUrl(input.cover_url),
    cover_alt: input.cover_alt.trim(),
    author_name: input.author_name.trim(),
    author_role: input.author_role.trim(),
    author_avatar: cleanUrl(input.author_avatar),
    author_color: (AVATAR_COLORS as readonly string[]).includes(input.author_color ?? "") ? input.author_color : null,
    seo_title: input.seo_title.trim(),
    seo_description: input.seo_description.trim(),
    focus_keyword: input.focus_keyword.trim(),
    canonical_url: cleanUrl(input.canonical_url),
    noindex: input.noindex,
    featured: input.featured,
    status: input.status,
    // first publish stamps the date; an explicit date (including a future one, to schedule) wins
    published_at: input.published_at ?? (input.status === "published" ? new Date().toISOString() : null),
  };
  const res = input.id
    ? await admin.from("posts").update(row).eq("id", input.id).select("*").single()
    : await admin.from("posts").insert(row).select("*").single();
  if (res.error) return { ok: false, error: res.error.message };
  refreshBlog(slug, prev?.slug);
  return { ok: true, post: res.data as Post };
}
