"use server";
// Dashboard writes. Every action re-checks the admin before touching the service-role client.
import { slugify, type PostInput } from "@/lib/blog";
import { requireBlogAdmin } from "@/lib/blog-server";
import { refreshBlog, writePost, type SaveResult } from "@/lib/blog-write";

export type { PostInput, SaveResult };

export async function savePost(input: PostInput): Promise<SaveResult> {
  const { admin } = await requireBlogAdmin();
  return writePost(admin, input);
}

export async function deletePost(id: string): Promise<{ ok: boolean; error?: string }> {
  const { admin } = await requireBlogAdmin();
  const res = await admin.from("posts").delete().eq("id", id).select("slug").maybeSingle();
  if (res.error) return { ok: false, error: res.error.message };
  refreshBlog(res.data?.slug);
  return { ok: true };
}

/** A one-off signed URL the browser uploads straight to Storage with, so big photos skip the 4.5 MB function body limit. */
export async function createUpload(fileName: string, contentType: string): Promise<{ path: string; token: string; publicUrl: string } | { error: string }> {
  const { admin } = await requireBlogAdmin();
  if (!/^image\//.test(contentType)) return { error: "Only images can be uploaded." };
  const ext = (fileName.split(".").pop() || contentType.split("/")[1] || "png").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5);
  const base = slugify(fileName.replace(/\.[^.]+$/, "")).slice(0, 50) || "image";
  const path = `${new Date().toISOString().slice(0, 7)}/${base}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
  const res = await admin.storage.from("blog").createSignedUploadUrl(path);
  if (res.error) return { error: res.error.message };
  return { path, token: res.data.token, publicUrl: admin.storage.from("blog").getPublicUrl(path).data.publicUrl };
}
