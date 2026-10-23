import { BlogIndex, indexMetadata } from "@/components/blog/blog-index";

export const revalidate = 3600; // publishing from the dashboard revalidates immediately; this is the fallback

export const metadata = indexMetadata(undefined, 1);

export default function BlogPage() {
  return <BlogIndex page={1} />;
}
