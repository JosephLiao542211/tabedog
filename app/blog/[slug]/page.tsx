import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BLOG, headings, metaDescription, metaTitle, postUrl, topicName, topicUrl, wordCount } from "@/lib/blog";
import { allPublished, getPost, relatedPosts } from "@/lib/blog-server";
import { SITE } from "@/lib/seo";
import { JsonLd, breadcrumbSchema } from "@/components/site";
import { PostView } from "@/components/blog/post-view";

type Props = { params: Promise<{ slug: string }> };

export const revalidate = 3600; // saving in the dashboard revalidates the post right away
export async function generateStaticParams() {
  return (await allPublished()).map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = await getPost((await params).slug);
  if (!post) return {};
  const title = metaTitle(post);
  const description = metaDescription(post);
  const url = postUrl(post.slug);
  const author = post.author_name || BLOG.defaultAuthor.name;
  return {
    title: { absolute: title.length <= 48 ? `${title} | ${SITE.name}` : title },
    description,
    keywords: [post.focus_keyword, ...post.tags].filter(Boolean),
    authors: [{ name: author }],
    alternates: { canonical: post.canonical_url || url, types: { "application/rss+xml": [{ url: "/blog/rss.xml", title: BLOG.name }] } },
    robots: post.noindex ? { index: false, follow: true } : undefined,
    openGraph: {
      type: "article",
      url,
      title,
      description,
      publishedTime: post.published_at ?? undefined,
      modifiedTime: post.updated_at,
      authors: [author],
      section: topicName(post.topic),
      tags: post.tags,
    },
    twitter: { card: "summary_large_image", title, description }, // image: ./opengraph-image.tsx
  };
}

export default async function PostPage({ params }: Props) {
  const post = await getPost((await params).slug);
  if (!post) notFound();
  const related = await relatedPosts(post);
  const url = `${SITE.url}${postUrl(post.slug)}`;
  const author = post.author_name || BLOG.defaultAuthor.name;
  const crumbs = [{ name: "Blog", url: "/blog" }, { name: topicName(post.topic), url: topicUrl(post.topic) }, { name: post.title, url: postUrl(post.slug) }];

  return (
    <>
      <JsonLd data={[breadcrumbSchema(crumbs), {
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        "@id": `${url}#article`,
        mainEntityOfPage: { "@type": "WebPage", "@id": url },
        url,
        headline: metaTitle(post).slice(0, 110),
        description: metaDescription(post),
        image: post.cover_url ? [post.cover_url] : [`${url}/opengraph-image`],
        datePublished: post.published_at,
        dateModified: post.updated_at,
        inLanguage: "en",
        articleSection: topicName(post.topic),
        keywords: [post.focus_keyword, ...post.tags].filter(Boolean).join(", ") || undefined,
        wordCount: wordCount(post.content),
        timeRequired: `PT${Math.max(1, Math.round(wordCount(post.content) / 230))}M`,
        hasPart: headings(post.content).filter((h) => h.depth === 2).map((h) => ({ "@type": "WebPageElement", name: h.text, url: `${url}#${h.id}` })),
        author: { "@type": "Person", name: author, ...(post.author_role && { jobTitle: post.author_role }), ...(post.author_avatar && { image: post.author_avatar }) },
        publisher: { "@type": "Organization", "@id": `${SITE.url}/#org`, name: SITE.name, url: SITE.url, logo: { "@type": "ImageObject", url: `${SITE.url}/logo.svg` } },
        isPartOf: { "@type": "Blog", "@id": `${SITE.url}/blog#blog`, name: BLOG.name },
      }]} />
      <PostView post={post} related={related} />
    </>
  );
}
