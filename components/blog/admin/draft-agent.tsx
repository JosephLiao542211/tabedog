"use client";
// The AI drafting desk: a rail of drafting runs, a brief form, and for the open run the agent's
// research log and a live preview of its draft where any photo can be swapped (search, paste a URL
// or upload) before saving it as a post. Runs execute on the server (lib/blog-agent/runs.ts), so
// several can go at once, leaving the page doesn't stop them, and this page only polls.
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { BLOG, emptyPost, slugify, wordCount, readingMinutes } from "@/lib/blog";
import { POST_TYPES, briefMessage, type Brief } from "@/lib/blog-agent/brief";
import { latestDraft, resolveDraft, credit, type Choice, type SlotPhoto } from "@/lib/blog-agent/draft";
import type { Run, RunSummary, RunStatus } from "@/lib/blog-agent/runs";
import type { Photo } from "@/lib/photos";
import { savePost } from "@/app/admin/blog/actions";
import { PostBody } from "../markdown";
import { uploadImage } from "./upload";

// model output can carry text from scraped pages, so only http(s) links are ever rendered as hrefs
const httpUrl = (u: string) => (/^https?:\/\//i.test(u) ? u : undefined);

const API = "/api/admin/blog-agent/runs";
const live = (s?: RunStatus) => s === "running" || s === "stopping";
async function api<T = { ok: true }>(path: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  const res = await fetch(`${API}${path}`, { ...init, ...(init?.json !== undefined && { body: JSON.stringify(init.json), headers: { "content-type": "application/json" } }) });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `Request failed (${res.status})`);
  return body as T;
}
const ago = (iso: string) => {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  return m < 1 ? "just now" : m < 60 ? `${m}m ago` : m < 1440 ? `${Math.round(m / 60)}h ago` : new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
};
const STATUS: Record<RunStatus, [string, string]> = {
  running: ["Working…", "sched"], stopping: ["Stopping…", "sched"], ready: ["Done", "live"], stopped: ["Stopped", "draft"], error: ["Error", "draft"],
};

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

// ---------- the brief ----------

const LENGTHS = ["Short, about 900 words", "Standard, about 1,500 words", "Long, about 2,500 words"];

