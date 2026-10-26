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

// PostgREST's "table not found": the blog migration hasn't reached this database yet. Render an empty
// blog instead of failing the build; publishing the first post revalidates every blog page anyway.
const NO_TABLE = "PGRST205";

/** The query's data, or `empty` when the posts table doesn't exist yet. Other errors throw (ISR keeps serving the last good page). */
function must<T>(res: { data: T | null; error: { message: string; code?: string } | null }, what: string, empty: T): T {
  if (res.error?.code === NO_TABLE) { console.warn(`[blog] ${what}: posts table missing, run the blog migration`); return empty; }
  if (res.error) throw new Error(`[blog] ${what}: ${res.error.message}`);
  return res.data as T;
}

/** Published posts, newest first. `topic` narrows to one topic; `page` is 1-based. */
export async function listPosts({ topic, page = 1, limit = BLOG.pageSize }: { topic?: string; page?: number; limit?: number } = {}) {
  let q = db().from("posts").select(CARD_COLUMNS, { count: "exact" }).order("published_at", { ascending: false });
  if (topic) q = q.eq("topic", topic);
  const res = await q.range((page - 1) * limit, page * limit - 1);
  if (res.error?.code === "PGRST103") return { posts: [] as PostCard[], total: 0 }; // page past the end: the caller 404s
  return { posts: must(res, "list", []) as unknown as PostCard[], total: res.count ?? 0 };
}

export async function getPost(slug: string): Promise<Post | null> {
  return must(await db().from("posts").select("*").eq("slug", slug).maybeSingle(), "get", null) as Post | null;
}

const STOP = new Set("the a an and or of in to for on at with how what why where best your from is are by vs guide japan japanese".split(" "));
const words = (s: string) => new Set(s.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 2 && !STOP.has(w)));

/** The posts most like this one: shared tags count most, then same topic, then shared title words; newer wins ties. */
export async function relatedPosts(post: Pick<Post, "id" | "topic" | "tags" | "title">, n = 6): Promise<PostCard[]> {
  const pool = must(await db().from("posts").select(`${CARD_COLUMNS}, tags`).neq("id", post.id).order("published_at", { ascending: false }).limit(60), "related", []) as unknown as (PostCard & { tags: string[] })[];
  const tags = new Set(post.tags.map((t) => t.toLowerCase()));
  const title = words(post.title);
  const score = (p: PostCard & { tags: string[] }) =>
    (p.tags ?? []).filter((t) => tags.has(t.toLowerCase())).length * 3 + (p.topic === post.topic ? 2 : 0) + [...words(p.title)].filter((w) => title.has(w)).length;
  return pool
    .map((p, i) => ({ p, s: score(p), i }))
    .sort((a, b) => b.s - a.s || a.i - b.i)
    .slice(0, n)
    .map(({ p: { tags: _t, ...card } }) => card);
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

/** The signed-in admin, or null. For route handlers, which answer 404 themselves instead of redirecting. */
export async function blogAdmin(): Promise<{ email: string; admin: SupabaseClient } | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const email = user?.email?.toLowerCase() ?? "";
  if (!user?.email_confirmed_at || !adminEmails().includes(email)) return null;
  return { email, admin: createAdminClient() };
}

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
  return must(await admin.from("posts").select("id, slug, title, topic, status, published_at, updated_at, featured, cover_url").order("updated_at", { ascending: false }), "admin list", []) as Pick<Post, "id" | "slug" | "title" | "topic" | "status" | "published_at" | "updated_at" | "featured" | "cover_url">[];
}

export async function adminGetPost(id: string) {
  const { admin } = await requireBlogAdmin(`/admin/blog/${id}`);
  return must(await admin.from("posts").select("*").eq("id", id).maybeSingle(), "admin get", null) as Post | null;
}
