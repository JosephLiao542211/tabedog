// The social card for every post: the cover photo full-bleed under the title when there is one
// (PNG/JPEG; the OG renderer can't decode WebP/AVIF), a plain branded card otherwise.
import { ImageResponse } from "next/og";
import { BLOG, topicName } from "@/lib/blog";
import { getPost } from "@/lib/blog-server";

export const alt = BLOG.name;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

async function coverData(url: string | null | undefined) {
  if (!url) return null;
  try {
    const res = await fetch(url);
    const type = res.headers.get("content-type") ?? "";
    if (!res.ok || !/image\/(png|jpe?g)/.test(type)) return null;
    return `data:${type};base64,${Buffer.from(await res.arrayBuffer()).toString("base64")}`;
  } catch { return null; }
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const post = await getPost((await params).slug);
  const title = post?.title || BLOG.name;
  const cover = await coverData(post?.cover_url);
  const ink = cover ? "#fdfffc" : "#1a1c1a";
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", position: "relative", background: "#fdfffc", fontFamily: "sans-serif" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {cover && <img src={cover} alt="" width={1200} height={630} style={{ position: "absolute", inset: 0, width: 1200, height: 630, objectFit: "cover" }} />}
        {cover && <div style={{ position: "absolute", inset: 0, display: "flex", background: "linear-gradient(180deg, rgba(26,28,26,.2) 0%, rgba(26,28,26,.78) 100%)" }} />}
        <div style={{ position: "relative", display: "flex", flexDirection: "column", justifyContent: "space-between", width: "100%", padding: 72, color: ink }}>
          <div style={{ display: "flex", alignItems: "center", gap: 18, fontSize: 32, fontWeight: 800 }}>
            <div style={{ width: 44, height: 44, borderRadius: 13, background: "#ff6347" }} />
            {BLOG.name}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {post && <div style={{ fontSize: 28, fontWeight: 700, color: cover ? "#ffb4a6" : "#d9472e" }}>{topicName(post.topic)}</div>}
            <div style={{ fontSize: title.length > 60 ? 60 : 76, fontWeight: 800, lineHeight: 1.05, letterSpacing: -2 }}>{title}</div>
            <div style={{ fontSize: 26, color: cover ? "rgba(253,255,252,.8)" : "#6f736f" }}>{post?.author_name || BLOG.defaultAuthor.name}</div>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
