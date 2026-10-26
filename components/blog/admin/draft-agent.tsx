"use client";
// The AI drafting desk: a brief form, the agent's research log, and a live preview of its draft
// where any photo can be swapped (search, paste a URL or upload) before saving it as a post.
// The session (messages and photo swaps) survives a reload in localStorage until "New draft".
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { BLOG, slugify, wordCount, readingMinutes } from "@/lib/blog";
import { POST_TYPES, briefMessage, type Brief } from "@/lib/blog-agent/brief";
import type { BlogAgentMessage } from "@/lib/blog-agent/agent";
import type { Draft } from "@/lib/blog-agent/tools";
import type { Photo } from "@/lib/photos";
import { savePost } from "@/app/admin/blog/actions";
import { PostBody } from "../markdown";
import { emptyPost } from "./post-editor";
import { uploadImage } from "./upload";

type SlotPhoto = Draft["photos"][number];
type Choice = Pick<SlotPhoto, "url" | "credit" | "license" | "page" | "source">;

const STORE = "tabedog:blog-agent:v1";
const load = () => { try { return JSON.parse(localStorage.getItem(STORE) || "null"); } catch { return null; } };
const store = (v: unknown) => { try { localStorage.setItem(STORE, JSON.stringify(v)); } catch { /* private mode */ } };

