// Saved places as playlists: a user's lists and the places in them, stored in `lists` + `list_items`.
// Called from the browser; RLS scopes rows to the signed-in user. Every user has exactly one main "Liked" list.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Restaurant } from "./types";

export const LIST_COLORS = [
  { key: "coral", hex: "#ff6347", label: "Coral" },
  { key: "orange", hex: "#f28c28", label: "Orange" },
  { key: "gold", hex: "#dba514", label: "Gold" },
  { key: "lime", hex: "#7cb342", label: "Lime" },
  { key: "green", hex: "#2ea86b", label: "Green" },
  { key: "teal", hex: "#1aa39a", label: "Teal" },
  { key: "sky", hex: "#2f9ee6", label: "Sky" },
  { key: "blue", hex: "#3d6de0", label: "Blue" },
  { key: "violet", hex: "#7a5ae0", label: "Violet" },
  { key: "purple", hex: "#b04ad6", label: "Purple" },
  { key: "pink", hex: "#e8489a", label: "Pink" },
  { key: "slate", hex: "#6b7280", label: "Slate" },
] as const;
export type ListColor = (typeof LIST_COLORS)[number]["key"];
export const colorHex = (key: string): string => LIST_COLORS.find((c) => c.key === key)?.hex ?? LIST_COLORS[0].hex;

export type SavedList = {
  id: string;
  name: string;
  color: ListColor;
  isMain: boolean;
  position: number;
  items: Restaurant[]; // newest first
};

export const MAIN_LIST_NAME = "Liked";
export const MAX_NAME = 60;

type ListRow = { id: string; name: string; color: ListColor; is_main: boolean; position: number };
type ItemRow = { list_id: string; restaurant_id: string; data: Restaurant };

async function fetchLists(supabase: SupabaseClient): Promise<SavedList[]> {
  const [ls, its] = await Promise.all([
    supabase.from("lists").select("id, name, color, is_main, position")
      .order("is_main", { ascending: false }).order("position").order("created_at"),
    supabase.from("list_items").select("list_id, restaurant_id, data").order("created_at", { ascending: false }),
  ]);
  if (ls.error) throw new Error(ls.error.message);
  if (its.error) throw new Error(its.error.message);
  const byList = new Map<string, Restaurant[]>();
  for (const row of (its.data ?? []) as ItemRow[]) {
    const arr = byList.get(row.list_id) ?? [];
    arr.push({ ...row.data, id: row.restaurant_id });
    byList.set(row.list_id, arr);
  }
  return ((ls.data ?? []) as ListRow[]).map((l) => ({
    id: l.id, name: l.name, color: l.color, isMain: l.is_main, position: l.position, items: byList.get(l.id) ?? [],
  }));
}

/** All of the user's lists, creating the main "Liked" list on first use. */
export async function loadLists(supabase: SupabaseClient, userId: string): Promise<SavedList[]> {
  let lists = await fetchLists(supabase);
  if (!lists.some((l) => l.isMain)) {
    const { error } = await supabase.from("lists").insert({ user_id: userId, name: MAIN_LIST_NAME, color: "coral", is_main: true, position: 0 });
    // a concurrent tab may have won the race; the partial unique index guarantees there is exactly one either way
    if (error && !/duplicate|unique/i.test(error.message)) throw new Error(error.message);
    lists = await fetchLists(supabase);
  }
  return lists;
}

export async function createList(supabase: SupabaseClient, userId: string, name: string, color: ListColor, position: number): Promise<SavedList> {
  const { data, error } = await supabase.from("lists")
    .insert({ user_id: userId, name: name.trim().slice(0, MAX_NAME), color, position })
    .select("id, name, color, is_main, position").single();
  if (error) throw new Error(error.message);
  const l = data as ListRow;
  return { id: l.id, name: l.name, color: l.color, isMain: l.is_main, position: l.position, items: [] };
}

export async function updateList(supabase: SupabaseClient, id: string, patch: Partial<Pick<SavedList, "name" | "color" | "position">>) {
  const row: Record<string, unknown> = {};
  if (patch.name !== undefined) row.name = patch.name.trim().slice(0, MAX_NAME);
  if (patch.color !== undefined) row.color = patch.color;
  if (patch.position !== undefined) row.position = patch.position;
  const { error } = await supabase.from("lists").update(row).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteList(supabase: SupabaseClient, id: string) {
  const { error } = await supabase.from("lists").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function addToList(supabase: SupabaseClient, userId: string, listId: string, r: Restaurant) {
  const { distM: _d, open: _o, ...snapshot } = r; // distance and open state depend on when/where you searched
  const { error } = await supabase.from("list_items").upsert({ list_id: listId, user_id: userId, restaurant_id: r.id, name: r.name, url: r.url, data: snapshot });
  if (error) throw new Error(error.message);
}

export async function removeFromList(supabase: SupabaseClient, listId: string, restaurantId: string) {
  const { error } = await supabase.from("list_items").delete().eq("list_id", listId).eq("restaurant_id", restaurantId);
  if (error) throw new Error(error.message);
}

/** Pick a colour no existing list uses yet, cycling through the palette once they're all taken. */
export function nextColor(lists: SavedList[]): ListColor {
  const used = new Set(lists.map((l) => l.color));
  return LIST_COLORS.find((c) => !used.has(c.key))?.key ?? LIST_COLORS[lists.length % LIST_COLORS.length].key;
}
