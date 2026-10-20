import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { appOrigin, BillingNotConfigured, getPremiumPriceId, stripe } from "@/lib/stripe";
import { ensureCustomer } from "@/lib/billing";

// "Upgrade" posts here; we hand the user to Stripe Checkout and Stripe sends them back to /api/billing/return.
export async function POST(request: Request) {
  const origin = appOrigin(request);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${origin}/login`, { status: 303 });
  try {
    const [customer, price] = await Promise.all([ensureCustomer(user.id, user.email), getPremiumPriceId()]);
    const session = await stripe().checkout.sessions.create({
      mode: "subscription",
      customer,
      client_reference_id: user.id,
      line_items: [{ price, quantity: 1 }],
      subscription_data: { metadata: { user_id: user.id } },
      allow_promotion_codes: true,
      success_url: `${origin}/api/billing/return?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/?billing=cancel`,
    });
    return NextResponse.redirect(session.url!, { status: 303 });
  } catch (e) {
    console.error("[billing] checkout failed:", e);
    const reason = e instanceof BillingNotConfigured ? "unconfigured" : "error";
    return NextResponse.redirect(`${origin}/?billing=${reason}`, { status: 303 });
  }
}
