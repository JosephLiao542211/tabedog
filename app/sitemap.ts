import type { MetadataRoute } from "next";
import { postUrl, topicUrl, TOPICS } from "@/lib/blog";
import { allPublished } from "@/lib/blog-server";
import { CITIES, CUISINES, SITE, allCityCuisinePages, cityCuisineUrl, cityUrl, cuisineUrl } from "@/lib/seo";

export const revalidate = 3600; // blog posts appear here as soon as they are published (see app/admin/blog/actions.ts)

const CONTENT_UPDATED = new Date("2026-10-20");

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = (await allPublished()).filter((p) => !p.noindex);
  const blogUpdated = posts[0] ? new Date(posts[0].updated_at) : CONTENT_UPDATED;
  return [
    { url: SITE.url, lastModified: CONTENT_UPDATED, changeFrequency: "weekly", priority: 1 },
    ...["/about", "/terms", "/privacy", "/legal"].map((p) => ({ url: `${SITE.url}${p}`, lastModified: new Date("2026-10-22"), changeFrequency: "yearly" as const, priority: 0.3 })),
    ...CITIES.map((c) => ({ url: `${SITE.url}${cityUrl(c.slug)}`, lastModified: CONTENT_UPDATED, changeFrequency: "daily" as const, priority: 0.9 })),
    ...CUISINES.map((c) => ({ url: `${SITE.url}${cuisineUrl(c.slug)}`, lastModified: CONTENT_UPDATED, changeFrequency: "monthly" as const, priority: 0.8 })),
    ...allCityCuisinePages().map(({ city, cuisine }) => ({ url: `${SITE.url}${cityCuisineUrl(city.slug, cuisine.slug)}`, lastModified: CONTENT_UPDATED, changeFrequency: "daily" as const, priority: 0.7 })),
    { url: `${SITE.url}/blog`, lastModified: blogUpdated, changeFrequency: "weekly", priority: 0.8 },
    ...TOPICS.map((t) => ({ url: `${SITE.url}${topicUrl(t.slug)}`, lastModified: blogUpdated, changeFrequency: "weekly" as const, priority: 0.5 })),
    ...posts.map((p) => ({ url: `${SITE.url}${postUrl(p.slug)}`, lastModified: new Date(p.updated_at), changeFrequency: "monthly" as const, priority: 0.7, ...(p.cover_url && { images: [p.cover_url] }) })),
  ];
}
