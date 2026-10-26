// Agent runs on the server. A run is a row in blog_agent_runs; executeRun drives the agent in the
// background (inside after()) and saves its UI messages every few seconds, so any number can run at
// once, the dashboard only polls, and closing the tab doesn't kill them. Stopping is a status flip
// the runner notices on its next save. A run that nears the function time limit aborts cleanly and
// hands itself to a fresh invocation, so long research isn't capped at one function's maxDuration.
import "server-only";
import { createAgentUIStream, generateId, readUIMessageStream } from "ai";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "../supabase/admin";
import { emptyPost, slugify } from "../blog";
import { writePost } from "../blog-write";
import { AGENT_MODELS, DEFAULT_MODEL, blogAgent, type AgentModel, type BlogAgentMessage } from "./agent";
import { latestDraft, resolveDraft, type Choice } from "./draft";
import { queueMessage } from "./brief";

export type RunStatus = "running" | "stopping" | "ready" | "stopped" | "error";
export type Run = {
  id: string; label: string; title: string; source: "manual" | "queue"; model: string; status: RunStatus; error: string | null;
  messages: BlogAgentMessage[]; photo_overrides: Record<string, Choice>; post_id: string | null; segments: number; stalls: number;
  heartbeat_at: string; created_at: string; updated_at: string;
};
export const RUN_LIST_COLUMNS = "id, label, title, source, model, status, error, post_id, created_at, updated_at";
export type RunSummary = Pick<Run, "id" | "label" | "title" | "source" | "model" | "status" | "error" | "post_id" | "created_at" | "updated_at">;

export const MAX_DURATION = 300; // Vercel Hobby's ceiling; each route that runs the agent exports this
const BUDGET_MS = (MAX_DURATION - 35) * 1000; // leave time to save and hand off before the platform kills us
const SAVE_EVERY_MS = 2500;
const STALE_MS = 120_000; // no heartbeat for this long = the invocation died
const MAX_SEGMENTS = 6; // hand-offs before giving up: about 30 minutes of agent time
// A hand-off throws away the step in flight, so one step longer than a whole segment (a long draft
// written with lots of thinking) would be retried forever. Each segment that finishes no step retries
// with less thinking; after that it stops and says why.
const STALL_EFFORT = ["high", "medium", "low"] as const;

const finishedSteps = (messages: BlogAgentMessage[]) => messages.reduce((n, m) => n + m.parts.filter((p) => p.type === "step-start").length, 0);

export const pickModel = (m: unknown): AgentModel => (typeof m === "string" && m in AGENT_MODELS ? (m as AgentModel) : DEFAULT_MODEL);

// Postgres jsonb rejects \u0000, and scraped pages occasionally carry one.
const jsonSafe = <T,>(v: T): T => JSON.parse(JSON.stringify(v).replace(/\\u0000/g, ""));

const userMessage = (text: string): BlogAgentMessage => ({ id: generateId(), role: "user", parts: [{ type: "text", text }] });

/**
 * Messages ready to send again after a run that didn't end cleanly (stopped, crashed, timed out): the
 * unfinished last step is dropped (a half-streamed tool call or thinking block would be rejected),
 * and if what's left doesn't end on a tool result, a nudge asks the agent to carry on.
 */
function resumable(messages: BlogAgentMessage[]): BlogAgentMessage[] {
  const out = [...messages];
  const last = out[out.length - 1];
  if (last?.role !== "assistant") return out;
  const cut = last.parts.map((p) => p.type).lastIndexOf("step-start");
  const parts = cut > 0 ? last.parts.slice(0, cut) : [];
  if (parts.length) out[out.length - 1] = { ...last, parts };
  else out.pop();
  const lastStep = parts.slice(parts.map((p) => p.type).lastIndexOf("step-start") + 1);
  // our own tools end on a tool result; Anthropic's web search runs inside the assistant turn, so it doesn't count
  const endsOnTools = lastStep.some((p) => (p.type.startsWith("tool-") || p.type === "dynamic-tool") && !(p as { providerExecuted?: boolean }).providerExecuted);
  if (!endsOnTools) out.push(userMessage("You were interrupted. Continue where you left off."));
  return out;
}

/** Marks runs whose invocation died (no heartbeat) as errors the user can continue. */
export async function reapStale(admin: SupabaseClient) {
  await admin.from("blog_agent_runs")
    .update({ status: "error", error: "Interrupted: the server stopped mid-run. Continue to pick up where it left off." })
    .in("status", ["running", "stopping"]).lt("heartbeat_at", new Date(Date.now() - STALE_MS).toISOString());
}

