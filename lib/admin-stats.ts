// Aggregate user numbers for the /admin dashboard. Counts only: no emails or ids leave this file.
import "server-only";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { effectivePlan, type Plan } from "./plan";

const DAY_MS = 24 * 60 * 60 * 1000;
const PAGE_SIZE = 1000;
export const CHART_DAYS = 30;

export type UserStats = {
  total: number;
  confirmed: number;
  newLast7: number;
  newPrev7: number;
  signedInLast30: number;
  premium: number;
  paying: number;
  /** One entry per UTC day, oldest first, ending today. */
  daily: { date: string; count: number }[];
};

async function allUsers(admin: SupabaseClient): Promise<User[]> {
  const users: User[] = [];
  for (let page = 1; ; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: PAGE_SIZE });
    if (error) throw new Error(`[admin-stats] users: ${error.message}`);
    users.push(...data.users);
    if (data.users.length < PAGE_SIZE) return users;
  }
}

type PremiumRow = { plan: Plan; premium_until: string | null; stripe_subscription_id: string | null };

async function premiumProfiles(admin: SupabaseClient): Promise<PremiumRow[]> {
  const rows: PremiumRow[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await admin.from("profiles")
      .select("plan, premium_until, stripe_subscription_id")
      .eq("plan", "premium")
      .order("id")
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(`[admin-stats] profiles: ${error.message}`);
    rows.push(...(data as PremiumRow[]));
    if (data.length < PAGE_SIZE) return rows;
  }
}

export async function getUserStats(admin: SupabaseClient): Promise<UserStats> {
  const [users, profiles] = await Promise.all([allUsers(admin), premiumProfiles(admin)]);
  const now = Date.now();
  const within = (iso: string | null | undefined, fromDays: number, toDays = 0) => {
    if (!iso) return false;
    const age = now - new Date(iso).getTime();
    return age >= toDays * DAY_MS && age < fromDays * DAY_MS;
  };

  const today = new Date(now).toISOString().slice(0, 10);
  const firstDay = Date.parse(today) - (CHART_DAYS - 1) * DAY_MS;
  const daily = Array.from({ length: CHART_DAYS }, (_, i) => ({ date: new Date(firstDay + i * DAY_MS).toISOString().slice(0, 10), count: 0 }));
  for (const u of users) {
    const i = Math.floor((new Date(u.created_at).getTime() - firstDay) / DAY_MS);
    if (i >= 0 && i < CHART_DAYS) daily[i].count++;
  }

  const active = profiles.filter((p) => effectivePlan({ plan: p.plan, premiumUntil: p.premium_until }) === "premium");

  return {
    total: users.length,
    confirmed: users.filter((u) => u.email_confirmed_at).length,
    newLast7: users.filter((u) => within(u.created_at, 7)).length,
    newPrev7: users.filter((u) => within(u.created_at, 14, 7)).length,
    signedInLast30: users.filter((u) => within(u.last_sign_in_at, 30)).length,
    premium: active.length,
    paying: active.filter((p) => p.stripe_subscription_id).length,
    daily,
  };
}
