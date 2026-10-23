import { BlogIndex, indexMetadata, parsePage } from "@/components/blog/blog-index";

type Props = { params: Promise<{ n: string }> };

export const revalidate = 3600;

export async function generateMetadata({ params }: Props) {
  return indexMetadata(undefined, parsePage((await params).n));
}

export default async function BlogPagedPage({ params }: Props) {
  return <BlogIndex page={parsePage((await params).n)} />;
}
