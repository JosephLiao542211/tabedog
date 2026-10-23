import { requireBlogAdmin } from "@/lib/blog-server";
import { PostEditor } from "@/components/blog/admin/post-editor";

export const dynamic = "force-dynamic";

export default async function NewPostPage() {
  await requireBlogAdmin("/admin/blog/new");
  return <PostEditor initial={null} />;
}
