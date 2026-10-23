// One template for /blog, /blog/page/N, /blog/topic/T and /blog/topic/T/page/N.
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BLOG, postUrl, topicBySlug, topicUrl } from "@/lib/blog";
import { listPosts } from "@/lib/blog-server";
import { SITE } from "@/lib/seo";
import { Breadcrumbs, JsonLd, SiteFooter, SiteHeader, breadcrumbSchema } from "@/components/site";
import { Masthead, Pager, PostGrid } from "./blog-ui";

export const parsePage = (n?: string) => {
  const page = Number(n ?? 1);
  if (!Number.isInteger(page) || page < 1 || (n !== undefined && page === 1)) notFound(); // /page/1 is just the base URL
  return page;
};

export function indexMetadata(topicSlug: string | undefined, page: number): Metadata {
  const topic = topicSlug ? topicBySlug(topicSlug) : undefined;
  const base = topic ? topicUrl(topic.slug) : "/blog";
  const url = page > 1 ? `${base}/page/${page}` : base;
  const title = (topic ? `${topic.name}: ${BLOG.name}` : `${BLOG.name}: ${BLOG.tagline}`) + (page > 1 ? ` (page ${page})` : "");
  const description = topic ? `${topic.blurb} Articles from ${BLOG.name}.` : BLOG.description;
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: url, types: { "application/rss+xml": [{ url: "/blog/rss.xml", title: BLOG.name }] } },
    openGraph: { title, description, url, type: "website" },
  };
}

export async function BlogIndex({ topicSlug, page }: { topicSlug?: string; page: number }) {
  const topic = topicSlug ? topicBySlug(topicSlug) : undefined;
  if (topicSlug && !topic) notFound();
  const { posts, total } = await listPosts({ topic: topic?.slug, page });
  const pages = Math.max(1, Math.ceil(total / BLOG.pageSize));
  if (page > pages) notFound();
  const base = topic ? topicUrl(topic.slug) : "/blog";
  const crumbs = [{ name: "Blog", url: "/blog" }, ...(topic ? [{ name: topic.name, url: base }] : [])];

  return (
    <div className="site blog">
      <JsonLd data={[breadcrumbSchema(crumbs), {
        "@context": "https://schema.org",
        "@type": topic ? "CollectionPage" : "Blog",
        "@id": `${SITE.url}${base}#blog`,
        name: topic ? `${topic.name}: ${BLOG.name}` : BLOG.name,
        description: topic?.blurb ?? BLOG.description,
        url: `${SITE.url}${base}`,
        inLanguage: "en",
        isPartOf: { "@id": `${SITE.url}/#website` },
        publisher: { "@type": "Organization", "@id": `${SITE.url}/#org`, name: SITE.name, logo: `${SITE.url}/logo.svg` },
        mainEntity: {
          "@type": "ItemList",
          itemListElement: posts.map((p, i) => ({ "@type": "ListItem", position: (page - 1) * BLOG.pageSize + i + 1, url: `${SITE.url}${postUrl(p.slug)}`, name: p.title })),
        },
      }]} />
      <SiteHeader />
      <main className="blog-main">
        {topic && <Breadcrumbs items={crumbs} />}
        <Masthead title={topic?.name} lead={topic?.blurb} active={topic?.slug} />
        <PostGrid posts={posts} featureFirst={page === 1} />
        <Pager page={page} pages={pages} base={base} />
      </main>
      <SiteFooter />
    </div>
  );
}