/** A new run, saved as running; the caller starts executeRun in after(). */
export async function createRun(admin: SupabaseClient, { text, label, model, source = "manual" }: { text: string; label: string; model: AgentModel; source?: Run["source"] }) {
  const res = await admin.from("blog_agent_runs")
    .insert({ label: label.slice(0, 300), model, source, messages: [userMessage(text)], status: "running", segments: 0, heartbeat_at: new Date().toISOString() })
    .select("id").single();
  if (res.error) throw new Error(res.error.message);
  return res.data.id as string;
}

/**
 * Restarts a finished or interrupted run: with a new user message (a revision request), or without
 * one to continue. Returns false if it's already running.
 */
export async function restartRun(admin: SupabaseClient, id: string, { text, model }: { text?: string; model?: AgentModel }) {
  const { data: run } = await admin.from("blog_agent_runs").select("status, messages, model").eq("id", id).maybeSingle();
  if (!run || run.status === "running" || run.status === "stopping") return false;
  let messages = run.status === "ready" ? (run.messages as BlogAgentMessage[]) : resumable(run.messages);
  if (text) {
    if (messages[messages.length - 1]?.role === "user") messages = messages.slice(0, -1); // replace an unanswered nudge
    messages = [...messages, userMessage(text)];
  } else if (run.status === "ready") return false; // nothing to continue
  const res = await admin.from("blog_agent_runs")
    .update({ messages, status: "running", error: null, segments: 0, stalls: 0, model: model ?? run.model, heartbeat_at: new Date().toISOString() })
    .eq("id", id).in("status", ["ready", "stopped", "error"]).select("id");
  return !!res.data?.length;
}

/**
 * Runs the agent on a run row until it finishes, is stopped, or runs out of time. `origin` is this
 * deployment's URL, used to hand off to a fresh invocation when the time budget runs out.
 */
export async function executeRun(id: string, { origin, startedAt = Date.now() }: { origin?: string; startedAt?: number } = {}) {
  const admin = createAdminClient();
  const { data: run, error } = await admin.from("blog_agent_runs").select("*").eq("id", id).single<Run>();
  if (error || run.status !== "running") return;
  await admin.from("blog_agent_runs").update({ segments: run.segments + 1 }).eq("id", id);

  const ac = new AbortController();
  // Locally there's no time limit; on Vercel, stop short of maxDuration so the hand-off can happen.
  const budget = process.env.VERCEL ? setTimeout(() => ac.abort("time"), Math.max(30_000, BUDGET_MS - (Date.now() - startedAt))) : undefined;

  const history = run.messages;
  const continuing = history[history.length - 1]?.role === "assistant" ? history[history.length - 1] : undefined;
  const base = continuing ? history.slice(0, -1) : history;
  let current: BlogAgentMessage | undefined = continuing;
  let dirty = false, saving: Promise<void> = Promise.resolve();
  const snapshot = () => (current ? [...base, current] : base);

  // Saves progress and doubles as the heartbeat; a row no longer 'running' means someone pressed Stop.
  const save = () => (saving = saving.then(async () => {
    const patch: Record<string, unknown> = { heartbeat_at: new Date().toISOString() };
    if (dirty) { patch.messages = jsonSafe(snapshot()); dirty = false; }
    const draft = latestDraft(snapshot());
    if (draft) patch.title = draft.title;
    const res = await admin.from("blog_agent_runs").update(patch).eq("id", id).eq("status", "running").select("id");
    if (!res.error && !res.data?.length) ac.abort("stop");
  }).catch((e) => console.error("[blog-agent] save", id, e)));
  const ticker = setInterval(save, SAVE_EVERY_MS);

  let failure: string | null = null;
  try {
    const stream = await createAgentUIStream({
      agent: blogAgent,
      uiMessages: history,
      options: { model: pickModel(run.model), effort: STALL_EFFORT[Math.min(run.stalls, STALL_EFFORT.length - 1)] },
      abortSignal: ac.signal,
      generateMessageId: generateId,
      onError: (e) => (e instanceof Error ? e.message : String(e)),
    });
    for await (const msg of readUIMessageStream<BlogAgentMessage>({ message: continuing, stream, terminateOnError: true })) {
      current = msg;
      dirty = true;
    }
  } catch (e) {
    if (!ac.signal.aborted) failure = e instanceof Error ? e.message : String(e);
  } finally {
    clearInterval(ticker);
    clearTimeout(budget);
  }
  await saving;

  const messages = jsonSafe(snapshot());
  const title = latestDraft(messages)?.title;
  const reason = ac.signal.aborted ? String(ac.signal.reason) : null;

  if (reason === "time") {
    const next = resumable(messages);
    const stalls = finishedSteps(next) > finishedSteps(history) ? 0 : run.stalls + 1;
    const stuck = stalls >= STALL_EFFORT.length;
    const canHandOff = !!(origin && process.env.CRON_SECRET) && run.segments + 1 < MAX_SEGMENTS && !stuck;
    const err = canHandOff ? null : stuck
      ? "One step kept running past the server's 300-second limit, even with less thinking. Try Sonnet, or ask for a shorter post, then Continue."
      : "Paused at the server time limit. Continue to pick up where it left off.";
    const saved = await admin.from("blog_agent_runs").update({ messages: next, ...(title && { title }), status: canHandOff ? "running" : "error", error: err, stalls, heartbeat_at: new Date().toISOString() }).eq("id", id).eq("status", "running").select("id");
    if (!saved.data?.length) await admin.from("blog_agent_runs").update({ messages, status: "stopped" }).eq("id", id).eq("status", "stopping"); // Stop pressed meanwhile
    else if (canHandOff) {
      const res = await fetch(`${origin}/api/admin/blog-agent/runs/${id}`, {
        method: "POST", headers: { authorization: `Bearer ${process.env.CRON_SECRET}`, "content-type": "application/json" }, body: JSON.stringify({ action: "resume" }),
      }).catch((e: Error) => ({ ok: false, status: 0, statusText: e.message }));
      if (!res.ok) await admin.from("blog_agent_runs").update({ status: "error", error: `Couldn't hand off to a new invocation (${res.status} ${res.statusText}). Continue to resume.` }).eq("id", id);
      else return; // the next invocation finishes the queue bookkeeping
    }
  } else {
    const status: RunStatus = reason === "stop" ? "stopped" : failure ? "error" : "ready";
    await admin.from("blog_agent_runs").update({ messages, ...(title && { title }), status, error: failure }).eq("id", id).in("status", ["running", "stopping"]);
  }
  if (run.source === "queue") await finishQueued(admin, id);
}

