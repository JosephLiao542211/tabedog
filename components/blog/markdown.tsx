// Renders a post's markdown: GitHub-flavoured (tables, task lists, footnotes, strikethrough),
// linked headings, highlighted code, captioned figures and YouTube embeds. Raw HTML is not
// rendered, so a post can never inject scripts.
import Link from "next/link";
import Markdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeHighlight from "rehype-highlight";
import type { Element, ElementContent } from "hast";
import { SITE } from "@/lib/seo";

const isBlank = (n: ElementContent) => n.type === "text" && !n.value.trim();
const isImg = (n: ElementContent): n is Element => n.type === "element" && n.tagName === "img";

function youtubeId(href: string) {
  const m = href.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{11})/);
  return m?.[1];
}

function Figure({ src, alt, title }: { src: string; alt: string; title?: string }) {
  return (
    <figure className="post-figure">
      {/* eslint-disable-next-line @next/next/no-img-element -- body images can live on any host */}
      <img src={src} alt={alt} loading="lazy" decoding="async" />
      {title && <figcaption>{title}</figcaption>}
    </figure>
  );
}

const components: Components = {
  // a paragraph holding only images becomes figures; one holding only a YouTube link becomes the player
  p({ node, children }) {
    const kids = (node?.children ?? []).filter((n) => !isBlank(n) && !(n.type === "element" && n.tagName === "br"));
    if (kids.length && kids.every(isImg)) {
      const imgs = kids as Element[];
      const figs = imgs.map((n, i) => <Figure key={i} src={String(n.properties.src ?? "")} alt={String(n.properties.alt ?? "")} title={n.properties.title ? String(n.properties.title) : undefined} />);
      return imgs.length > 1 ? <div className="post-gallery">{figs}</div> : figs[0];
    }
    const only = kids.length === 1 ? kids[0] : null;
    if (only?.type === "element" && only.tagName === "a") {
      const href = String(only.properties.href ?? "");
      const id = youtubeId(href);
      const text = only.children.map((c) => (c.type === "text" ? c.value : "")).join("");
      if (id && (text === href || text.startsWith("http"))) {
        return (
          <div className="post-embed">
            <iframe src={`https://www.youtube-nocookie.com/embed/${id}`} title="YouTube video" loading="lazy" allow="accelerometer; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
          </div>
        );
      }
    }
    return <p>{children}</p>;
  },
  // eslint-disable-next-line @next/next/no-img-element
  img: ({ src, alt, title }) => <img src={typeof src === "string" ? src : ""} alt={alt ?? ""} title={title} loading="lazy" decoding="async" />,
  a({ href = "", children, className, id }) {
    const internal = href.startsWith("/") || href.startsWith(SITE.url);
    if (internal && !href.startsWith("/blog/rss")) return <Link href={href.replace(SITE.url, "") || "/"} className={className} id={id}>{children}</Link>;
    if (href.startsWith("#")) return <a href={href} className={className} id={id}>{children}</a>;
    return <a href={href} className={className} id={id} target="_blank" rel="noopener">{children}</a>;
  },
  table: ({ children }) => <div className="post-table"><table>{children}</table></div>,
};

export function PostBody({ markdown }: { markdown: string }) {
  return (
    <div className="post-body">
      <Markdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSlug, [rehypeAutolinkHeadings, { behavior: "wrap", properties: { className: ["post-anchor"] } }], [rehypeHighlight, { detect: false, ignoreMissing: true }]]}
        components={components}
      >
        {markdown}
      </Markdown>
    </div>
  );
}
