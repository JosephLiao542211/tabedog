// Pieces shared by the blog index, topic pages and posts: masthead, topic nav, cards, byline, share links, pager.
import Image from "next/image";
import Link from "next/link";
import { BLOG, TOPICS, authorOf, avatarColor, formatDate, postUrl, topicName, topicUrl, type PostCard } from "@/lib/blog";
import { Logo } from "@/components/icons";

/** Supabase Storage images go through next/image; anything else pasted in (and the local dev stack, a private IP next/image refuses) is shown as-is. */
const STORAGE = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const optimizable = (src: string) => !!STORAGE && src.startsWith(STORAGE) && !/^https?:\/\/(127\.0\.0\.1|localhost)/.test(STORAGE);

export function Cover({ src, alt, sizes, priority = false }: { src: string; alt: string; sizes: string; priority?: boolean }) {
  return <Image src={src} alt={alt} fill sizes={sizes} priority={priority} unoptimized={!optimizable(src)} className="blog-img" />;
}

/** An uploaded photo, or the TabeDog dog on the post's stored color (older rows without one: a color picked from the name). */
export function Avatar({ src, color, name, size = 28 }: { src: string | null; color?: string | null; name: string; size?: number }) {
  if (src) return <Image src={src} alt="" width={size} height={size} unoptimized={!optimizable(src)} className="blog-avatar" />;
  return <span className="blog-avatar blog-avatar-dog" style={{ width: size, height: size, background: color || avatarColor(name) }} aria-hidden="true"><Logo size={Math.round(size * 0.62)} /></span>;
}

export function Masthead({ title = BLOG.name, lead = BLOG.tagline, active }: { title?: string; lead?: string; active?: string }) {
  return (
    <header className="blog-masthead">
      <h1 className="blog-masthead-title"><Link href="/blog">{title}</Link></h1>
      <p className="blog-masthead-lead">{lead}</p>
      <nav className="blog-topics" aria-label="Blog topics">
        <Link href="/blog" aria-current={!active ? "page" : undefined}>Latest</Link>
        {TOPICS.map((t) => (
          <Link key={t.slug} href={topicUrl(t.slug)} aria-current={active === t.slug ? "page" : undefined}>{t.name}</Link>
        ))}
      </nav>
    </header>
  );
}

function Author({ post }: { post: Pick<PostCard, "slug" | "author_name" | "author_role" | "author_avatar" | "author_color"> }) {
  const { name, role } = authorOf(post);
  return (
    <div className="blog-author">
      <Avatar src={post.author_avatar} color={post.author_color} name={name} />
      <div>
        <span className="blog-author-name">{name}</span>
        {role && <span className="blog-author-role">{role}</span>}
      </div>
    </div>
  );
}

export function PostCardView({ post, featured = false, priority = false }: { post: PostCard; featured?: boolean; priority?: boolean }) {
  const href = postUrl(post.slug);
  return (
    <article className={featured ? "blog-card blog-card-featured" : "blog-card"}>
      <Link href={href} className="blog-card-media" tabIndex={-1} aria-hidden="true">
        {post.cover_url
          ? <Cover src={post.cover_url} alt={post.cover_alt} sizes={featured ? "(min-width: 900px) 640px, 100vw" : "(min-width: 900px) 340px, (min-width: 600px) 50vw, 100vw"} priority={priority} />
          : <span className="blog-card-blank"><span>{topicName(post.topic)}</span></span>}
      </Link>
      <div className="blog-card-body">
        <Link href={topicUrl(post.topic)} className="blog-topic">{topicName(post.topic)}</Link>
        <h3 className="blog-card-title"><Link href={href}>{post.title}</Link></h3>
        {post.excerpt && <p className="blog-card-excerpt">{post.excerpt}</p>}
        <Author post={post} />
      </div>
    </article>
  );
}

export function PostGrid({ posts, featureFirst = false }: { posts: PostCard[]; featureFirst?: boolean }) {
  const [first, ...rest] = posts;
  if (!first) return <p className="blog-empty">No posts here yet. Check back soon.</p>;
  return (
    <>
      {featureFirst && <PostCardView post={first} featured priority />}
      <div className="blog-grid">
        {(featureFirst ? rest : posts).map((p, i) => <PostCardView key={p.id} post={p} priority={!featureFirst && i < 3} />)}
      </div>
    </>
  );
}

export function Pager({ page, pages, base }: { page: number; pages: number; base: string }) {
  if (pages <= 1) return null;
  const href = (n: number) => (n === 1 ? base : `${base}/page/${n}`);
  return (
    <nav className="blog-pager" aria-label="Pagination">
      {page > 1 ? <Link href={href(page - 1)} rel="prev" aria-label="Previous page">←</Link> : <span aria-hidden="true">←</span>}
      {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
        <Link key={n} href={href(n)} aria-current={n === page ? "page" : undefined}>{n}</Link>
      ))}
      {page < pages ? <Link href={href(page + 1)} rel="next" aria-label="Next page">→</Link> : <span aria-hidden="true">→</span>}
    </nav>
  );
}

export function Byline({ name, role, avatar, color }: { name: string; role: string; avatar: string | null; color: string | null }) {
  return (
    <div className="post-byline">
      <Avatar src={avatar} color={color} name={name} size={40} />
      <div>
        <span className="post-byline-name">By {name}</span>
        {role && <span className="post-byline-role">{role}</span>}
      </div>
    </div>
  );
}

export function Share({ url, title }: { url: string; title: string }) {
  const u = encodeURIComponent(url);
  const t = encodeURIComponent(title);
  const links = [
    { label: "Share on X", href: `https://x.com/intent/post?url=${u}&text=${t}`, d: "M17.75 3h3.07l-6.7 7.66L22 21h-6.17l-4.83-6.32L5.47 21H2.4l7.17-8.2L2 3h6.33l4.37 5.77L17.75 3Zm-1.08 16.17h1.7L7.4 4.74H5.58l11.09 14.43Z" },
    { label: "Share on LinkedIn", href: `https://www.linkedin.com/sharing/share-offsite/?url=${u}`, d: "M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5ZM3 9.75h4V21H3V9.75Zm6.5 0h3.83v1.54h.06c.53-1 1.84-2.06 3.79-2.06 4.05 0 4.8 2.67 4.8 6.13V21h-4v-4.99c0-1.19-.02-2.72-1.66-2.72-1.66 0-1.91 1.3-1.91 2.63V21h-4V9.75Z" },
    { label: "Share on Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${u}`, d: "M13.5 21v-7.5h2.5l.4-3h-2.9V8.6c0-.87.25-1.46 1.5-1.46h1.6V4.46A21 21 0 0 0 14.27 4.3c-2.3 0-3.87 1.4-3.87 3.98v2.22H7.8v3h2.6V21h3.1Z" },
    { label: "Share by email", href: `mailto:?subject=${t}&body=${u}`, d: "M3 5h18a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Zm1 2.4V17h16V7.4l-8 5.6-8-5.6ZM5.3 7 12 11.7 18.7 7H5.3Z" },
  ];
  return (
    <ul className="post-share" aria-label="Share this post">
      {links.map((l) => (
        <li key={l.label}>
          <a href={l.href} target="_blank" rel="noopener" aria-label={l.label} title={l.label}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d={l.d} /></svg>
          </a>
        </li>
      ))}
    </ul>
  );
}

export const postDate = (iso: string | null) => (iso ? <time dateTime={iso}>{formatDate(iso)}</time> : null);
