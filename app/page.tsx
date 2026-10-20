import { createClient } from "@/lib/supabase/server";
import { getPlan } from "@/lib/plan-server";
import { billingEnabled } from "@/lib/stripe";
import { AppLoader } from "@/components/app-loader";
import { Landing } from "@/components/landing";

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return <Landing />;
  const plan = await getPlan(supabase, user.id);
  return <AppLoader email={user.email ?? ""} userId={user.id} plan={plan} billing={billingEnabled()} />;
}
