import type { Metadata } from "next";
import Link from "next/link";
import { OPERATOR, SITE } from "@/lib/seo";
import { SiteFooter, SiteHeader } from "@/components/site";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: `What ${SITE.name} collects, why, who it is shared with, and how to export or delete your data.`,
  alternates: { canonical: "/privacy" },
};

const UPDATED = "October 22, 2026";

export default function PrivacyPage() {
  return (
    <div className="site">
      <SiteHeader />
      <main>
        <section className="site-hero site-hero-page">
          <p className="site-kicker">プライバシーポリシー</p>
          <h1>Privacy Policy</h1>
          <p className="site-lead2">Last updated {UPDATED}</p>
        </section>

        <article className="terms">
          <h2 className="site-h2">What we collect</h2>
          <p>Your email address and password (stored hashed by our auth provider, Supabase), the lists and places you save, your subscription status, and the approximate location you search from. Guests’ search counts are tracked by a one-way hash of their IP address.</p>

          <h2 className="site-h2">How we use it</h2>
          <p>To run the service: sign you in, show restaurants near you, keep your lists, enforce limits and handle billing. We don’t sell your data or use it for advertising.</p>

          <h2 className="site-h2">Who we share it with</h2>
          <p>Only the providers that run {SITE.name}: Supabase (accounts and database), Stripe (payments), Vercel (hosting and privacy-friendly, cookieless page analytics) and ipapi.co (turning an IP address into an approximate starting location when your browser doesn’t share one). Some of these providers process data outside Japan.</p>

          <h2 className="site-h2">Cookies</h2>
          <p>We use cookies to keep you signed in, remember guest mode and your last location. No advertising or cross-site tracking cookies.</p>

          <h2 className="site-h2">How long we keep it</h2>
          <p>Account data is kept while your account exists. Billing records are kept as long as tax law requires. Guest search counters expire after an hour.</p>

          <h2 className="site-h2">Your choices</h2>
          <p>You can ask us to export or delete your account and data at any time by emailing {OPERATOR.email}. Cancelling Premium is in your account menu; see the <Link href="/terms">Terms of Service</Link>.</p>
        </article>
      </main>
      <SiteFooter />
    </div>
  );
}