const credit = (p: Choice) => (p.source === "tabelog" ? "Photo: Tabelog" : `Photo: ${p.credit || "unknown"}${p.license ? `, ${p.license}` : ""}`);
// model output can carry text from scraped pages, so only http(s) links are ever rendered as hrefs
const httpUrl = (u: string) => (/^https?:\/\//i.test(u) ? u : undefined);
const safeUrl = (u: string) => u.replace(/ /g, "%20").replace(/\(/g, "%28").replace(/\)/g, "%29");

/** The draft's markdown with photo:slot placeholders turned into images captioned with their credit. */
function resolve(d: Draft, over: Record<string, Choice>) {
  const photo = (slot: string) => { const base = d.photos.find((p) => p.slot === slot); return base ? { ...base, ...over[slot] } : null; };
  const content = d.content.replace(/!\[([^\]]*)\]\(photo:([\w-]+)(?:\s+"[^"]*")?\)/g, (_, alt: string, slot: string) => {
    const p = slot === d.coverSlot ? null : photo(slot); // the cover already sits above the post
    if (!p) return "";
    const caption = [p.caption, credit(p)].filter(Boolean).join(" · ").replace(/"/g, "'");
    return `![${(alt || p.alt).replace(/[[\]]/g, "")}](${safeUrl(p.url)} "${caption}")`;
  });
  return { content, cover: photo(d.coverSlot) };
}

function latestDraft(messages: BlogAgentMessage[]): Draft | null {
  for (let i = messages.length - 1; i >= 0; i--)
    for (let j = messages[i].parts.length - 1; j >= 0; j--) {
      const p = messages[i].parts[j];
      if (p.type === "tool-presentDraft" && p.state === "output-available") return p.input as Draft;
    }
  return null;
}

// ---------- research log ----------

type AnyTool = { type: string; state: string; input?: Record<string, unknown>; output?: Record<string, unknown>; errorText?: string };

function toolLabel(name: string, i: Record<string, unknown> = {}) {
  const s = (v: unknown) => (typeof v === "string" ? v : Array.isArray(v) ? v.join(", ") : "");
  switch (name) {
    case "searchTabelog": return `Tabelog search: ${s(i.cuisine) || "restaurants"} near ${s(i.near) || s(i.city) || "…"}`;
    case "tabelogRanking": return `Tabelog ranking: ${s(i.cuisine) || "all"} in ${s(i.city)}`;
    case "findRestaurant": return `Finding “${s(i.name)}” on Tabelog`;
    case "restaurantProfile": return `Restaurant page ${s(i.url).match(/(\d+)\/$/)?.[1] ?? ""}`;
    case "restaurantReviews": return `Reviews ${s(i.url).match(/(\d+)\/$/)?.[1] ?? ""}`;
    case "findPhotos": return `Photos: ${s(i.query)}`;
    case "web_search": return `Web search: ${s(i.query) || s(i.queries)}`;
    case "listBlogPosts": return "Reading our published posts";
    case "presentDraft": return `Draft: ${s(i.title)}`;
    default: return name;
  }
}

function toolResult(name: string, o: Record<string, unknown> = {}) {
  if (o.error) return String(o.error);
  const n = (k: string) => (Array.isArray(o[k]) ? (o[k] as unknown[]).length : 0);
  switch (name) {
    case "searchTabelog": case "tabelogRanking": case "findRestaurant": return `${n("results")} restaurants`;
    case "restaurantProfile": return `${o.name} · ${o.rating ?? "no rating"} (${o.reviews} reviews)${o.closed ? " · CLOSED" : ""}`;
    case "restaurantReviews": return `${n("reviews")} reviews`;
    case "findPhotos": return `${n("photos")} photos`;
    case "listBlogPosts": return `${n("posts")} posts`;
    case "presentDraft": return o.ok ? `ready${n("seoNotPassing") ? ` · ${n("seoNotPassing")} SEO checks to improve` : ""}` : `${n("problems")} problems to fix`;
    default: return "done";
  }
}

function ToolRow({ part }: { part: AnyTool }) {
  const name = part.type.slice(5);
  const done = part.state === "output-available", failed = part.state === "output-error";
  return (
    <details className={`agent-tool${failed ? " bad" : ""}`}>
      <summary>
        <i aria-hidden="true" className={done ? "ok" : failed ? "bad" : "spin"} />
        <span>{toolLabel(name, part.input)}</span>
        {done && <small>{toolResult(name, part.output)}</small>}
        {failed && <small>{part.errorText}</small>}
      </summary>
      {done && name !== "presentDraft" && <pre>{JSON.stringify(part.output, null, 1).slice(0, 6000)}</pre>}
      {done && name === "presentDraft" && <pre>{JSON.stringify(part.output, null, 1)}</pre>}
    </details>
  );
}

// ---------- photo picker ----------

function PhotoPicker({ slot, current, onPick, onClose }: { slot: SlotPhoto; current: Choice; onPick: (p: Choice) => void; onClose: () => void }) {
  const [q, setQ] = useState(slot.query);
  const [photos, setPhotos] = useState<Photo[] | null>(null);
  const [err, setErr] = useState("");
  const [paste, setPaste] = useState("");
  const [busy, setBusy] = useState(false);
  const file = useRef<HTMLInputElement>(null);

  async function find(query: string) {
    setPhotos(null); setErr("");
    try {
      const res = await fetch(`/api/admin/photos?${new URLSearchParams({ q: query, restaurant: slot.restaurantUrl ?? "" })}`);
      if (!res.ok) throw new Error(`Photo search failed (${res.status})`);
      setPhotos((await res.json()).photos);
    } catch (e) { setErr((e as Error).message); setPhotos([]); }
  }
  useEffect(() => { find(slot.query); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function upload(f?: File) {
    if (!f) return;
    setBusy(true); setErr("");
    try { onPick({ url: await uploadImage(f), credit: BLOG.defaultAuthor.name, license: "", page: "", source: "openverse" }); }
    catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  }

  return (
    <div className="agent-modal" role="dialog" aria-modal="true" aria-label={`Choose a photo for ${slot.slot}`} onClick={onClose}>
      <div className="agent-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="agent-modal-head">
          <div><p className="h2">Swap photo: {slot.slot}</p><p className="sub">{slot.alt}</p></div>
          <button type="button" className="cms-btn-ghost" onClick={onClose}>Close</button>
        </div>
        <form className="cms-row" onSubmit={(e) => { e.preventDefault(); find(q); }}>
          <input className="cms-input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search photos" />
          <button className="cms-btn" type="submit">Search</button>
        </form>
        <div className="agent-grid">
          {photos === null ? <p className="sub">Searching…</p> : photos.length === 0 ? <p className="sub">Nothing found. Try another search.</p> : photos.map((p) => (
            <button type="button" key={p.url} className={`agent-cand${p.url === current.url ? " on" : ""}`} onClick={() => onPick(p)} title={`${p.title}\n${p.credit} · ${p.license}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.thumb} alt={p.title} loading="lazy"
                onError={(e) => { const img = e.currentTarget; if (img.src !== p.url) img.src = p.url; else img.parentElement!.hidden = true; }} />
              <span className={`agent-src ${p.source}`}>{p.source}</span>
              <small>{p.license}</small>
            </button>
          ))}
        </div>
        <div className="cms-row">
          <input className="cms-input" value={paste} onChange={(e) => setPaste(e.target.value)} placeholder="…or paste an image URL" />
          <button type="button" className="cms-btn-ghost" disabled={!/^https?:\/\//.test(paste)} onClick={() => onPick({ url: paste.trim(), credit: "", license: "", page: paste.trim(), source: "brave" })}>Use URL</button>
          <button type="button" className="cms-btn-ghost" onClick={() => file.current?.click()}>{busy ? "Uploading…" : "Upload"}</button>
          <input ref={file} type="file" accept="image/*" hidden onChange={(e) => upload(e.target.files?.[0])} />
        </div>
        {err && <p className="cms-error">{err}</p>}
        <p className="sub">Tabelog photos are reviewers’ uploads; Openverse and Wikimedia are Creative Commons (credit shown in the caption); web results need rights cleared before you publish.</p>
      </div>
    </div>
  );
}

// ---------- the page ----------

const LENGTHS = ["Short, about 900 words", "Standard, about 1,500 words", "Long, about 2,500 words"];

export function DraftAgent({ cities, models, defaultModel, apiKeySet }: { cities: { slug: string; name: string }[]; models: Record<string, string>; defaultModel: string; apiKeySet: boolean }) {
  const router = useRouter();
  const [brief, setBrief] = useState<Brief>({ idea: "", type: "", city: "", length: LENGTHS[1] });
  const [model, setModel] = useState(defaultModel);
  const [over, setOver] = useState<Record<string, Choice>>({});
  const [picking, setPicking] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [postId, setPostId] = useState<string | null>(null);
  const [saveErr, setSaveErr] = useState("");
  const [saving, startSave] = useTransition();
  const restored = useRef(false);

  const { messages, setMessages, sendMessage, status, stop, error, regenerate } = useChat<BlogAgentMessage>({
    transport: useMemo(() => new DefaultChatTransport({ api: "/api/admin/blog-agent" }), []),
  });
  const busy = status === "submitted" || status === "streaming";

  // restore the last session once, then keep it saved
  useEffect(() => {
    const s = load();
    if (s?.messages?.length) { setMessages(s.messages); setOver(s.over ?? {}); setPostId(s.postId ?? null); if (s.model) setModel(s.model); }
    restored.current = true;
  }, [setMessages]);
  useEffect(() => { if (restored.current && !busy) store({ messages, over, postId, model }); }, [messages, over, postId, model, busy]);

  const draft = useMemo(() => latestDraft(messages), [messages]);
  const resolved = useMemo(() => (draft ? resolve(draft, over) : null), [draft, over]);
  const send = (text: string) => sendMessage({ text }, { body: { model } });
  const reset = () => { if (busy) stop(); setMessages([]); setOver({}); setPostId(null); setSaveErr(""); store(null); };
  const set = <K extends keyof Brief>(k: K, v: Brief[K]) => setBrief((b) => ({ ...b, [k]: v }));

  function save() {
    if (!draft || !resolved) return;
    setSaveErr("");
    startSave(async () => {
      const res = await savePost({
        ...emptyPost(), id: postId, title: draft.title, slug: slugify(draft.slug || draft.title), excerpt: draft.excerpt,
        content: resolved.content, topic: draft.topic, tags: draft.tags, focus_keyword: draft.focusKeyword, seo_title: draft.seoTitle,
        cover_url: resolved.cover?.url ?? null, cover_alt: resolved.cover?.alt ?? "", status: "draft",
      });
      if (!res.ok) { setSaveErr(res.error); return; }
      setPostId(res.post.id);
      store({ messages, over, postId: res.post.id, model });
      router.push(`/admin/blog/${res.post.id}`);
    });
  }

  if (!messages.length) {
    return (
      <main className="cms-main agent-brief">
        <div className="cms-head"><h1>Draft with AI</h1></div>
        <p className="p1 agent-lede">Give it an idea. It researches live Tabelog data (ratings, prices, hours, payment, reviews), checks the web for context, finds photos you can swap, and writes a draft you can edit and publish.</p>
        {!apiKeySet && <p className="cms-hint warn">ANTHROPIC_API_KEY isn’t set on this server. Add it to .env.local (and the Vercel project’s environment variables) and restart.</p>}
        <form className="agent-form" onSubmit={(e) => { e.preventDefault(); if (brief.idea.trim()) send(briefMessage(brief)); }}>
          <label className="cms-field">
            <span className="cms-label">Idea</span>
            <textarea className="cms-input" rows={4} required autoFocus value={brief.idea} onChange={(e) => set("idea", e.target.value)}
              placeholder="e.g. The best tsukemen in Tokyo for first-timers, with a section on how to order from a ticket machine" />
          </label>
          <div className="agent-cols">
            <label className="cms-field"><span className="cms-label">Post type</span>
              <select className="cms-input" value={brief.type} onChange={(e) => set("type", e.target.value as Brief["type"])}>
                <option value="">Let the agent decide</option>
                {Object.entries(POST_TYPES).map(([k, v]) => <option key={k} value={k}>{v.split(":")[0]}</option>)}
              </select>
            </label>
            <label className="cms-field"><span className="cms-label">City</span>
              <select className="cms-input" value={brief.city} onChange={(e) => set("city", e.target.value)}>
                <option value="">Any / from the idea</option>
                {cities.map((c) => <option key={c.slug} value={c.name}>{c.name}</option>)}
              </select>
            </label>
            <label className="cms-field"><span className="cms-label">Neighborhood or station</span><input className="cms-input" value={brief.area ?? ""} onChange={(e) => set("area", e.target.value)} placeholder="Shinjuku, Nishiki Market…" /></label>
            <label className="cms-field"><span className="cms-label">Cuisine or dish</span><input className="cms-input" value={brief.cuisine ?? ""} onChange={(e) => set("cuisine", e.target.value)} placeholder="tsukemen" /></label>
            <label className="cms-field"><span className="cms-label">How many places</span><input className="cms-input" value={brief.count ?? ""} onChange={(e) => set("count", e.target.value)} placeholder="7" /></label>
            <label className="cms-field"><span className="cms-label">Budget</span><input className="cms-input" value={brief.budget ?? ""} onChange={(e) => set("budget", e.target.value)} placeholder="under ¥2,000" /></label>
            <label className="cms-field"><span className="cms-label">Focus keyword</span><input className="cms-input" value={brief.keyword ?? ""} onChange={(e) => set("keyword", e.target.value)} placeholder="best tsukemen tokyo" /></label>
            <label className="cms-field"><span className="cms-label">Length</span>
              <select className="cms-input" value={brief.length} onChange={(e) => set("length", e.target.value)}>{LENGTHS.map((l) => <option key={l}>{l}</option>)}</select>
            </label>
          </div>
          <label className="cms-field"><span className="cms-label">Must include (names or Tabelog URLs)</span><input className="cms-input" value={brief.mustInclude ?? ""} onChange={(e) => set("mustInclude", e.target.value)} placeholder="Fuunji, Rokurinsha" /></label>
          <label className="cms-field">
            <span className="cms-label">Your notes and experiences</span>
            <textarea className="cms-input" rows={4} value={brief.notes ?? ""} onChange={(e) => set("notes", e.target.value)} placeholder="Anything first-hand: what you ordered, the queue, a tip. The agent will never invent experiences, so this is how your voice gets in." />
          </label>
          <div className="agent-submit">
            <select className="cms-input" value={model} onChange={(e) => setModel(e.target.value)} aria-label="Model">
              {Object.entries(models).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <button className="cms-btn" type="submit" disabled={!brief.idea.trim()}>Research &amp; draft</button>
          </div>
        </form>
      </main>
    );
  }

  const pickingSlot = draft && picking ? draft.photos.find((p) => p.slot === picking) : null;
  const hasRiskyPhotos = draft?.photos.some((p) => (over[p.slot]?.source ?? p.source) === "brave");

  return (
    <div className="cms-editor">
      <div className="cms-bar">
        <span className="cms-back" role="button" tabIndex={0} onClick={reset} onKeyDown={(e) => e.key === "Enter" && reset()}>← New draft</span>
        <span className={`cms-status ${busy ? "sched" : draft ? "live" : "draft"}`}>{busy ? "Working…" : draft ? "Draft ready" : status === "error" ? "Stopped" : "Idle"}</span>
        {draft && <span className="cms-saved">{wordCount(resolved!.content)} words · {readingMinutes(resolved!.content)} min read</span>}
        <div className="cms-bar-actions">
          {busy && <button type="button" className="cms-btn-ghost" onClick={() => stop()}>Stop</button>}
          {saveErr && <span className="cms-error">{saveErr}</span>}
          <button type="button" className="cms-btn" disabled={!draft || busy || saving} onClick={save}>{saving ? "Saving…" : postId ? "Update draft & open editor" : "Save as draft & open editor"}</button>
        </div>
      </div>

      <div className="cms-layout">
        <div className="cms-doc">
          {!draft ? (
            <div className="cms-empty"><p className="h2">{busy ? "Researching…" : "No draft yet"}</p><p className="p2">{busy ? "Follow along on the right. A full post usually takes two to five minutes." : "Ask for one in the panel on the right."}</p></div>
          ) : (
            <>
              <section className="agent-photos" aria-label="Photos">
                <p className="cms-label">Photos · click to swap</p>
                <div className="agent-strip">
                  {draft.photos.map((p) => {
                    const cur = { ...p, ...over[p.slot] };
                    return (
                      <button type="button" key={p.slot} className="agent-slot" onClick={() => setPicking(p.slot)} title={`${p.alt}\n${credit(cur)}`}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={cur.url} alt={p.alt} />
                        <span>{p.slot === draft.coverSlot ? "Cover" : p.slot}</span>
                        <span className={`agent-src ${cur.source}`}>{cur.source}</span>
                      </button>
                    );
                  })}
                </div>
                {hasRiskyPhotos && <p className="cms-hint warn">Some photos come from general web search: clear the rights or swap them before publishing.</p>}
              </section>
              {resolved?.cover && (
                // eslint-disable-next-line @next/next/no-img-element
                <img className="agent-cover" src={resolved.cover.url} alt={resolved.cover.alt} onClick={() => setPicking(draft.coverSlot)} />
              )}
              <h1 className="cms-title agent-title">{draft.title}</h1>
              <p className="cms-dek">{draft.excerpt}</p>
              <PostBody markdown={resolved!.content} />
              {(draft.verify.length > 0 || draft.sources.length > 0) && (
                <section className="cms-panel agent-verify">
                  {draft.verify.length > 0 && <><h2>Check before publishing</h2><ul>{draft.verify.map((v, i) => <li key={i}>{v}</li>)}</ul></>}
                  {draft.sources.length > 0 && <><h2>Sources</h2><ul>{draft.sources.map((s, i) => <li key={i}><a href={httpUrl(s.url)} target="_blank" rel="noopener noreferrer">{s.title}</a></li>)}</ul></>}
                  <h2>Tabelog listings used</h2>
                  <ul>{draft.restaurants.map((r) => <li key={r.url}><a href={httpUrl(r.url)} target="_blank" rel="noopener noreferrer">{r.name}</a>{r.rating != null && ` · ${r.rating}`}</li>)}</ul>
                </section>
              )}
            </>
          )}
        </div>

        <aside className="cms-side agent-side">
          <section className="cms-panel">
            <h2>Agent</h2>
            <div className="agent-log">
              {messages.map((m) => (
                <div key={m.id} className={`agent-msg ${m.role}`}>
                  {m.parts.map((part, i) => {
                    if (part.type === "text") return part.text.trim() ? <p key={i}>{part.text}</p> : null;
                    if (part.type.startsWith("tool-")) return <ToolRow key={i} part={part as unknown as AnyTool} />;
                    return null;
                  })}
                </div>
              ))}
              {status === "submitted" && <p className="sub">Thinking…</p>}
              {error && <div className="cms-error">Something went wrong: {error.message} <button type="button" className="cms-btn-ghost" onClick={() => regenerate({ body: { model } })}>Retry</button></div>}
            </div>
            <form className="agent-reply" onSubmit={(e) => { e.preventDefault(); if (input.trim() && !busy) { send(input); setInput(""); } }}>
              <textarea className="cms-input" rows={3} value={input} onChange={(e) => setInput(e.target.value)} disabled={busy}
                onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) e.currentTarget.form?.requestSubmit(); }}
                placeholder={draft ? "Ask for changes: “make it shorter”, “swap #4 for a cash-friendly spot”, “add an FAQ on reservations”" : "Tell the agent what to do"} />
              <div className="cms-row">
                <select className="cms-input" value={model} onChange={(e) => setModel(e.target.value)} aria-label="Model">
                  {Object.entries(models).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
                <button className="cms-btn" type="submit" disabled={busy || !input.trim()}>Send</button>
              </div>
            </form>
          </section>
        </aside>
      </div>

      {pickingSlot && (
        <PhotoPicker slot={pickingSlot} current={{ ...pickingSlot, ...over[pickingSlot.slot] }} onClose={() => setPicking(null)}
          onPick={(p) => { setOver((o) => ({ ...o, [pickingSlot.slot]: { url: p.url, credit: p.credit, license: p.license, page: p.page, source: p.source } })); setPicking(null); }} />
      )}
    </div>
  );
}
