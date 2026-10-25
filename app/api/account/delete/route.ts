import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { billingEnabled, stripe } from "@/lib/stripe";

// "Delete my account" on /account. Cancels any subscription first so nobody is billed for a deleted account,
// then deletes the auth user; profiles, lists and list items go with it (on delete cascade).
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const { confirm } = (await request.json().catch(() => ({}))) as { confirm?: string };
  if (!user.email || confirm?.trim().toLowerCase() !== user.email.toLowerCase()) {
    return NextResponse.json({ error: "Type your email to confirm." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data } = await admin.from("profiles").select("stripe_subscription_id").eq("id", user.id).maybeSingle();
  const subId = (data as { stripe_subscription_id: string | null } | null)?.stripe_subscription_id;
  if (subId && billingEnabled()) {
    try {
      const sub = await stripe().subscriptions.retrieve(subId);
      if (sub.status !== "canceled" && sub.status !== "incomplete_expired") await stripe().subscriptions.cancel(subId);
    } catch (e) {
      console.error("[account] cancel before delete failed:", e);
      return NextResponse.json({ error: "Couldn’t cancel your subscription, so nothing was deleted. Please try again." }, { status: 502 });
    }
  }

  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) {
    console.error("[account] delete failed:", error);
    return NextResponse.json({ error: "Couldn’t delete your account. Please try again." }, { status: 500 });
  }
  await supabase.auth.signOut({ scope: "local" }); // clears the session cookie; the user is already gone server-side
  return NextResponse.json({ deleted: true });
}
