import type { MetadataRoute } from "next";
import { CITIES, CUISINES, SITE, allCityCuisinePages, cityCuisineUrl, cityUrl, cuisineUrl } from "@/lib/seo";

const CONTENT_UPDATED = new Date("2026-10-20");

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: SITE.url, lastModified: CONTENT_UPDATED, changeFrequency: "weekly", priority: 1 },
    ...CITIES.map((c) => ({ url: `${SITE.url}${cityUrl(c.slug)}`, lastModified: CONTENT_UPDATED, changeFrequency: "monthly" as const, priority: 0.9 })),
    ...CUISINES.map((c) => ({ url: `${SITE.url}${cuisineUrl(c.slug)}`, lastModified: CONTENT_UPDATED, changeFrequency: "monthly" as const, priority: 0.8 })),
    ...allCityCuisinePages().map(({ city, cuisine }) => ({ url: `${SITE.url}${cityCuisineUrl(city.slug, cuisine.slug)}`, lastModified: CONTENT_UPDATED, changeFrequency: "monthly" as const, priority: 0.7 })),
  ];
}
