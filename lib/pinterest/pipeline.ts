// The Pinterest pipeline's tick. pg_cron pings /api/cron/pinterest while a pin is due; each tick:
//   1. reaps pins stuck mid-post (the invocation died),
//   2. on autopilot, tops up the queue by generating pins for the published post with the fewest,
//   3. claims the next queued pin (pinterest_claim, so overlapping ticks can't double-post) and posts it.
import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "../supabase/admin";
import { createPin, getAccount, listBoards } from "./api";
import { generateAndSave } from "./generate";
import { renderPinJpeg } from "./render";
import type { Pin, PinterestSettings } from "./design";

export const MAX_PINS_PER_POST = 9; // autopilot stops adding pins to a post after this many
const MAX_ATTEMPTS = 3;
const STUCK_MS = 10 * 60_000;

export async function getSettings(admin: SupabaseClient): Promise<PinterestSettings> {
  const { data, error } = await admin.from("pinterest_settings").select("*").eq("id", 1).single();
  if (error) throw new Error(error.message);
  return data as PinterestSettings;
}

/** Renders a pin and posts it. The pin must already be marked 'posting'. Failures go back in the queue until MAX_ATTEMPTS. */
export async function postPin(admin: SupabaseClient, pin: Pin, settings: PinterestSettings) {
  const boardId = pin.board_id || settings.default_board_id;
  try {
    if (!boardId) throw new Error("No board: pick a default board on the Pinterest page.");
    const jpeg = await renderPinJpeg(pin.design);
    const res = await createPin(admin, { boardId, title: pin.title, description: pin.description, altText: pin.alt_text, link: pin.link, jpeg });
    await admin.from("pins").update({ status: "posted", pinterest_id: res.id, posted_at: new Date().toISOString(), error: null, board_id: boardId, board_name: pin.board_name || (pin.board_id ? "" : settings.default_board_name) }).eq("id", pin.id);
    return { ok: true as const, pinterestId: res.id };
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    // a bad request won't fix itself; anything else (network, 5xx, rate limit) gets another go later
    const permanent = /: 4(00|01|03|04|22) /.test(error) || error.startsWith("No board");
    await admin.from("pins").update({ status: permanent || pin.attempts >= MAX_ATTEMPTS ? "failed" : "queued", error }).eq("id", pin.id);
    return { ok: false as const, error };
  }
}

async function reapStuck(admin: SupabaseClient) {
  await admin.from("pins")
    .update({ status: "failed", error: "Interrupted while posting. Check Pinterest before retrying: it may have gone through." })
    .eq("status", "posting").lt("updated_at", new Date(Date.now() - STUCK_MS).toISOString());
}

/** The live, indexable post that most needs pins: never pinned first (newest first), then fewest pins. */
async function nextPostToPin(admin: SupabaseClient): Promise<string | null> {
  const [{ data: posts }, { data: pins }] = await Promise.all([
    admin.from("posts").select("id, published_at").eq("status", "published").eq("noindex", false).lte("published_at", new Date().toISOString()).order("published_at", { ascending: false }),
    admin.from("pins").select("post_id"),
  ]);
  const counts = new Map<string, number>();
  for (const p of pins ?? []) counts.set(p.post_id, (counts.get(p.post_id) ?? 0) + 1);
  const pick = (posts ?? [])
    .map((p, i) => ({ id: p.id as string, n: counts.get(p.id) ?? 0, i }))
    .filter((p) => p.n < MAX_PINS_PER_POST)
    .sort((a, b) => a.n - b.n || a.i - b.i)[0];
  return pick?.id ?? null;
}

/** Autopilot: when fewer than two days of pins are waiting (queued or in review), make a few more. */
async function topUp(admin: SupabaseClient, s: PinterestSettings) {
  if (!s.autopilot) return null;
  if (s.last_generate_at && Date.now() - new Date(s.last_generate_at).getTime() < 60 * 60_000) return null;
  const { count } = await admin.from("pins").select("id", { count: "exact", head: true }).in("status", ["draft", "queued"]);
  if ((count ?? 0) >= s.pins_per_day * 2) return null;
  const postId = await nextPostToPin(admin);
  if (!postId) return null;
  await admin.from("pinterest_settings").update({ last_generate_at: new Date().toISOString() }).eq("id", 1);
  const boards = await listBoards(admin).catch(() => []);
  return generateAndSave(admin, postId, { count: 3, model: s.model, boards, defaultBoardId: s.default_board_id, queue: s.auto_approve, source: "autopilot" });
}

export async function tick({ force = false } = {}) {
  const admin = createAdminClient();
  await reapStuck(admin);
  if (!(await getAccount(admin))) return { generated: [], posted: null, error: "Pinterest isn't connected." };
  const settings = await getSettings(admin);

  let generated: string[] = [], error: string | undefined;
  try { generated = (await topUp(admin, settings)) ?? []; } catch (e) { error = `Autopilot: ${e instanceof Error ? e.message : e}`; console.error("[pinterest]", error); }

  const { data, error: claimErr } = await admin.rpc("pinterest_claim", { force });
  if (claimErr) throw new Error(claimErr.message);
  const pin = (data as Pin[])[0];
  if (!pin) return { generated, posted: null, error };
  const res = await postPin(admin, pin, settings);
  return { generated, posted: res.ok ? pin.id : null, error: res.ok ? error : res.error };
}