function BriefForm({ cities, models, model, setModel, apiKeySet, onStart }: { cities: { slug: string; name: string }[]; models: Record<string, string>; model: string; setModel: (m: string) => void; apiKeySet: boolean; onStart: (id: string) => void }) {
  const [brief, setBrief] = useState<Brief>({ idea: "", type: "", city: "", length: LENGTHS[1] });
  const [err, setErr] = useState("");
  const [starting, setStarting] = useState(false);
  const set = <K extends keyof Brief>(k: K, v: Brief[K]) => setBrief((b) => ({ ...b, [k]: v }));

  async function submit() {
    if (!brief.idea.trim()) return;
    setErr(""); setStarting(true);
    try { onStart((await api<{ id: string }>("", { method: "POST", json: { text: briefMessage(brief), label: brief.idea.trim(), model } })).id); }
    catch (e) { setErr((e as Error).message); setStarting(false); }
  }

  return (
    <main className="cms-main agent-brief">
      <div className="cms-head"><h1>Draft with AI</h1></div>
      <p className="p1 agent-lede">Give it an idea. It researches live Tabelog data (ratings, prices, hours, payment, reviews), checks the web for context, finds photos you can swap, and writes a draft you can edit and publish. Start as many as you like: they run on the server side by side, and keep going if you leave the page.</p>
      {!apiKeySet && <p className="cms-hint warn">ANTHROPIC_API_KEY isn’t set on this server. Add it to .env.local (and the Vercel project’s environment variables) and restart.</p>}
      <form className="agent-form" onSubmit={(e) => { e.preventDefault(); submit(); }}>
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
        {err && <p className="cms-error">{err}</p>}
        <div className="agent-submit">
          <select className="cms-input" value={model} onChange={(e) => setModel(e.target.value)} aria-label="Model">
            {Object.entries(models).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <button className="cms-btn" type="submit" disabled={!brief.idea.trim() || starting}>{starting ? "Starting…" : "Research & draft"}</button>
        </div>
      </form>
    </main>
  );
}

// ---------- one run ----------

function RunView({ run, models, model, setModel, refresh, onDeleted }: { run: Run; models: Record<string, string>; model: string; setModel: (m: string) => void; refresh: () => void; onDeleted: () => void }) {
  const router = useRouter();
  const [over, setOver] = useState<Record<string, Choice>>(run.photo_overrides ?? {});
  const [picking, setPicking] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [err, setErr] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [saving, startSave] = useTransition();
  const busy = live(run.status);
  const messages = run.messages;
  const draft = useMemo(() => latestDraft(messages), [messages]);
  const resolved = useMemo(() => (draft ? resolveDraft(draft, over) : null), [draft, over]);
  const log = useRef<HTMLDivElement>(null);
  useEffect(() => { const el = log.current; if (el && busy && el.scrollHeight - el.scrollTop - el.clientHeight < 200) el.scrollTop = el.scrollHeight; }, [messages, busy]);

  const act = async (fn: () => Promise<unknown>) => { setErr(""); try { await fn(); refresh(); } catch (e) { setErr((e as Error).message); } };
  const send = (text: string) => act(() => api(`/${run.id}`, { method: "POST", json: { action: "send", text, model } }));
  const pick = (slot: string, p: Choice) => {
    const next = { ...over, [slot]: { url: p.url, credit: p.credit, license: p.license, page: p.page, source: p.source } };
    setOver(next); setPicking(null);
    act(() => api(`/${run.id}`, { method: "PATCH", json: { photo_overrides: next } }));
  };

  function save() {
    if (!draft || !resolved) return;
    setErr("");
    startSave(async () => {
      const res = await savePost({
        ...emptyPost(), id: run.post_id, title: draft.title, slug: slugify(draft.slug || draft.title), excerpt: draft.excerpt,
        content: resolved.content, topic: draft.topic, tags: draft.tags, focus_keyword: draft.focusKeyword, seo_title: draft.seoTitle,
        cover_url: resolved.cover?.url ?? null, cover_alt: resolved.cover?.alt ?? "", status: "draft",
      });
      if (!res.ok) { setErr(res.error); return; }
      await api(`/${run.id}`, { method: "PATCH", json: { post_id: res.post.id } }).catch(() => {});
      router.push(`/admin/blog/${res.post.id}`);
    });
  }

  const pickingSlot = draft && picking ? draft.photos.find((p) => p.slot === picking) : null;
  const hasRiskyPhotos = draft?.photos.some((p) => (over[p.slot]?.source ?? p.source) === "brave");
  const [label, tone] = STATUS[run.status];
  const waiting = busy && messages[messages.length - 1]?.role === "user";

  return (
    <div className="cms-editor">
      <div className="cms-bar">
        <span className={`cms-status ${tone}`}>{run.status === "ready" && draft ? "Draft ready" : label}</span>
        {run.source === "queue" && <span className="cms-saved">From the queue</span>}
        {draft && <span className="cms-saved">{wordCount(resolved!.content)} words · {readingMinutes(resolved!.content)} min read</span>}
        <div className="cms-bar-actions">
          {err && <span className="cms-error">{err}</span>}
          {busy && <button type="button" className="cms-btn-ghost" disabled={run.status === "stopping"} onClick={() => act(() => api(`/${run.id}`, { method: "POST", json: { action: "stop" } }))}>Stop</button>}
          {(run.status === "stopped" || run.status === "error") && <button type="button" className="cms-btn-ghost" onClick={() => act(() => api(`/${run.id}`, { method: "POST", json: { action: "continue", model } }))}>Continue</button>}
          <button type="button" className="cms-btn-ghost" onBlur={() => setConfirmDelete(false)}
            onClick={() => (confirmDelete ? act(async () => { await api(`/${run.id}`, { method: "DELETE" }); onDeleted(); }) : setConfirmDelete(true))}>
            {confirmDelete ? "Confirm delete" : "Delete"}
          </button>
          <button type="button" className="cms-btn" disabled={!draft || busy || saving} onClick={save}>{saving ? "Saving…" : run.post_id ? "Update draft & open editor" : "Save as draft & open editor"}</button>
        </div>
      </div>

      <div className="cms-layout">
        <div className="cms-doc">
          {!draft ? (
            <div className="cms-empty"><p className="h2">{busy ? "Researching…" : "No draft yet"}</p><p className="p2">{busy ? "Follow along on the right. A full post usually takes two to five minutes. You can start another draft or leave the page meanwhile." : run.status === "ready" ? "Ask for one in the panel on the right." : "Continue to pick up where it left off."}</p></div>
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
            <div className="agent-log" ref={log}>
              {messages.map((m) => (
                <div key={m.id} className={`agent-msg ${m.role}`}>
                  {m.parts.map((part, i) => {
                    if (part.type === "text") return part.text.trim() ? <p key={i}>{part.text}</p> : null;
                    if (part.type.startsWith("tool-")) return <ToolRow key={i} part={part as unknown as AnyTool} />;
                    return null;
                  })}
                </div>
              ))}
              {waiting && <p className="sub">Thinking…</p>}
              {run.error && <div className="cms-error">{run.error}</div>}
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
        <PhotoPicker slot={pickingSlot} current={{ ...pickingSlot, ...over[pickingSlot.slot] }} onClose={() => setPicking(null)} onPick={(p) => pick(pickingSlot.slot, p)} />
      )}
    </div>
  );
}

// ---------- the page ----------

export function DraftAgent({ cities, models, defaultModel, apiKeySet, initialRun }: { cities: { slug: string; name: string }[]; models: Record<string, string>; defaultModel: string; apiKeySet: boolean; initialRun: string | null }) {
  const [runs, setRuns] = useState<RunSummary[] | null>(null);
  const [selected, setSelected] = useState<string | null>(initialRun);
  const [run, setRun] = useState<Run | null>(null);
  const [listErr, setListErr] = useState("");
  const [model, setModel] = useState(defaultModel);
  const [tick, setTick] = useState(0);
  const refresh = useCallback(() => setTick((t) => t + 1), []);

  const select = useCallback((id: string | null) => {
    setSelected(id);
    setRun((r) => (r?.id === id ? r : null));
    const url = new URL(window.location.href);
    if (id) url.searchParams.set("run", id); else url.searchParams.delete("run");
    window.history.replaceState(null, "", url);
  }, []);

  // the rail: quick while anything is running, lazy otherwise
  const anyLive = runs?.some((r) => live(r.status)) ?? false;
  useEffect(() => {
    let off = false;
    const load = () => api<{ runs: RunSummary[] }>("").then((d) => { if (!off) { setRuns(d.runs); setListErr(""); } }, (e: Error) => !off && setListErr(e.message));
    load();
    const t = setInterval(load, anyLive ? 3000 : 20_000);
    return () => { off = true; clearInterval(t); };
  }, [anyLive, tick]);

  // the open run: every 1.5s while it works, once otherwise
  const openLive = live(run?.status);
  useEffect(() => {
    if (!selected) return;
    let off = false;
    const load = () => api<{ run: Run }>(`/${selected}`).then((d) => { if (!off) setRun(d.run); }, () => { if (!off) select(null); });
    load();
    if (!openLive) return () => { off = true; };
    const t = setInterval(load, 1500);
    return () => { off = true; clearInterval(t); };
  }, [selected, openLive, tick, select]);

  // when the open run finishes, its rail row should catch up straight away
  const prevLive = useRef(openLive);
  useEffect(() => { if (prevLive.current && !openLive) refresh(); prevLive.current = openLive; }, [openLive, refresh]);

  return (
    <div className="agent-shell">
      <nav className="agent-rail" aria-label="Drafting runs">
        <button type="button" className={`agent-run new${selected ? "" : " on"}`} onClick={() => select(null)}>+ New draft</button>
        {listErr && <p className="cms-error">{listErr}</p>}
        {runs === null && !listErr && <p className="sub">Loading…</p>}
        {runs?.map((r) => (
          <button type="button" key={r.id} className={`agent-run${r.id === selected ? " on" : ""}`} onClick={() => select(r.id)} title={r.label}>
            <i aria-hidden="true" className={live(r.status) ? "spin" : r.status === "ready" ? "ok" : r.status === "error" ? "bad" : ""} />
            <span>
              <b>{r.title || r.label || "Untitled"}</b>
              <small>{r.source === "queue" ? "Queue · " : ""}{STATUS[r.status][0]} · {ago(r.created_at)}</small>
            </span>
          </button>
        ))}
      </nav>
      <div className="agent-pane">
        {!selected ? (
          <BriefForm cities={cities} models={models} model={model} setModel={setModel} apiKeySet={apiKeySet} onStart={(id) => { select(id); refresh(); }} />
        ) : !run ? (
          <main className="cms-main"><p className="sub">Loading…</p></main>
        ) : (
          <RunView key={run.id} run={run} models={models} model={model} setModel={setModel} refresh={refresh} onDeleted={() => { select(null); refresh(); }} />
        )}
      </div>
    </div>
  );
}
