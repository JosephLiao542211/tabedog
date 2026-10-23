import { BLOG, metaDescription, postUrl, topicName } from "@/lib/blog";
import { allPublished } from "@/lib/blog-server";
import { SITE } from "@/lib/seo";

export const revalidate = 3600;

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export async function GET() {
  const posts = (await allPublished()).filter((p) => !p.noindex).slice(0, 50);
  const items = posts.map((p) => {
    const url = `${SITE.url}${postUrl(p.slug)}`;
    return `<item><title>${esc(p.title)}</title><link>${url}</link><guid isPermaLink="true">${url}</guid><pubDate>${new Date(p.published_at!).toUTCString()}</pubDate><category>${esc(topicName(p.topic))}</category>${p.author_name ? `<dc:creator>${esc(p.author_name)}</dc:creator>` : ""}<description>${esc(metaDescription(p))}</description>${p.cover_url ? `<enclosure url="${esc(p.cover_url)}" type="image/${p.cover_url.split(".").pop()?.replace("jpg", "jpeg") ?? "jpeg"}" length="0"/>` : ""}</item>`;
  });
  const xml = `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/"><channel><title>${esc(BLOG.name)}</title><link>${SITE.url}/blog</link><atom:link href="${SITE.url}/blog/rss.xml" rel="self" type="application/rss+xml"/><description>${esc(BLOG.description)}</description><language>en</language>${posts[0] ? `<lastBuildDate>${new Date(posts[0].updated_at).toUTCString()}</lastBuildDate>` : ""}${items.join("")}</channel></rss>`;
  return new Response(xml, { headers: { "Content-Type": "application/rss+xml; charset=utf-8" } });
}
