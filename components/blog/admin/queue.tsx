"use client";
// The publishing queue: one-line prompts the agent drafts unattended, one every N hours, plus the
// schedule settings and what already ran. Edits save on blur; order is the queue order.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import type { QueueItem, QueueSettings, RunStatus } from "@/lib/blog-agent/runs";
import { addPrompts, clearFinished, editPrompt, movePrompt, removePrompt, requeuePrompt, saveQueueSettings } from "@/app/admin/blog/queue/actions";

export type QueueRow = QueueItem & { run: { title: string; status: RunStatus; post_id: string | null } | null };

const TICK_MS = 15 * 60_000; // pg_cron checks every 15 minutes
const when = (d: Date) => d.toLocaleString(undefined, { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

function nextRun(s: QueueSettings, queued: number) {
  if (!s.enabled) return "Paused. Turn it on to start drafting.";
  if (!queued) return "On, but the queue is empty.";
  const due = s.last_run_at ? new Date(s.last_run_at).getTime() + s.interval_hours * 3600_000 - 5 * 60_000 : Date.now();
  const at = new Date(Math.ceil(Math.max(due, Date.now()) / TICK_MS) * TICK_MS);
  return `Next draft around ${when(at)}.`;
}

function Prompt({ item, n, first, last, run }: { item: QueueRow; n: number; first: boolean; last: boolean; run: (fn: () => Promise<{ ok: boolean; error?: string }>) => void }) {
  const [text, setText] = useState(item.prompt);
  useEffect(() => setText(item.prompt), [item.prompt]);
  return (
    <li className="queue-item">
      <span className="queue-n">{n}</span>
      <input className="cms-input" value={text} onChange={(e) => setText(e.target.value)} aria-label={`Prompt ${n}`}
        onBlur={() => text.trim() !== item.prompt && run(() => editPrompt(item.id, text))}
        onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()} />
      <button type="button" className="cms-btn-ghost queue-icon" disabled={first} onClick={() => run(() => movePrompt(item.id, -1))} aria-label="Move up">↑</button>
      <button type="button" className="cms-btn-ghost queue-icon" disabled={last} onClick={() => run(() => movePrompt(item.id, 1))} aria-label="Move down">↓</button>
      <button type="button" className="cms-btn-ghost queue-icon" onClick={() => run(() => removePrompt(item.id))} aria-label="Remove">×</button>
    </li>
  );
}

export function BlogQueue({ settings, items, models, cronReady }: { settings: QueueSettings; items: QueueRow[]; models: Record<string, string>; cronReady: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [err, setErr] = useState("");
  const [draft, setDraft] = useState("");
  const [hours, setHours] = useState(String(settings.interval_hours));
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  useEffect(() => setHours(String(settings.interval_hours)), [settings.interval_hours]);

  const queued = items.filter((i) => i.status === "queued");
  const running = items.filter((i) => i.status === "running");
  const finished = items.filter((i) => i.status === "done" || i.status === "failed").sort((a, b) => (b.started_at ?? "").localeCompare(a.started_at ?? ""));

  // a running item flips to done or failed on the server; keep the page current while one is going
  useEffect(() => {
    if (!running.length) return;
    const t = setInterval(() => router.refresh(), 10_000);
    return () => clearInterval(t);
  }, [running.length, router]);

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) => start(async () => {
    setErr("");
    const res = await fn();
    if (!res.ok) setErr(res.error ?? "Something went wrong.");
  });
  const add = () => { if (draft.trim()) run(async () => { const r = await addPrompts(draft); if (r.ok) setDraft(""); return r; }); };
  const draftNow = () => run(async () => {
    const res = await fetch("/api/cron/blog-queue?force=1", { method: "POST" });
    if (!res.ok) return { ok: false, error: `Couldn't start (${res.status})` };
    const { started } = await res.json();
    router.refresh();
    return started ? { ok: true } : { ok: false, error: "Nothing queued." };
  });

  return (
    <main className="cms-main queue">
      <div className="cms-head">
        <h1>Queue</h1>
        <div className="cms-row">
          <Link href="/admin/blog/agent" className="cms-btn-ghost">Drafting runs</Link>
          <button type="button" className="cms-btn" disabled={pending || !queued.length} onClick={draftNow}>Draft next now</button>
        </div>
      </div>
      <p className="p1 agent-lede">Line up one-line ideas and the agent researches and writes one on a schedule, top of the list first. Each finished draft is saved as a post{settings.auto_publish ? " and published" : " for you to review"}.</p>

      <section className="cms-panel queue-settings">
        <div className="queue-settings-row">
          <label className="cms-check"><input type="checkbox" checked={settings.enabled} onChange={(e) => run(() => saveQueueSettings({ enabled: e.target.checked }))} /> Draft automatically</label>
          <label className="queue-every">every
            <input className="cms-input" type="number" min={1} max={168} value={hours} onChange={(e) => setHours(e.target.value)}
              onBlur={() => Number(hours) !== settings.interval_hours && run(() => saveQueueSettings({ interval_hours: Number(hours) }))}
              onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()} aria-label="Hours between drafts" />
            hours
          </label>
          <select className="cms-input queue-model" value={settings.model} onChange={(e) => run(() => saveQueueSettings({ model: e.target.value }))} aria-label="Model">
            {Object.entries(models).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <label className="cms-check"><input type="checkbox" checked={settings.auto_publish} onChange={(e) => run(() => saveQueueSettings({ auto_publish: e.target.checked }))} /> Publish finished drafts automatically</label>
        {settings.auto_publish && <p className="cms-hint warn">Published straight away, with nobody checking the facts, photo rights or the agent’s “check before publishing” list. Google treats unreviewed mass-produced posts as spam, which can hurt the whole site. Saving as drafts and publishing the good ones is safer.</p>}
        {/* times are in the viewer's zone and locale, so this line renders after hydration */}
        <p className="cms-hint">{mounted && <>{nextRun(settings, queued.length)}{settings.last_run_at && ` Last started ${when(new Date(settings.last_run_at))}.`}</>}&nbsp;</p>
        {!cronReady && <p className="cms-hint warn">CRON_SECRET isn’t set on this server, so the schedule can’t fire. “Draft next now” still works.</p>}
      </section>

      {err && <p className="cms-error">{err}</p>}

      {running.length > 0 && (
        <section className="queue-section">
          <p className="cms-label">Drafting now</p>
          <ul className="cms-list">
            {running.map((i) => (
              <li key={i.id}>
                <span className="cms-list-main"><span><span className="cms-list-title">{i.run?.title || i.prompt}</span><span className="sub">{i.prompt}</span></span></span>
                <span className="cms-status sched">Working…</span>
                {i.run_id && <Link href={`/admin/blog/agent?run=${i.run_id}`} className="cms-btn-ghost">Watch</Link>}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="queue-section">
        <p className="cms-label">Up next <span>{queued.length} queued</span></p>
        {queued.length > 0 && (
          <ol className="queue-list">
            {queued.map((i, n) => <Prompt key={i.id} item={i} n={n + 1} first={n === 0} last={n === queued.length - 1} run={run} />)}
          </ol>
        )}
        <form className="queue-add" onSubmit={(e) => { e.preventDefault(); add(); }}>
          <textarea className="cms-input" rows={2} value={draft} onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); add(); } }}
            placeholder="e.g. Best late-night ramen in Shinjuku for under ¥1,500. Paste several lines to queue several." />
          <button className="cms-btn" type="submit" disabled={pending || !draft.trim()}>Add</button>
        </form>
      </section>

      {finished.length > 0 && (
        <section className="queue-section">
          <p className="cms-label">History <button type="button" className="queue-link" onClick={() => run(clearFinished)}>Clear</button></p>
          <ul className="cms-list">
            {finished.map((i) => (
              <li key={i.id}>
                <span className="cms-list-main"><span>
                  <span className="cms-list-title">{i.run?.title || i.prompt}</span>
                  <span className="sub">{i.status === "failed" ? i.error : i.prompt}</span>
                </span></span>
                <span className={`cms-status ${i.status === "done" ? "live" : "draft"}`}>{i.status === "done" ? "Saved" : "Failed"}</span>
                {i.run?.post_id && <Link href={`/admin/blog/${i.run.post_id}`} className="cms-btn-ghost">Open post</Link>}
                {i.run_id && <Link href={`/admin/blog/agent?run=${i.run_id}`} className="cms-btn-ghost">Run</Link>}
                {i.status === "failed" && <button type="button" className="cms-btn-ghost" onClick={() => run(() => requeuePrompt(i.id))}>Retry</button>}
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
