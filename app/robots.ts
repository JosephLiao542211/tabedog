import type { MetadataRoute } from "next";
import { SITE } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/api/", "/auth/", "/login", "/account", "/admin"] }],
    sitemap: `${SITE.url}/sitemap.xml`,
    host: SITE.url,
  };
}
