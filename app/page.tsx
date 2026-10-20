import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getPlan } from "@/lib/plan-server";
import { billingEnabled } from "@/lib/stripe";
import { AppLoader } from "@/components/app-loader";
import { Landing } from "@/components/landing";
import { SITE } from "@/lib/seo";

export const metadata: Metadata = {
  title: { absolute: `${SITE.name}: Tabelog in English | Find Authentic Japanese Restaurants on a Map` },
  description: "TabeDog shows Tabelog ratings, the scores Japanese locals trust, on an English map. Find authentic sushi, ramen, izakaya and kaiseki near you in Tokyo, Osaka, Kyoto and all of Japan, with hours, prices and payment methods in English.",
  alternates: { canonical: "/" },
};

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return <Landing />;
  const plan = await getPlan(supabase, user.id);
  return <AppLoader email={user.email ?? ""} userId={user.id} plan={plan} billing={billingEnabled()} />;
}
