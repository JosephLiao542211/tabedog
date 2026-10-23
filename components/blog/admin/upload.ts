"use client";
// Upload an image from the dashboard: the server signs, the browser sends the bytes to Storage.
import { createClient } from "@/lib/supabase/client";
import { createUpload } from "@/app/admin/blog/actions";

export async function uploadImage(file: File): Promise<string> {
  const signed = await createUpload(file.name, file.type);
  if ("error" in signed) throw new Error(signed.error);
  const { error } = await createClient().storage.from("blog").uploadToSignedUrl(signed.path, signed.token, file, { contentType: file.type, cacheControl: "31536000" });
  if (error) throw new Error(error.message);
  return signed.publicUrl;
}
