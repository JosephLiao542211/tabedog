"use server";
// Pinterest dashboard writes. Every action re-checks the admin before touching the service-role client.
import { revalidatePath } from "next/cache";
import { requireBlogAdmin } from "@/lib/blog-server";
import { createBoard, listBoards } from "@/lib/pinterest/api";
import { ACCENTS, LIMITS, TEMPLATES, type Pin, type PinDesign, type PinterestSettings } from "@/lib/pinterest/design";
import { generateAndSave } from "@/lib/pinterest/generate";
import { getSettings, postPin } from "@/lib/pinterest/pipeline";
import { AGENT_MODELS } from "@/lib/blog-agent/agent";

type Result = { ok: true; message?: string } | { ok: false; error: string };
const fail = (e: unknown): Result => ({ ok: false, error: e instanceof Error ? e.message : String(e) });
const done = (res: { error: { message: string } | null }, message?: string): Result => {
  revalidatePath("/admin/pinterest");
  return res.error ? { ok: false, error: res.error.message } : { ok: true, message };
};

export async function generateForPost(postId: string, count: number, notes: string): Promise<Result> {
  const { admin } = await requireBlogAdmin();
  try {
    const s = await getSettings(admin);
    const boards = await listBoards(admin).catch(() => []);
    const ids = await generateAndSave(admin, postId, { count: Math.min(5, Math.max(1, Math.round(count) || 3)), model: s.model, boards, defaultBoardId: s.default_board_id, notes });
    revalidatePath("/admin/pinterest");
    return { ok: true, message: `${ids.length} pin${ids.length === 1 ? "" : "s"} ready for review.` };
  } catch (e) { return fail(e); }
}

export type PinEdit = Pick<Pin, "title" | "description" | "alt_text" | "board_id" | "board_name"> & { design: PinDesign };

export async function updatePin(id: string, p: PinEdit): Promise<Result> {
  const { admin } = await requireBlogAdmin();
  const d = p.design;
  const design: PinDesign = {
    template: d.template in TEMPLATES ? d.template : "photo-top",
    kicker: d.kicker.slice(0, 40), headline: d.headline.slice(0, 90), subhead: d.subhead.slice(0, 120),
    items: d.items.map((s) => s.trim()).filter(Boolean).slice(0, 5).map((s) => s.slice(0, 40)),
    photo: d.photo && /^https:\/\//.test(d.photo) ? d.photo : null, credit: d.credit.slice(0, 90),
    accent: /^#[0-9a-f]{6}$/i.test(d.accent) ? d.accent : ACCENTS[0],
  };
  return done(await admin.from("pins").update({
    title: p.title.slice(0, LIMITS.title), description: p.description.slice(0, LIMITS.description), alt_text: p.alt_text.slice(0, LIMITS.alt),
    board_id: p.board_id || null, board_name: p.board_id ? p.board_name : "", design,
  }).eq("id", id).in("status", ["draft", "queued", "failed"]));
}

/** Drafts (and failed pins) into the queue, after everything already there. */
export async function queuePins(ids: string[]): Promise<Result> {
  const { admin } = await requireBlogAdmin();
  const { data: last } = await admin.from("pins").select("position").eq("status", "queued").order("position", { ascending: false }).limit(1).maybeSingle();
  let pos = (last?.position ?? 0) + 1;
  for (const id of ids) {
    const res = await admin.from("pins").update({ status: "queued", position: pos++, error: null, attempts: 0 }).eq("id", id).in("status", ["draft", "failed"]);
    if (res.error) return done(res);
  }
  return done({ error: null });
}

export async function unqueuePin(id: string): Promise<Result> {
  const { admin } = await requireBlogAdmin();
  return done(await admin.from("pins").update({ status: "draft" }).eq("id", id).eq("status", "queued"));
}

export async function deletePin(id: string): Promise<Result> {
  const { admin } = await requireBlogAdmin();
  return done(await admin.from("pins").delete().eq("id", id).neq("status", "posting"));
}

/** Posts one pin right away, whatever the schedule says. */
export async function postNow(id: string): Promise<Result> {
  const { admin } = await requireBlogAdmin();
  const { data: pin } = await admin.from("pins").update({ status: "posting", attempts: 1, error: null }).eq("id", id).in("status", ["draft", "queued", "failed"]).select("*").maybeSingle();
  if (!pin) return { ok: false, error: "That pin is already posting or posted." };
  const settings = await getSettings(admin);
  const res = await postPin(admin, pin as Pin, settings);
  if (res.ok) await admin.from("pinterest_settings").update({ last_post_at: new Date().toISOString(), last_post_id: pin.post_id }).eq("id", 1);
  revalidatePath("/admin/pinterest");
  return res.ok ? { ok: true, message: "Posted to Pinterest." } : { ok: false, error: res.error };
}

export async function clearFailed(): Promise<Result> {
  const { admin } = await requireBlogAdmin();
  return done(await admin.from("pins").delete().eq("status", "failed"));
}

export async function saveSettings(s: Partial<Omit<PinterestSettings, "last_post_at" | "last_generate_at">>): Promise<Result> {
  const { admin } = await requireBlogAdmin();
  const patch: Record<string, unknown> = {};
  for (const k of ["enabled", "autopilot", "auto_approve"] as const) if (typeof s[k] === "boolean") patch[k] = s[k];
  if (s.pins_per_day != null) patch.pins_per_day = Math.min(25, Math.max(1, Math.round(Number(s.pins_per_day) || 3)));
  if (s.model && s.model in AGENT_MODELS) patch.model = s.model;
  if (s.default_board_id !== undefined) { patch.default_board_id = s.default_board_id || null; patch.default_board_name = s.default_board_name ?? ""; }
  return done(await admin.from("pinterest_settings").update(patch).eq("id", 1));
}

export async function newBoard(name: string): Promise<Result> {
  const { admin } = await requireBlogAdmin();
  if (!name.trim()) return { ok: false, error: "Name the board first." };
  try {
    const b = await createBoard(admin, name.trim().slice(0, 50), "Where and what to eat in Japan, from TabeDog: Tabelog's ratings in English.");
    return done(await admin.from("pinterest_settings").update({ default_board_id: b.id, default_board_name: b.name }).eq("id", 1), `Created “${b.name}”.`);
  } catch (e) { return fail(e); }
}

export async function disconnect(): Promise<Result> {
  const { admin } = await requireBlogAdmin();
  await admin.from("pinterest_settings").update({ enabled: false }).eq("id", 1);
  return done(await admin.from("pinterest_account").delete().eq("id", 1));
}
