"use client";
// The Pinterest dashboard: connect the account, set the schedule, have the AI make pins from a
// published guide, review and edit them (live image preview), then queue them for posting.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { ACCENTS, LIMITS, TEMPLATES, pinUrl, type Board, type Pin, type PinDesign, type PinterestSettings, type PostPhoto, type Template } from "@/lib/pinterest/design";
import { clearFailed, deletePin, disconnect, generateForPost, newBoard, postNow, queuePins, saveSettings, unqueuePin, updatePin } from "@/app/admin/pinterest/actions";

type PostOption = { id: string; slug: string; title: string; cover_url: string | null; pins: number };
type Account = { username: string; sandbox: boolean; access_expires_at: string; refresh_expires_at: string | null } | null;
type Res = { ok: boolean; error?: string; message?: string };

const TICK_MS = 15 * 60_000;
const when = (d: Date) => d.toLocaleString(undefined, { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
const imgSrc = (p: Pin) => `/api/admin/pinterest/pins/${p.id}/image?v=${encodeURIComponent(p.updated_at)}`;

function nextPost(s: PinterestSettings, queued: number) {
  if (!s.enabled) return "Posting is paused.";
  if (!queued && !s.autopilot) return "On, but nothing is queued.";
  const due = s.last_post_at ? new Date(s.last_post_at).getTime() + (86400_000 / s.pins_per_day) - 5 * 60_000 : Date.now();
  return `Next pin around ${when(new Date(Math.ceil(Math.max(due, Date.now()) / TICK_MS) * TICK_MS))}.`;
}

function Count({ n, max }: { n: number; max: number }) {
  return <span className={`cms-count ${n > max ? "bad" : ""}`}>{n}/{max}</span>;
}

function PinCard({ pin, post, photos, boards, run, pending }: { pin: Pin; post?: PostOption; photos: PostPhoto[]; boards: Board[]; run: (fn: () => Promise<Res>) => void; pending: boolean }) {
  const [p, setP] = useState(pin);
  useEffect(() => setP(pin), [pin]);
  const d = p.design;
  const setD = (patch: Partial<PinDesign>) => setP({ ...p, design: { ...d, ...patch } });
  const dirty = JSON.stringify([p.title, p.description, p.alt_text, p.board_id, p.design]) !== JSON.stringify([pin.title, pin.description, pin.alt_text, pin.board_id, pin.design]);
  const save = () => run(() => updatePin(pin.id, { title: p.title, description: p.description, alt_text: p.alt_text, board_id: p.board_id, board_name: p.board_name, design: p.design }));
  const editable = pin.status !== "posted" && pin.status !== "posting";

  return (
    <li className="pin-card">
      <a href={imgSrc(pin)} target="_blank" rel="noreferrer" className="pin-preview">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imgSrc(pin)} alt={pin.alt_text} loading="lazy" />
        {dirty && <span className="pin-stale">Save to update the image</span>}
      </a>
      <div className="pin-body">
        <p className="cms-hint">
          {post ? <Link href={`/blog/${post.slug}`} target="_blank">{post.title}</Link> : "Post removed"}
          {pin.source === "autopilot" && " · autopilot"}
        </p>
        {pin.error && <p className="cms-error">{pin.error}</p>}
        {editable ? (
          <>
            <label className="cms-field"><span className="cms-label">Title <Count n={p.title.length} max={LIMITS.title} /></span>
              <input className="cms-input" value={p.title} onChange={(e) => setP({ ...p, title: e.target.value })} /></label>
            <label className="cms-field"><span className="cms-label">Description <Count n={p.description.length} max={LIMITS.description} /></span>
              <textarea className="cms-input pin-textarea" rows={4} value={p.description} onChange={(e) => setP({ ...p, description: e.target.value })} /></label>
            <label className="cms-field"><span className="cms-label">Board</span>
              <select className="cms-input" value={p.board_id ?? ""} onChange={(e) => setP({ ...p, board_id: e.target.value || null, board_name: boards.find((b) => b.id === e.target.value)?.name ?? "" })}>
                <option value="">Default board</option>
                {boards.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select></label>
            <details className="cms-advanced">
              <summary>Image text and layout</summary>
              <div className="pin-design">
                <label className="cms-field"><span className="cms-label">Layout</span>
                  <select className="cms-input" value={d.template} onChange={(e) => setD({ template: e.target.value as Template })}>
                    {Object.entries(TEMPLATES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select></label>
                <label className="cms-field"><span className="cms-label">Kicker</span><input className="cms-input" value={d.kicker} onChange={(e) => setD({ kicker: e.target.value })} /></label>
                <label className="cms-field"><span className="cms-label">Headline <Count n={d.headline.length} max={48} /></span><input className="cms-input" value={d.headline} onChange={(e) => setD({ headline: e.target.value })} /></label>
                <label className="cms-field"><span className="cms-label">Subhead</span><input className="cms-input" value={d.subhead} onChange={(e) => setD({ subhead: e.target.value })} /></label>
                <label className="cms-field"><span className="cms-label">List (one per line, up to 5)</span>
                  <textarea className="cms-input pin-textarea" rows={4} value={d.items.join("\n")} onChange={(e) => setD({ items: e.target.value.split("\n").slice(0, 5) })} /></label>
                {photos.length > 0 && (
                  <div className="cms-field"><span className="cms-label">Photo</span>
                    <div className="pin-photos">
                      {photos.map((ph) => (
                        <button key={ph.url} type="button" className={d.photo === ph.url ? "on" : ""} onClick={() => setD({ photo: ph.url, credit: ph.credit })} title={ph.alt}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={ph.url} alt={ph.alt} loading="lazy" />
                        </button>
                      ))}
                    </div></div>
                )}
                <div className="cms-field"><span className="cms-label">Accent</span>
                  <div className="cms-swatches">
                    {ACCENTS.map((c) => <button key={c} type="button" className={`cms-swatch ${d.accent === c ? "on" : ""}`} style={{ background: c }} onClick={() => setD({ accent: c })} aria-label={c} />)}
                  </div></div>
                <label className="cms-field"><span className="cms-label">Alt text <Count n={p.alt_text.length} max={LIMITS.alt} /></span>
                  <textarea className="cms-input pin-textarea" rows={2} value={p.alt_text} onChange={(e) => setP({ ...p, alt_text: e.target.value })} /></label>
              </div>
            </details>
            <div className="cms-row pin-actions">
              {dirty && <button type="button" className="cms-btn-ghost" disabled={pending} onClick={save}>Save</button>}
              {pin.status === "queued"
                ? <button type="button" className="cms-btn-ghost" disabled={pending} onClick={() => run(() => unqueuePin(pin.id))}>Back to review</button>
                : <button type="button" className="cms-btn" disabled={pending || dirty} onClick={() => run(() => queuePins([pin.id]))}>{pin.status === "failed" ? "Retry" : "Approve"}</button>}
              <button type="button" className="cms-btn-ghost" disabled={pending || dirty} onClick={() => run(() => postNow(pin.id))}>Post now</button>
              <button type="button" className="cms-btn-ghost" disabled={pending} onClick={() => run(() => deletePin(pin.id))}>Delete</button>
            </div>
          </>
        ) : (
          <>
            <p className="pin-title">{pin.title}</p>
            <p className="cms-hint">{pin.status === "posting" ? "Posting…" : `Posted ${pin.posted_at ? when(new Date(pin.posted_at)) : ""}${pin.board_name ? ` to ${pin.board_name}` : ""}`}</p>
          </>
        )}
      </div>
    </li>
  );
}

export function PinterestDashboard({ settings, pins, posts, photos, boards, account, configured, sandbox, cronReady, models, notice, preselect }: {
  settings: PinterestSettings; pins: Pin[]; posts: PostOption[]; photos: Record<string, PostPhoto[]>; boards: Board[]; account: Account;
  configured: boolean; sandbox: boolean; cronReady: boolean; models: Record<string, string>; notice: { error: string; connected: boolean }; preselect?: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [err, setErr] = useState(notice.error);
  const [msg, setMsg] = useState(notice.connected ? "Pinterest connected." : "");
  const [postId, setPostId] = useState(preselect && posts.some((p) => p.id === preselect) ? preselect : posts.find((p) => !p.pins)?.id ?? posts[0]?.id ?? "");
  const [count, setCount] = useState("3");
  const [notes, setNotes] = useState("");
  const [perDay, setPerDay] = useState(String(settings.pins_per_day));
  const [boardName, setBoardName] = useState("TabeDog: Where to Eat in Japan");
  const [generating, setGenerating] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  useEffect(() => setPerDay(String(settings.pins_per_day)), [settings.pins_per_day]);

  const run = (fn: () => Promise<Res>) => start(async () => {
    setErr(""); setMsg("");
    const res = await fn();
    if (!res.ok) setErr(res.error ?? "Something went wrong.");
    else if (res.message) setMsg(res.message);
  });
  const generate = () => { setGenerating(true); run(async () => { try { return await generateForPost(postId, Number(count), notes); } finally { setGenerating(false); } }); };
  const forceTick = () => run(async () => {
    const res = await fetch("/api/cron/pinterest?force=1", { method: "POST" });
    if (!res.ok) return { ok: false, error: `Couldn't run (${res.status})` };
    const r = (await res.json()) as { posted: string | null; generated: string[]; error?: string };
    router.refresh();
    if (r.error && !r.posted) return { ok: false, error: r.error };
    return { ok: true, message: [r.generated.length && `Made ${r.generated.length} pins.`, r.posted ? "Posted one pin." : "Nothing queued to post."].filter(Boolean).join(" ") };
  });

  const byPost = new Map(posts.map((p) => [p.id, p]));
  const drafts = pins.filter((p) => p.status === "draft");
  const queued = pins.filter((p) => p.status === "queued");
  const failed = pins.filter((p) => p.status === "failed");
  const posted = pins.filter((p) => p.status === "posted" || p.status === "posting").sort((a, b) => (b.posted_at ?? "").localeCompare(a.posted_at ?? ""));
  const card = (p: Pin) => <PinCard key={p.id} pin={p} post={byPost.get(p.post_id)} photos={photos[p.post_id] ?? []} boards={boards} run={run} pending={pending} />;
  const expiresSoon = account?.refresh_expires_at && new Date(account.refresh_expires_at).getTime() - Date.now() < 14 * 86400_000;

  return (
    <main className="cms-main pinterest">
      <div className="cms-head">
        <h1>Pinterest</h1>
        <div className="cms-row">
          <button type="button" className="cms-btn" disabled={pending || !account || !queued.length} onClick={forceTick}>Post next now</button>
        </div>
      </div>
      <p className="p1 agent-lede">The AI turns published guides into pins: a 1000×1500 image plus a title and description written for Pinterest search, each linking back to the post. Review them here, approve the good ones, and the queue posts {settings.pins_per_day} a day.</p>

      {err && <p className="cms-error">{err}</p>}
      {msg && <p className="cms-ok">{msg}</p>}

      <section className="cms-panel">
        <h2>Account {sandbox && <span className="cms-status sched">Sandbox</span>}</h2>
        {!configured ? (
          <p className="cms-hint warn">Create an app at developers.pinterest.com, add <code>{mounted ? location.origin : ""}/api/admin/pinterest/callback</code> as a redirect URI, then set PINTEREST_APP_ID and PINTEREST_APP_SECRET. Until Pinterest grants Standard access, set PINTEREST_SANDBOX=1: Trial apps can only post to the sandbox.</p>
        ) : !account ? (
          <div className="cms-row"><a className="cms-btn" href="/api/admin/pinterest/connect">Connect Pinterest</a></div>
        ) : (
          <>
            <div className="pin-account">
              <span>Connected{account.username && <> as <b>@{account.username}</b></>}</span>
              <button type="button" className="queue-link" onClick={() => run(disconnect)}>Disconnect</button>
              <a className="queue-link" href="/api/admin/pinterest/connect">Reconnect</a>
            </div>
            {expiresSoon && <p className="cms-hint warn">The login expires {when(new Date(account.refresh_expires_at!))}. It renews whenever a pin posts; otherwise reconnect.</p>}
            <label className="cms-field"><span className="cms-label">Default board</span>
              <select className="cms-input" value={settings.default_board_id ?? ""} onChange={(e) => run(() => saveSettings({ default_board_id: e.target.value, default_board_name: boards.find((b) => b.id === e.target.value)?.name ?? "" }))}>
                <option value="">Choose a board…</option>
                {boards.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                {settings.default_board_id && !boards.some((b) => b.id === settings.default_board_id) && <option value={settings.default_board_id}>{settings.default_board_name || settings.default_board_id}</option>}
              </select></label>
            <form className="cms-row" onSubmit={(e) => { e.preventDefault(); run(() => newBoard(boardName)); }}>
              <input className="cms-input" value={boardName} onChange={(e) => setBoardName(e.target.value)} aria-label="New board name" />
              <button className="cms-btn-ghost" type="submit" disabled={pending}>New board</button>
            </form>
          </>
        )}
      </section>

      <section className="cms-panel queue-settings">
        <h2>Schedule</h2>
        <div className="queue-settings-row">
          <label className="cms-check"><input type="checkbox" checked={settings.enabled} onChange={(e) => run(() => saveSettings({ enabled: e.target.checked }))} /> Post the queue automatically</label>
          <label className="queue-every">
            <input className="cms-input" type="number" min={1} max={25} value={perDay} onChange={(e) => setPerDay(e.target.value)}
              onBlur={() => Number(perDay) !== settings.pins_per_day && run(() => saveSettings({ pins_per_day: Number(perDay) }))}
              onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()} aria-label="Pins per day" />
            pins a day
          </label>
          <select className="cms-input queue-model" value={settings.model} onChange={(e) => run(() => saveSettings({ model: e.target.value }))} aria-label="Model">
            {Object.entries(models).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <label className="cms-check"><input type="checkbox" checked={settings.autopilot} onChange={(e) => run(() => saveSettings({ autopilot: e.target.checked }))} /> Autopilot: make pins for published posts on its own</label>
        {settings.autopilot && (
          <label className="cms-check"><input type="checkbox" checked={settings.auto_approve} onChange={(e) => run(() => saveSettings({ auto_approve: e.target.checked }))} /> Queue autopilot pins without review</label>
        )}
        {settings.autopilot && settings.auto_approve && <p className="cms-hint warn">Pins go out with nobody checking the image text or the photo. Pinterest limits accounts that post lots of near-identical or low-quality pins, so reviewing is safer.</p>}
        <p className="cms-hint">{mounted && <>{nextPost(settings, queued.length)}{settings.last_post_at && ` Last posted ${when(new Date(settings.last_post_at))}.`}</>}&nbsp;</p>
        {!cronReady && <p className="cms-hint warn">CRON_SECRET isn’t set on this server, so the schedule can’t fire. “Post next now” still works.</p>}
      </section>

      <section className="cms-panel">
        <h2>Make pins</h2>
        {posts.length === 0 ? <p className="cms-hint">Publish a post first: every pin links to one.</p> : (
          <>
            <div className="pin-gen">
              <select className="cms-input" value={postId} onChange={(e) => setPostId(e.target.value)} aria-label="Post">
                {posts.map((p) => <option key={p.id} value={p.id}>{p.title}{p.pins ? ` (${p.pins} pin${p.pins === 1 ? "" : "s"})` : ""}</option>)}
              </select>
              <select className="cms-input pin-count" value={count} onChange={(e) => setCount(e.target.value)} aria-label="How many">
                {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n} pin{n === 1 ? "" : "s"}</option>)}
              </select>
            </div>
            <input className="cms-input" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional direction, e.g. lean on the budget angle, or make one about the late-night spots" />
            <div className="cms-row"><button type="button" className="cms-btn" disabled={pending || !postId} onClick={generate}>{generating ? "Writing pins…" : "Generate"}</button></div>
          </>
        )}
      </section>

      <section className="queue-section">
        <p className="cms-label">Needs review <span>{drafts.length}</span>
          {drafts.length > 1 && <button type="button" className="queue-link" disabled={pending} onClick={() => run(() => queuePins(drafts.map((d) => d.id)))}>Approve all</button>}
        </p>
        {drafts.length ? <ul className="pin-grid">{drafts.map(card)}</ul> : <p className="cms-hint">Nothing to review.</p>}
      </section>

      <section className="queue-section">
        <p className="cms-label">Queued <span>{queued.length}, posted in this order</span></p>
        {queued.length ? <ul className="pin-grid">{queued.map(card)}</ul> : <p className="cms-hint">The queue is empty.</p>}
      </section>

      {failed.length > 0 && (
        <section className="queue-section">
          <p className="cms-label">Failed <span>{failed.length}</span> <button type="button" className="queue-link" onClick={() => run(clearFailed)}>Clear</button></p>
          <ul className="pin-grid">{failed.map(card)}</ul>
        </section>
      )}

      {posted.length > 0 && (
        <section className="queue-section">
          <p className="cms-label">Posted <span>{posted.length}</span></p>
          <ul className="cms-list">
            {posted.map((p) => (
              <li key={p.id}>
                <span className="cms-list-main">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imgSrc(p)} alt="" className="pin-thumb" loading="lazy" />
                  <span><span className="cms-list-title">{p.title}</span><span className="sub">{byPost.get(p.post_id)?.title ?? ""}{p.posted_at && ` · ${when(new Date(p.posted_at))}`}</span></span>
                </span>
                {p.pinterest_id && !account?.sandbox && <a href={pinUrl(p.pinterest_id)} target="_blank" rel="noreferrer" className="cms-btn-ghost">View pin</a>}
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
