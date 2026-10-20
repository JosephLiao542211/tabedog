// Server-side plan lookup for Server Components and Route Handlers.
import type { SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createClient } from "./supabase/server";
import { can, effectivePlan, type Feature, type Plan, type Profile } from "./plan";

/** The user's current plan. Missing profile rows (users from before the plans migration) count as free. */
export async function getPlan(supabase: SupabaseClient, userId: string): Promise<Plan> {
  const { data } = await supabase.from("profiles").select("plan, premium_until").eq("id", userId).maybeSingle();
  const p = data as { plan: Plan; premium_until: string | null } | null;
  const profile: Profile | null = p ? { plan: p.plan, premiumUntil: p.premium_until } : null;
  return effectivePlan(profile);
}

/**
 * For premium-only API routes. Resolves to the signed-in user's id and plan, or to a ready-made
 * 401 / 402 response to return as-is:
 *
 *   const gate = await requireFeature("lists");
 *   if (gate instanceof NextResponse) return gate;
 */
export async function requireFeature(feature: Feature): Promise<{ userId: string; plan: Plan } | NextResponse> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const plan = await getPlan(supabase, user.id);
  if (!can(plan, feature)) return NextResponse.json({ error: "Premium required", feature }, { status: 402 });
  return { userId: user.id, plan };
}
