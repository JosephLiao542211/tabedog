"use client";
// The post editor: Notion-style title and dek over a rich markdown body, with a sidebar for
// publishing, URL, topic, cover, author and SEO. ⌘S saves; leaving with unsaved changes warns.
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import type { MDXEditorMethods } from "@mdxeditor/editor";
import { BLOG, TOPICS, authorOf, metaDescription, metaTitle, postUrl, readingMinutes, slugify, wordCount, type Post } from "@/lib/blog";
import { seoChecks, seoScore } from "@/lib/blog-seo";
import { SITE } from "@/lib/seo";
import { deletePost, savePost, type PostInput } from "@/app/admin/blog/actions";
import { uploadImage } from "./upload";

const MdEditor = dynamic(() => import("./md-editor"), { ssr: false, loading: () => <div className="cms-md cms-md-loading">Loading editor…</div> });

export const emptyPost = (): PostInput => ({
  id: null, slug: "", title: "", excerpt: "", content: "", topic: TOPICS[0].slug, tags: [], cover_url: null, cover_alt: "",
  author_name: "", author_role: "", author_avatar: null,
  seo_title: "", seo_description: "", focus_keyword: "", canonical_url: null, noindex: false, featured: false, status: "draft", published_at: null,
});

const toInput = ({ created_at: _c, updated_at: _u, ...p }: Post): PostInput => p;
// <input type="datetime-local"> speaks local wall time without a zone
const toLocal = (iso: string | null) => (iso ? new Date(new Date(iso).getTime() - new Date(iso).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "");
const fromLocal = (v: string) => (v ? new Date(v).toISOString() : null);

function Counter({ n, min, max }: { n: number; min: number; max: number }) {
  return <span className={`cms-count ${n === 0 ? "" : n < min || n > max ? "bad" : "good"}`}>{n}/{max}</span>;
}

function ImageField({ label, value, onChange, alt, onAlt }: { label: string; value: string | null; onChange: (v: string | null) => void; alt?: string; onAlt?: (v: string) => void }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const input = useRef<HTMLInputElement>(null);
  async function pick(file?: File) {
    if (!file) return;
    setBusy(true); setErr("");
    try { onChange(await uploadImage(file)); } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  }
  return (
    <div className="cms-field">
      <span className="cms-label">{label}</span>
      <div
        className={`cms-drop${value ? " has" : ""}`}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); pick(e.dataTransfer.files[0]); }}
        onClick={() => !value && input.current?.click()}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {value ? <img src={value} alt="" /> : <span>{busy ? "Uploading…" : "Drop an image or click to upload"}</span>}
      </div>
      <input ref={input} type="file" accept="image/*" hidden onChange={(e) => pick(e.target.files?.[0])} />
      <div className="cms-row">
        <input className="cms-input" placeholder="…or paste an image URL" value={value ?? ""} onChange={(e) => onChange(e.target.value || null)} />
        {value && <button type="button" className="cms-btn-ghost" onClick={() => onChange(null)}>Remove</button>}
        {value && <button type="button" className="cms-btn-ghost" onClick={() => input.current?.click()}>{busy ? "…" : "Replace"}</button>}
      </div>
      {onAlt && <input className="cms-input" placeholder="Alt text: describe the photo" value={alt} onChange={(e) => onAlt(e.target.value)} />}
      {err && <p className="cms-error">{err}</p>}
    </div>
  );
}

