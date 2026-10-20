// Keeps `profiles` in step with Stripe. Called from the webhook and from the checkout return page.
import type Stripe from "stripe";
import { createAdminClient } from "./supabase/admin";
import { stripe } from "./stripe";

// Statuses that still count as paid. `past_due` stays premium until the period ends so a failed retry
// doesn't lock someone out mid-month; `premium_until` makes it lapse on its own if Stripe never recovers.
const PAID: ReadonlySet<Stripe.Subscription.Status> = new Set(["active", "trialing", "past_due"]);

const customerId = (c: string | Stripe.Customer | Stripe.DeletedCustomer | null) => (typeof c === "string" ? c : c?.id ?? null);

/** Resolve the TabeDog user behind a subscription: metadata first, then the customer id we stored. */
async function userIdFor(sub: Stripe.Subscription): Promise<string | null> {
  if (sub.metadata?.user_id) return sub.metadata.user_id;
  const cid = customerId(sub.customer);
  if (!cid) return null;
  const { data } = await createAdminClient().from("profiles").select("id").eq("stripe_customer_id", cid).maybeSingle();
  return (data as { id: string } | null)?.id ?? null;
}

/** Write the plan a subscription implies onto the user's profile. Idempotent; safe to call for any event. */
export async function syncSubscription(sub: Stripe.Subscription): Promise<void> {
  const userId = await userIdFor(sub);
  if (!userId) { console.warn(`[billing] subscription ${sub.id} has no TabeDog user`); return; }
  const paid = PAID.has(sub.status);
  // In this API version the period lives on each item; take the latest end.
  const periodEnd = Math.max(0, ...sub.items.data.map((i) => i.current_period_end ?? 0));
  const admin = createAdminClient();
  // Only the newest subscription for a user wins: ignore events for an old one we've already replaced.
  const { data: cur } = await admin.from("profiles").select("stripe_subscription_id").eq("id", userId).maybeSingle();
  const current = (cur as { stripe_subscription_id: string | null } | null)?.stripe_subscription_id;
  if (current && current !== sub.id && !paid) return;
  const { error } = await admin.from("profiles").update({
    plan: paid ? "premium" : "free",
    premium_until: paid && periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
    stripe_customer_id: customerId(sub.customer),
    stripe_subscription_id: paid ? sub.id : null,
  }).eq("id", userId);
  if (error) throw new Error(`[billing] profile update failed: ${error.message}`);
}

/** The Stripe customer for a user, created on first purchase and remembered on the profile. */
export async function ensureCustomer(userId: string, email: string | undefined): Promise<string> {
  const admin = createAdminClient();
  const { data } = await admin.from("profiles").select("stripe_customer_id").eq("id", userId).maybeSingle();
  const existing = (data as { stripe_customer_id: string | null } | null)?.stripe_customer_id;
  if (existing) return existing;
  const c = await stripe().customers.create({ email, metadata: { user_id: userId } });
  await admin.from("profiles").upsert({ id: userId, stripe_customer_id: c.id });
  return c.id;
}

/** After Checkout: pull the session's subscription and sync it, so Premium is on before the webhook even arrives. */
export async function syncCheckoutSession(sessionId: string, expectUserId: string): Promise<boolean> {
  const session = await stripe().checkout.sessions.retrieve(sessionId, { expand: ["subscription"] });
  if (session.client_reference_id !== expectUserId) return false;
  const sub = session.subscription;
  if (!sub || typeof sub === "string") return false;
  await syncSubscription(sub);
  return true;
}