// ---------- the queue ----------

export type QueueItem = { id: string; prompt: string; position: number; status: "queued" | "running" | "done" | "failed"; run_id: string | null; error: string | null; started_at: string | null; created_at: string };
export type QueueSettings = { enabled: boolean; interval_hours: number; model: string; auto_publish: boolean; last_run_at: string | null };

/** Claims the next prompt if the queue is due (or `force`) and starts drafting it. Returns the run id, or null. */
export async function startQueued(admin: SupabaseClient, force = false): Promise<string | null> {
  await reapStale(admin);
  const { data, error } = await admin.rpc("blog_queue_claim", { force });
  if (error) throw new Error(error.message);
  const item = (data as QueueItem[])[0];
  if (!item) return null;
  const { data: settings } = await admin.from("blog_queue_settings").select("model").eq("id", 1).single();
  const runId = await createRun(admin, { text: queueMessage(item.prompt), label: item.prompt, model: pickModel(settings?.model), source: "queue" });
  await admin.from("blog_queue").update({ run_id: runId }).eq("id", item.id);
  return runId;
}

/** After a queued run ends: save its draft as a post (published if the queue says so) and close out the queue item. */
async function finishQueued(admin: SupabaseClient, runId: string) {
  const { data: run } = await admin.from("blog_agent_runs").select("status, error, messages, photo_overrides, post_id").eq("id", runId).single();
  if (!run || run.status === "running" || run.status === "stopping") return;
  const done = (patch: Partial<QueueItem>) => admin.from("blog_queue").update(patch).eq("run_id", runId);
  const draft = run.status === "ready" ? latestDraft(run.messages) : null;
  if (!draft) return void (await done({ status: "failed", error: run.error || (run.status === "stopped" ? "Stopped" : "The agent finished without a draft.") }));
  if (run.post_id) return void (await done({ status: "done", error: null }));

  const { data: settings } = await admin.from("blog_queue_settings").select("auto_publish").eq("id", 1).single();
  const { content, cover } = resolveDraft(draft, run.photo_overrides ?? {});
  const post = {
    ...emptyPost(), title: draft.title, excerpt: draft.excerpt, content, topic: draft.topic, tags: draft.tags,
    focus_keyword: draft.focusKeyword, seo_title: draft.seoTitle, cover_url: cover?.url ?? null, cover_alt: cover?.alt ?? "",
    status: settings?.auto_publish ? ("published" as const) : ("draft" as const),
  };
  const slug = slugify(draft.slug || draft.title);
  let res = await writePost(admin, { ...post, slug });
  if (!res.ok && res.error.startsWith("Another post")) res = await writePost(admin, { ...post, slug: `${slug}-${runId.slice(0, 4)}` });
  if (!res.ok) return void (await done({ status: "failed", error: `Couldn't save the post: ${res.error}` }));
  await admin.from("blog_agent_runs").update({ post_id: res.post.id }).eq("id", runId);
  await done({ status: "done", error: null });
}