export function PostEditor({ initial }: { initial: Post | null }) {
  const router = useRouter();
  const [post, setPost] = useState<PostInput>(() => (initial ? toInput(initial) : emptyPost()));
  const [saved, setSaved] = useState<PostInput>(post);
  const [updatedAt, setUpdatedAt] = useState(initial?.updated_at ?? null);
  const [slugTouched, setSlugTouched] = useState(!!initial);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [pending, start] = useTransition();
  const editor = useRef<MDXEditorMethods>(null);

  const dirty = JSON.stringify(post) !== JSON.stringify(saved);
  const set = useCallback(<K extends keyof PostInput>(k: K, v: PostInput[K]) => setPost((p) => ({ ...p, [k]: v })), []);
  const setTitle = (title: string) => setPost((p) => ({ ...p, title, ...(slugTouched ? {} : { slug: slugify(title) }) }));

  const checks = useMemo(() => seoChecks({ ...post, cover_url: post.cover_url, slug: slugify(post.slug || post.title) }), [post]);
  const score = seoScore(checks);
  const internalLinks = useMemo(() => ["/", "/blog", ...TOPICS.map((t) => `/blog/topic/${t.slug}`)], []);

  const save = useCallback((patch: Partial<PostInput> = {}) => {
    const next = { ...post, ...patch };
    start(async () => {
      const res = await savePost(next);
      if (!res.ok) { setMsg({ kind: "err", text: res.error }); return; }
      const fresh = toInput(res.post);
      setPost(fresh); setSaved(fresh); setUpdatedAt(res.post.updated_at); setSlugTouched(true);
      setMsg({ kind: "ok", text: patch.status === "published" && post.status !== "published" ? "Published" : patch.status === "draft" && post.status === "published" ? "Moved back to drafts" : "Saved" });
      if (!post.id) router.replace(`/admin/blog/${res.post.id}`);
      else router.refresh();
    });
  }, [post, router]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key === "s") { e.preventDefault(); save(); } };
    const onLeave = (e: BeforeUnloadEvent) => { if (dirty) e.preventDefault(); };
    window.addEventListener("keydown", onKey);
    window.addEventListener("beforeunload", onLeave);
    return () => { window.removeEventListener("keydown", onKey); window.removeEventListener("beforeunload", onLeave); };
  }, [save, dirty]);
  useEffect(() => { if (msg?.kind === "ok") { const t = setTimeout(() => setMsg(null), 2500); return () => clearTimeout(t); } }, [msg]);

  const live = post.status === "published";
  const scheduled = live && post.published_at && new Date(post.published_at) > new Date();
  const slug = slugify(post.slug || post.title);
  const serpTitle = metaTitle(post) || "Post title";
  const serpDesc = metaDescription(post) || "Write a dek or meta description to control this snippet.";

  return (
    <div className="cms-editor">
      <div className="cms-bar">
        <Link href="/admin/blog" className="cms-back">← Posts</Link>
        <span className={`cms-status ${live ? (scheduled ? "sched" : "live") : "draft"}`}>{live ? (scheduled ? "Scheduled" : "Published") : "Draft"}</span>
        <span className="cms-saved">{pending ? "Saving…" : dirty ? "Unsaved changes" : updatedAt ? `Saved ${new Date(updatedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}` : "Not saved yet"}</span>
        {msg && <span className={msg.kind === "err" ? "cms-error" : "cms-ok"} role="status">{msg.text}</span>}
        <div className="cms-bar-actions">
          {post.id && <Link href={`/admin/blog/${post.id}/preview`} target="_blank" className="cms-btn-ghost">Preview</Link>}
          {live && post.id && !scheduled && <Link href={postUrl(saved.slug)} target="_blank" className="cms-btn-ghost">View live</Link>}
          {live
            ? <><button type="button" className="cms-btn-ghost" disabled={pending} onClick={() => save({ status: "draft" })}>Unpublish</button><button type="button" className="cms-btn" disabled={pending || !dirty} onClick={() => save()}>Update</button></>
            : <><button type="button" className="cms-btn-ghost" disabled={pending} onClick={() => save()}>Save draft</button><button type="button" className="cms-btn" disabled={pending} onClick={() => save({ status: "published" })}>Publish</button></>}
        </div>
      </div>

      <div className="cms-layout">
        <div className="cms-doc">
          <ImageField label="Cover image" value={post.cover_url} onChange={(v) => set("cover_url", v)} alt={post.cover_alt} onAlt={(v) => set("cover_alt", v)} />
          <textarea className="cms-title" rows={1} placeholder="Untitled" value={post.title} onChange={(e) => setTitle(e.target.value.replace(/\n/g, ""))}
            onInput={(e) => { const t = e.currentTarget; t.style.height = "auto"; t.style.height = `${t.scrollHeight}px`; }} />
          <textarea className="cms-dek" rows={2} placeholder="Add a one or two sentence summary (shown under the title and in search results)" value={post.excerpt} onChange={(e) => set("excerpt", e.target.value.replace(/\n/g, " "))} />
          <MdEditor editorRef={editor} markdown={post.content} onChange={(md) => set("content", md)} internalLinks={internalLinks}
            onReady={(md) => { setPost((p) => ({ ...p, content: md })); setSaved((s) => ({ ...s, content: md })); }} />
          <p className="cms-stats">{wordCount(post.content)} words · {readingMinutes(post.content)} min read</p>
        </div>

        <aside className="cms-side">
          <section className="cms-panel">
            <h2>Publishing</h2>
            <label className="cms-field">
              <span className="cms-label">Publish date</span>
              <input className="cms-input" type="datetime-local" value={toLocal(post.published_at)} onChange={(e) => set("published_at", fromLocal(e.target.value))} />
              <span className="cms-hint">Leave empty to stamp it when you publish. A future date schedules the post.</span>
            </label>
            <label className="cms-field">
              <span className="cms-label">URL</span>
              <div className="cms-slug"><span>/blog/</span><input value={post.slug} placeholder={slugify(post.title) || "post-url"} onChange={(e) => { setSlugTouched(true); set("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-")); }} onBlur={() => set("slug", slugify(post.slug))} /></div>
              {live && saved.slug && slug !== saved.slug && <span className="cms-hint warn">Changing a live URL breaks links to it.</span>}
            </label>
            <label className="cms-field">
              <span className="cms-label">Topic</span>
              <select className="cms-input" value={post.topic} onChange={(e) => set("topic", e.target.value)}>
                {TOPICS.map((t) => <option key={t.slug} value={t.slug}>{t.name}</option>)}
              </select>
            </label>
            <label className="cms-field">
              <span className="cms-label">Tags</span>
              <input className="cms-input" placeholder="ramen, tokyo, budget" defaultValue={post.tags.join(", ")} key={saved.tags.join()} onBlur={(e) => set("tags", e.target.value.split(",").map((t) => t.trim()).filter(Boolean))} />
            </label>
            <label className="cms-check"><input type="checkbox" checked={post.featured} onChange={(e) => set("featured", e.target.checked)} /> Featured</label>
          </section>

          <section className="cms-panel">
            <h2>SEO <span className={`cms-score ${score >= 80 ? "good" : score >= 50 ? "ok" : "bad"}`}>{score}</span></h2>
            <label className="cms-field">
              <span className="cms-label">Focus keyword</span>
              <input className="cms-input" placeholder="best ramen in Tokyo" value={post.focus_keyword} onChange={(e) => set("focus_keyword", e.target.value)} />
            </label>
            <label className="cms-field">
              <span className="cms-label">SEO title <Counter n={metaTitle(post).length} min={30} max={60} /></span>
              <input className="cms-input" placeholder={post.title || "Defaults to the post title"} value={post.seo_title} onChange={(e) => set("seo_title", e.target.value)} />
            </label>
            <label className="cms-field">
              <span className="cms-label">Meta description <Counter n={metaDescription(post).length} min={120} max={160} /></span>
              <textarea className="cms-input" rows={3} placeholder={post.excerpt || "Defaults to the summary, then the first paragraph"} value={post.seo_description} onChange={(e) => set("seo_description", e.target.value)} />
            </label>
            <div className="cms-serp" aria-label="Google preview">
              <span className="cms-serp-url">{SITE.url.replace(/^https?:\/\//, "")} › blog › {slug || "…"}</span>
              <span className="cms-serp-title">{serpTitle.length > 60 ? serpTitle.slice(0, 59) + "…" : serpTitle}</span>
              <span className="cms-serp-desc">{serpDesc}</span>
            </div>
            <ul className="cms-checks">
              {checks.map((c) => (
                <li key={c.id} className={c.ok ? "ok" : "no"} title={c.hint}>
                  <i aria-hidden="true">{c.ok ? "✓" : "•"}</i>
                  <span>{c.label}{!c.ok && <small>{c.hint}</small>}</span>
                </li>
              ))}
            </ul>
            <details className="cms-advanced">
              <summary>Advanced</summary>
              <label className="cms-field">
                <span className="cms-label">Canonical URL</span>
                <input className="cms-input" placeholder="Only if this post was first published elsewhere" value={post.canonical_url ?? ""} onChange={(e) => set("canonical_url", e.target.value || null)} />
              </label>
              <label className="cms-check"><input type="checkbox" checked={post.noindex} onChange={(e) => set("noindex", e.target.checked)} /> Hide from search engines (noindex)</label>
            </details>
          </section>

          <section className="cms-panel">
            <h2>Author</h2>
            <label className="cms-field">
              <span className="cms-label">Name</span>
              <input className="cms-input" value={post.author_name} placeholder={`Pen name: ${authorOf({ ...post, slug, author_name: "" }).name}`} onChange={(e) => set("author_name", e.target.value)} />
              <span className="cms-hint">Leave empty (or as {BLOG.defaultAuthor.name}) for a rotating pen name, picked from the URL.</span>
            </label>
            <label className="cms-field"><span className="cms-label">Role</span><input className="cms-input" value={post.author_role} placeholder={authorOf({ ...post, slug, author_name: "" }).role} onChange={(e) => set("author_role", e.target.value)} /></label>
            <ImageField label="Avatar" value={post.author_avatar} onChange={(v) => set("author_avatar", v)} />
          </section>

          {post.id && (
            <button type="button" className="cms-danger" disabled={pending} onClick={() => {
              if (!window.confirm(`Delete "${post.title || "Untitled"}"? This can't be undone.`)) return;
              start(async () => {
                const res = await deletePost(post.id!);
                if (res.ok) { setSaved(post); router.push("/admin/blog"); } else setMsg({ kind: "err", text: res.error ?? "Delete failed" });
              });
            }}>Delete post</button>
          )}
        </aside>
      </div>
    </div>
  );
}
