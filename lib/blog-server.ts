// Blog data access. Public reads use a cookie-less anon client so blog pages stay statically
// rendered (ISR) and RLS only ever returns published posts. Dashboard reads and writes use the
// service role, behind requireBlogAdmin().
import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";
import { notFound, redirect } from "next/navigation";
import { createAdminClient } from "./supabase/admin";
import { createClient } from "./supabase/server";
import { BLOG, CARD_COLUMNS, type Post, type PostCard } from "./blog";
import { OPERATOR } from "./seo";

let anon: SupabaseClient | null = null;
const db = () =>
  (anon ??= createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  }));

function must<T>(res: { data: T | null; error: { message: string } | null }, what: string): T {
  if (res.error) throw new Error(`[blog] ${what}: ${res.error.message}`);
  return res.data as T;
}

/** Published posts, newest first. `topic` narrows to one topic; `page` is 1-based. */
export async function listPosts({ topic, page = 1, limit = BLOG.pageSize }: { topic?: string; page?: number; limit?: number } = {}) {
  let q = db().from("posts").select(CARD_COLUMNS, { count: "exact" }).order("published_at", { ascending: false });
  if (topic) q = q.eq("topic", topic);
  const res = await q.range((page - 1) * limit, page * limit - 1);
  if (res.error?.code === "PGRST103") return { posts: [] as PostCard[], total: 0 }; // page past the end: the caller 404s
  return { posts: must(res, "list") as unknown as PostCard[], total: res.count ?? 0 };
}

export async function getPost(slug: string): Promise<Post | null> {
  return must(await db().from("posts").select("*").eq("slug", slug).maybeSingle(), "get") as Post | null;
}

/** Same topic first, then the newest of the rest. */
export async function relatedPosts(post: Pick<Post, "id" | "topic">, n = 3): Promise<PostCard[]> {
  const same = must(await db().from("posts").select(CARD_COLUMNS).eq("topic", post.topic).neq("id", post.id).order("published_at", { ascending: false }).limit(n), "related") as unknown as PostCard[];
  if (same.length >= n) return same;
  const rest = must(await db().from("posts").select(CARD_COLUMNS).neq("topic", post.topic).order("published_at", { ascending: false }).limit(n - same.length), "related") as unknown as PostCard[];
  return [...same, ...rest];
}

/** Everything the sitemap and feed need. Never throws: a broken blog must not break the sitemap. */
export async function allPublished(): Promise<Pick<Post, "slug" | "title" | "excerpt" | "seo_description" | "content" | "topic" | "cover_url" | "author_name" | "published_at" | "updated_at" | "noindex">[]> {
  const res = await db().from("posts").select("slug, title, excerpt, seo_description, content, topic, cover_url, author_name, published_at, updated_at, noindex").order("published_at", { ascending: false });
  if (res.error) { console.error("[blog] allPublished:", res.error.message); return []; }
  return res.data as never;
}

// ---- dashboard ----

const adminEmails = () =>
  (process.env.BLOG_ADMIN_EMAILS || OPERATOR.email).split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);

/** The signed-in admin's email, or a redirect to sign in, or a 404 for everyone else (the dashboard doesn't advertise itself). */
export async function requireBlogAdmin(next = "/admin/blog"): Promise<{ email: string; admin: SupabaseClient }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  const email = user.email?.toLowerCase() ?? "";
  if (!user.email_confirmed_at || !adminEmails().includes(email)) notFound();
  return { email, admin: createAdminClient() };
}

export async function adminListPosts() {
  const { admin } = await requireBlogAdmin();
  return must(await admin.from("posts").select("id, slug, title, topic, status, published_at, updated_at, featured, cover_url").order("updated_at", { ascending: false }), "admin list") as Pick<Post, "id" | "slug" | "title" | "topic" | "status" | "published_at" | "updated_at" | "featured" | "cover_url">[];
}

export async function adminGetPost(id: string) {
  const { admin } = await requireBlogAdmin(`/admin/blog/${id}`);
  return must(await admin.from("posts").select("*").eq("id", id).maybeSingle(), "admin get") as Post | null;
}
