import type { Metadata } from "next";
import { redirect } from "next/navigation";
import type Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";
import { BILLING_NOTES, effectivePlan, type Plan } from "@/lib/plan";
import { billingEnabled, stripe } from "@/lib/stripe";
import { AccountPage, type SubscriptionInfo } from "@/components/account-page";

export const metadata: Metadata = {
  title: "Your account",
  robots: { index: false, follow: false },
};

/** What the account page shows about a Stripe subscription. Null when there is none or Stripe can't be reached. */
async function subscriptionInfo(id: string): Promise<SubscriptionInfo | null> {
  try {
    const sub = await stripe().subscriptions.retrieve(id, { expand: ["default_payment_method"] });
    const item = sub.items.data[0];
    const pm = sub.default_payment_method as Stripe.PaymentMethod | null;
    // In this API version the period lives on each item; take the latest end.
    const periodEnd = Math.max(0, ...sub.items.data.map((i) => i.current_period_end ?? 0));
    return {
      status: sub.status,
      cancelAtPeriodEnd: sub.cancel_at_period_end || !!sub.cancel_at,
      periodEnd: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
      amount: item?.price.unit_amount ?? null,
      currency: item?.price.currency ?? null,
      interval: item?.price.recurring?.interval ?? null,
      card: pm?.card ? { brand: pm.card.brand, last4: pm.card.last4 } : null,
    };
  } catch (e) {
    console.error("[account] subscription lookup failed:", e);
    return null;
  }
}

export default async function Account({ searchParams }: { searchParams: Promise<{ billing?: string }> }) {
  const sp = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/account"); // guests have no account to manage either

  const { data } = await supabase.from("profiles").select("plan, premium_until, stripe_subscription_id, created_at").eq("id", user.id).maybeSingle();
  const p = data as { plan: Plan; premium_until: string | null; stripe_subscription_id: string | null; created_at: string } | null;
  const plan = effectivePlan(p ? { plan: p.plan, premiumUntil: p.premium_until } : null);
  const billing = billingEnabled();
  const subscription = billing && p?.stripe_subscription_id ? await subscriptionInfo(p.stripe_subscription_id) : null;

  return (
    <AccountPage
      email={user.email ?? ""}
      pendingEmail={user.new_email ?? null}
      memberSince={p?.created_at ?? user.created_at}
      plan={plan}
      premiumUntil={p?.premium_until ?? null}
      billing={billing}
      subscription={subscription}
      note={sp.billing ? BILLING_NOTES[sp.billing] ?? null : null}
    />
  );
}
