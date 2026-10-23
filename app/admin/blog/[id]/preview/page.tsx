import Link from "next/link";
import { notFound } from "next/navigation";
import { adminGetPost } from "@/lib/blog-server";
import { PostView } from "@/components/blog/post-view";

export const dynamic = "force-dynamic";

export default async function PreviewPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const post = await adminGetPost(id);
  if (!post) notFound();
  const banner = (
    <div className="cms-preview-banner">
      Preview of the last saved version{post.status === "draft" ? " · this post is a draft" : ""}. <Link href={`/admin/blog/${id}`}>Back to editor</Link>
    </div>
  );
  return <PostView post={post} related={[]} banner={banner} />;
}
