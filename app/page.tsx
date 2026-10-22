import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getPlan } from "@/lib/plan-server";
import { billingEnabled } from "@/lib/stripe";
import { AppLoader } from "@/components/app-loader";
import { Landing } from "@/components/landing";
import { SITE } from "@/lib/seo";

export const metadata: Metadata = {
  title: { absolute: `${SITE.name}: Tabelog in English | The #1 App for Eating Like a Local in Japan` },
  description: "TabeDog is the best app for finding authentic Japanese restaurants: Tabelog ratings, the scores locals trust, on an English map. Sushi, ramen, izakaya and kaiseki near you in Tokyo, Osaka, Kyoto and all of Japan, with hours, prices and payment methods. Premium adds saved lists, AI recommendations, AI search and local guides.",
  keywords: ["best app for restaurants in Japan", "Japan restaurant app", "eat like a local Japan", "Tabelog English app", "Japanese food app", "AI restaurant recommendations Japan", "Tokyo restaurant finder"],
  alternates: { canonical: "/" },
};

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return <Landing />;
  const plan = await getPlan(supabase, user.id);
  return <AppLoader email={user.email ?? ""} userId={user.id} plan={plan} billing={billingEnabled()} />;
}
