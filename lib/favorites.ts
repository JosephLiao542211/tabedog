// Saved places, stored per user in the `favorites` table. Called from the browser; RLS scopes rows to the signed-in user.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Restaurant } from "./types";

export async function listFavorites(supabase: SupabaseClient): Promise<Restaurant[]> {
  const { data, error } = await supabase.from("favorites").select("restaurant_id, data").order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({ ...(row.data as Restaurant), id: row.restaurant_id as string }));
}

export async function addFavorite(supabase: SupabaseClient, userId: string, r: Restaurant) {
  const { distM: _d, open: _o, ...snapshot } = r; // distance and open state depend on when/where you searched
  const { error } = await supabase.from("favorites").upsert({ user_id: userId, restaurant_id: r.id, name: r.name, url: r.url, data: snapshot });
  if (error) throw new Error(error.message);
}

export async function removeFavorite(supabase: SupabaseClient, restaurantId: string) {
  const { error } = await supabase.from("favorites").delete().eq("restaurant_id", restaurantId);
  if (error) throw new Error(error.message);
}
