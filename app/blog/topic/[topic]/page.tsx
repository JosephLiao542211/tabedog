import { BlogIndex, indexMetadata } from "@/components/blog/blog-index";
import { TOPICS } from "@/lib/blog";

type Props = { params: Promise<{ topic: string }> };

export const revalidate = 3600;
export const dynamicParams = false;
export function generateStaticParams() {
  return TOPICS.map((t) => ({ topic: t.slug }));
}

export async function generateMetadata({ params }: Props) {
  return indexMetadata((await params).topic, 1);
}

export default async function BlogTopicPage({ params }: Props) {
  return <BlogIndex topicSlug={(await params).topic} page={1} />;
}
