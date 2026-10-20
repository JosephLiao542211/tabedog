import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { appOrigin } from "@/lib/stripe";
import { syncCheckoutSession } from "@/lib/billing";

// Stripe Checkout's success_url. Syncs the new subscription right away so the user lands on Premium.
export async function GET(request: Request) {
  const origin = appOrigin(request);
  const sessionId = new URL(request.url).searchParams.get("session_id");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${origin}/login`, { status: 303 });
  if (!sessionId) return NextResponse.redirect(`${origin}/`, { status: 303 });
  try {
    const ok = await syncCheckoutSession(sessionId, user.id);
    return NextResponse.redirect(`${origin}/?billing=${ok ? "success" : "pending"}`, { status: 303 });
  } catch (e) {
    console.error("[billing] return sync failed:", e);
    return NextResponse.redirect(`${origin}/?billing=pending`, { status: 303 }); // the webhook will finish the job
  }
}
