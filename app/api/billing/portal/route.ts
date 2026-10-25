import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { appOrigin, stripe } from "@/lib/stripe";

// "Manage subscription" posts here; Stripe's hosted portal handles cancel / card / invoices.
export async function POST(request: Request) {
  const origin = appOrigin(request);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${origin}/login`, { status: 303 });
  const { data } = await supabase.from("profiles").select("stripe_customer_id").eq("id", user.id).maybeSingle();
  const customer = (data as { stripe_customer_id: string | null } | null)?.stripe_customer_id;
  if (!customer) return NextResponse.redirect(`${origin}/account?billing=nocustomer`, { status: 303 });
  try {
    const session = await stripe().billingPortal.sessions.create({ customer, return_url: `${origin}/account` });
    return NextResponse.redirect(session.url, { status: 303 });
  } catch (e) {
    console.error("[billing] portal failed:", e);
    return NextResponse.redirect(`${origin}/account?billing=error`, { status: 303 });
  }
}
