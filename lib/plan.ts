// Free vs premium: the one place that says which plan a user is on and what each plan unlocks.
// Safe to import from both server and client code (no Supabase, no React).
//
// To make a new feature premium-only: add a key to `Feature`, describe it in PREMIUM_FEATURES,
// then guard the UI with `can(plan, "thing")` and, where there is a table behind it, guard the
// write policies with `public.is_premium(auth.uid())` in a migration (see 20261020000000_plans.sql).

export type Plan = "free" | "premium";

export type Feature = "lists";

export const PREMIUM_FEATURES: Record<Feature, { title: string; blurb: string }> = {
  lists: { title: "Saved lists", blurb: "Like places and sort them into colour-coded lists that follow you on the map." },
};

export const PLAN_LABEL: Record<Plan, string> = { free: "Free", premium: "Premium" };

export type Profile = { plan: Plan; premiumUntil: string | null };

/** Resolves a stored profile to the plan in force right now (an expired premium is free). */
export function effectivePlan(p: Profile | null | undefined): Plan {
  if (!p || p.plan !== "premium") return "free";
  if (p.premiumUntil && new Date(p.premiumUntil).getTime() <= Date.now()) return "free";
  return "premium";
}

export const isPremium = (plan: Plan) => plan === "premium";

/** Whether `plan` may use `feature`. Every feature listed in PREMIUM_FEATURES needs premium. */
export function can(plan: Plan, feature: Feature): boolean {
  return isPremium(plan) || !(feature in PREMIUM_FEATURES);
}
