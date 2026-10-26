// The article page body, shared by /blog/[slug] and the dashboard's draft preview.
import Link from "next/link";
import { authorOf, postUrl, readingMinutes, topicName, topicUrl, withoutCover, type Post, type PostCard } from "@/lib/blog";
import { SITE } from "@/lib/seo";
import { CtaBand, SiteFooter, SiteHeader } from "@/components/site";
import { Byline, Cover, PostCardView, Share, postDate } from "./blog-ui";
import { PostBody } from "./markdown";

/**
 * The body split before its second ## section, so related posts can sit inside the article where readers
 * still are (better internal linking than a footer alone). Posts with one section or with footnotes stay whole,
 * and get the box right after the body instead.
 */
function splitBody(md: string): [string, string] | null {
  if (/\[\^[^\]]+\]/.test(md)) return null; // footnote refs and definitions must render together
  const h2 = [...md.replace(/```[\s\S]*?```/g, (m) => " ".repeat(m.length)).matchAll(/^## /gm)].map((m) => m.index!);
  if (h2.length < 2) return null;
  return [md.slice(0, h2[1]), md.slice(h2[1])];
}

function RelatedInline({ posts }: { posts: PostCard[] }) {
  return (
    <section className="post-inline-related" aria-labelledby="inline-related-h">
      <p id="inline-related-h" className="post-inline-related-h">Related reading</p>
      <ul>
        {posts.map((p) => (
          <li key={p.id}>
            <Link href={postUrl(p.slug)}>
              <span className="post-inline-related-topic">{topicName(p.topic)}</span>
              <span className="post-inline-related-title">{p.title}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function PostView({ post, related, banner }: { post: Post; related: PostCard[]; banner?: React.ReactNode }) {
  const url = `${SITE.url}${postUrl(post.slug)}`;
  const { name: author, role } = authorOf(post);
  const body = withoutCover(post.content, post.cover_url);
  const parts = related.length ? splitBody(body) : null;
  // the inline box takes the closest three; the footer shows the next ones (or the same three when that's all there is)
  const more = related.length > 3 ? related.slice(3, 6) : related.slice(0, 3);
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
              <Byline name={author} role={role} avatar={post.author_avatar} color={post.author_color} />
              <Share url={url} title={post.title} />
            </div>
          </header>
          {post.cover_url && (
            <div className="post-cover">
              <Cover src={post.cover_url} alt={post.cover_alt} sizes="(min-width: 1080px) 1048px, 100vw" priority />
            </div>
          )}
          {parts ? (
            <>
              <PostBody markdown={parts[0]} />
              <RelatedInline posts={related.slice(0, 3)} />
              <PostBody markdown={parts[1]} />
            </>
          ) : (
            <>
              <PostBody markdown={body} />
              {related.length > 0 && <RelatedInline posts={related.slice(0, 3)} />}
            </>
          )}
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
            <div className="blog-grid">{more.map((p) => <PostCardView key={p.id} post={p} />)}</div>
          </section>
        )}
        <CtaBand title="Find where locals actually eat" body="Every Tabelog-rated restaurant in Japan on one English map, with hours, prices and payment methods." image="/img/tokyo-aerial.jpg" />
      </main>
      <SiteFooter />
    </div>
  );
}
