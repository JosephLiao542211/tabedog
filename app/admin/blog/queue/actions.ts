"use server";
// Publishing queue writes. Every action re-checks the admin before touching the service-role client.
import { revalidatePath } from "next/cache";
import { requireBlogAdmin } from "@/lib/blog-server";
import { pickModel, type QueueSettings } from "@/lib/blog-agent/runs";

type Result = { ok: true } | { ok: false; error: string };
const done = (res: { error: { message: string } | null }): Result => {
  revalidatePath("/admin/blog/queue");
  return res.error ? { ok: false, error: res.error.message } : { ok: true };
};

/** Adds one prompt per non-empty line, after everything already queued. */
export async function addPrompts(text: string): Promise<Result> {
  const { admin } = await requireBlogAdmin();
  const prompts = text.split("\n").map((l) => l.trim()).filter(Boolean).slice(0, 100);
  if (!prompts.length) return { ok: false, error: "Write a prompt first." };
  const { data: last } = await admin.from("blog_queue").select("position").order("position", { ascending: false }).limit(1).maybeSingle();
  const start = (last?.position ?? 0) + 1;
  return done(await admin.from("blog_queue").insert(prompts.map((prompt, i) => ({ prompt, position: start + i }))));
}

export async function editPrompt(id: string, prompt: string): Promise<Result> {
  const { admin } = await requireBlogAdmin();
  if (!prompt.trim()) return { ok: false, error: "A prompt can't be empty. Remove it instead." };
  return done(await admin.from("blog_queue").update({ prompt: prompt.trim() }).eq("id", id).eq("status", "queued"));
}

export async function removePrompt(id: string): Promise<Result> {
  const { admin } = await requireBlogAdmin();
  return done(await admin.from("blog_queue").delete().eq("id", id).neq("status", "running"));
}

/** Swaps a queued prompt with its neighbour above (-1) or below (1). */
export async function movePrompt(id: string, dir: -1 | 1): Promise<Result> {
  const { admin } = await requireBlogAdmin();
  const { data: rows } = await admin.from("blog_queue").select("id, position").eq("status", "queued").order("position").order("created_at");
  const i = rows?.findIndex((r) => r.id === id) ?? -1;
  const j = i + dir;
  if (!rows || i < 0 || j < 0 || j >= rows.length) return { ok: true };
  await admin.from("blog_queue").update({ position: rows[j].position }).eq("id", rows[i].id);
  // equal positions (shouldn't happen) would leave the order to created_at; nudge to keep the swap visible
  return done(await admin.from("blog_queue").update({ position: rows[i].position === rows[j].position ? rows[i].position - dir : rows[i].position }).eq("id", rows[j].id));
}

/** Puts a failed prompt back at the front of the queue. */
export async function requeuePrompt(id: string): Promise<Result> {
  const { admin } = await requireBlogAdmin();
  const { data: first } = await admin.from("blog_queue").select("position").eq("status", "queued").order("position").limit(1).maybeSingle();
  return done(await admin.from("blog_queue").update({ status: "queued", run_id: null, error: null, started_at: null, position: (first?.position ?? 1) - 1 }).eq("id", id).in("status", ["failed", "done"]));
}

export async function clearFinished(): Promise<Result> {
  const { admin } = await requireBlogAdmin();
  return done(await admin.from("blog_queue").delete().in("status", ["done", "failed"]));
}

export async function saveQueueSettings(s: Partial<Omit<QueueSettings, "last_run_at">>): Promise<Result> {
  const { admin } = await requireBlogAdmin();
  const patch: Partial<QueueSettings> = {};
  if (typeof s.enabled === "boolean") patch.enabled = s.enabled;
  if (typeof s.auto_publish === "boolean") patch.auto_publish = s.auto_publish;
  if (s.interval_hours != null) patch.interval_hours = Math.min(168, Math.max(1, Math.round(Number(s.interval_hours) || 4)));
  if (s.model) patch.model = pickModel(s.model);
  return done(await admin.from("blog_queue_settings").update(patch).eq("id", 1));
}
