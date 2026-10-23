import { notFound } from "next/navigation";
import { adminGetPost } from "@/lib/blog-server";
import { PostEditor } from "@/components/blog/admin/post-editor";

export const dynamic = "force-dynamic";

export default async function EditPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const post = await adminGetPost(id);
  if (!post) notFound();
  return <PostEditor key={post.id} initial={post} />;
}
