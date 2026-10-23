import { BlogIndex, indexMetadata, parsePage } from "@/components/blog/blog-index";

type Props = { params: Promise<{ topic: string; n: string }> };

export const revalidate = 3600;

export async function generateMetadata({ params }: Props) {
  const { topic, n } = await params;
  return indexMetadata(topic, parsePage(n));
}

export default async function BlogTopicPagedPage({ params }: Props) {
  const { topic, n } = await params;
  return <BlogIndex topicSlug={topic} page={parsePage(n)} />;
}
