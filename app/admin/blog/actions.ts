"use server";
// Dashboard writes. Every action re-checks the admin before touching the service-role client.
import { revalidatePath } from "next/cache";
import { slugify, type Post } from "@/lib/blog";
import { requireBlogAdmin } from "@/lib/blog-server";

export type PostInput = Omit<Post, "id" | "created_at" | "updated_at"> & { id: string | null };
export type SaveResult = { ok: true; post: Post } | { ok: false; error: string };

const RESERVED = new Set(["page", "topic", "rss-xml", "new", "admin"]);
const cleanUrl = (u: string | null) => (u && /^https?:\/\/\S+$/.test(u.trim()) ? u.trim() : null);

function refresh(...slugs: (string | null | undefined)[]) {
  revalidatePath("/blog", "layout"); // index, topic pages, pagination and every post
  for (const s of slugs) if (s) revalidatePath(`/blog/${s}`);
  revalidatePath("/sitemap.xml");
  revalidatePath("/blog/rss.xml");
}

export async function savePost(input: PostInput): Promise<SaveResult> {
  const { admin } = await requireBlogAdmin();
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
  refresh(slug, prev?.slug);
  return { ok: true, post: res.data as Post };
}

export async function deletePost(id: string): Promise<{ ok: boolean; error?: string }> {
  const { admin } = await requireBlogAdmin();
  const res = await admin.from("posts").delete().eq("id", id).select("slug").maybeSingle();
  if (res.error) return { ok: false, error: res.error.message };
  refresh(res.data?.slug);
  return { ok: true };
}

/** A one-off signed URL the browser uploads straight to Storage with, so big photos skip the 4.5 MB function body limit. */
export async function createUpload(fileName: string, contentType: string): Promise<{ path: string; token: string; publicUrl: string } | { error: string }> {
  const { admin } = await requireBlogAdmin();
  if (!/^image\//.test(contentType)) return { error: "Only images can be uploaded." };
  const ext = (fileName.split(".").pop() || contentType.split("/")[1] || "png").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5);
  const base = slugify(fileName.replace(/\.[^.]+$/, "")).slice(0, 50) || "image";
  const path = `${new Date().toISOString().slice(0, 7)}/${base}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
  const res = await admin.storage.from("blog").createSignedUploadUrl(path);
  if (res.error) return { error: res.error.message };
  return { path, token: res.data.token, publicUrl: admin.storage.from("blog").getPublicUrl(path).data.publicUrl };
}
