// The pin image, rendered from its saved design: the dashboard previews with it. Admin only.
import { blogAdmin } from "@/lib/blog-server";
import type { PinDesign } from "@/lib/pinterest/design";
import { renderPin } from "@/lib/pinterest/render";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const who = await blogAdmin();
  if (!who) return new Response("Not found", { status: 404 });
  const { data } = await who.admin.from("pins").select("design").eq("id", (await params).id).maybeSingle();
  if (!data) return new Response("Not found", { status: 404 });
  const img = await renderPin(data.design as PinDesign);
  img.headers.set("cache-control", "private, max-age=3600"); // the URL carries ?v=updated_at
  return img;
}
