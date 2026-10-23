// The article page body, shared by /blog/[slug] and the dashboard's draft preview.
import Link from "next/link";
import { BLOG, postUrl, readingMinutes, topicName, topicUrl, type Post, type PostCard } from "@/lib/blog";
import { SITE } from "@/lib/seo";
import { CtaBand, SiteFooter, SiteHeader } from "@/components/site";
import { Byline, Cover, PostCardView, Share, postDate } from "./blog-ui";
import { PostBody } from "./markdown";

export function PostView({ post, related, banner }: { post: Post; related: PostCard[]; banner?: React.ReactNode }) {
  const url = `${SITE.url}${postUrl(post.slug)}`;
  const author = post.author_name || BLOG.defaultAuthor.name;
  const role = post.author_name ? post.author_role : BLOG.defaultAuthor.role;
  return (
    <div className="site blog">
      {banner}
      <SiteHeader />
      <main className="blog-main">
        <article className="post">
          <header className="post-head">
            <Link href="/blog" className="post-back">← All posts</Link>
            <p className="post-meta">
              <Link href={topicUrl(post.topic)} className="blog-topic">{topicName(post.topic)}</Link>
              <span aria-hidden="true">·</span>
              {postDate(post.published_at) ?? <span>Unpublished</span>}
              <span aria-hidden="true">·</span>
              <span>{readingMinutes(post.content)} min read</span>
            </p>
            <h1 className="post-title">{post.title || "Untitled"}</h1>
            {post.excerpt && <p className="post-dek">{post.excerpt}</p>}
            <div className="post-byline-row">
              <Byline name={author} role={role} avatar={post.author_avatar} />
              <Share url={url} title={post.title} />
            </div>
          </header>
          {post.cover_url && (
            <div className="post-cover">
              <Cover src={post.cover_url} alt={post.cover_alt} sizes="(min-width: 1080px) 1048px, 100vw" priority />
            </div>
          )}
          <PostBody markdown={post.content} />
          <footer className="post-foot">
            {post.tags.length > 0 && (
              <ul className="site-tags" aria-label="Tags">
                {post.tags.map((t) => <li key={t}><span>{t}</span></li>)}
              </ul>
            )}
            <div className="post-foot-row">
              <Link href="/blog" className="post-back">← All posts</Link>
              <Share url={url} title={post.title} />
            </div>
          </footer>
        </article>

        {related.length > 0 && (
          <section className="post-related" aria-labelledby="related-h">
            <h2 id="related-h" className="site-h2">Keep reading</h2>
            <div className="blog-grid">{related.map((p) => <PostCardView key={p.id} post={p} />)}</div>
          </section>
        )}
        <CtaBand title="Find where locals actually eat" body="Every Tabelog-rated restaurant in Japan on one English map, with hours, prices and payment methods." image="/img/tokyo-aerial.jpg" />
      </main>
      <SiteFooter />
    </div>
  );
}
