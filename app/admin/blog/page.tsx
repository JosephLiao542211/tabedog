import Link from "next/link";
import { formatDate, isLive, postUrl, topicName } from "@/lib/blog";
import { adminListPosts } from "@/lib/blog-server";

export const dynamic = "force-dynamic";

export default async function AdminPostsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const filter = (await searchParams).status;
  const all = await adminListPosts();
  const posts = filter === "draft" ? all.filter((p) => p.status === "draft") : filter === "published" ? all.filter((p) => p.status === "published") : all;
  const count = (s: string) => all.filter((p) => p.status === s).length;

  return (
    <main className="cms-main">
      <div className="cms-head">
        <h1>Posts</h1>
        <Link href="/admin/blog/new" className="cms-btn">New post</Link>
      </div>
      <nav className="cms-tabs">
        <Link href="/admin/blog" aria-current={!filter ? "page" : undefined}>All <b>{all.length}</b></Link>
        <Link href="/admin/blog?status=published" aria-current={filter === "published" ? "page" : undefined}>Published <b>{count("published")}</b></Link>
        <Link href="/admin/blog?status=draft" aria-current={filter === "draft" ? "page" : undefined}>Drafts <b>{count("draft")}</b></Link>
      </nav>
      {posts.length === 0 ? (
        <div className="cms-empty">
          <p className="h2">No posts yet</p>
          <p className="p2">Write your first one. Posts are markdown under the hood, with SEO handled for you.</p>
          <Link href="/admin/blog/new" className="cms-btn">Write a post</Link>
        </div>
      ) : (
        <ul className="cms-list">
          {posts.map((p) => {
            const scheduled = p.status === "published" && !isLive(p);
            return (
              <li key={p.id}>
                <Link href={`/admin/blog/${p.id}`} className="cms-list-main">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {p.cover_url ? <img src={p.cover_url} alt="" /> : <span className="cms-list-blank" />}
                  <span>
                    <span className="cms-list-title">{p.title || "Untitled"}{p.featured && <em> · Featured</em>}</span>
                    <span className="sub">{topicName(p.topic)} · /blog/{p.slug} · edited {formatDate(p.updated_at)}</span>
                  </span>
                </Link>
                <span className={`cms-status ${p.status === "draft" ? "draft" : scheduled ? "sched" : "live"}`}>{p.status === "draft" ? "Draft" : scheduled ? `Scheduled ${formatDate(p.published_at)}` : formatDate(p.published_at)}</span>
                {p.status === "published" && !scheduled && <Link href={postUrl(p.slug)} target="_blank" className="cms-btn-ghost">View</Link>}
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
