import type { Metadata } from "next";
import { SITE } from "@/lib/seo";
import { SiteFooter, SiteHeader } from "@/components/site";

export const metadata: Metadata = {
  title: "Terms of Service and Privacy Policy",
  description: `The terms for using ${SITE.name} and how we handle your data.`,
  alternates: { canonical: "/terms" },
};

const UPDATED = "October 22, 2026";

export default function TermsPage() {
  return (
    <div className="site">
      <SiteHeader />
      <main>
        <section className="site-hero site-hero-page">
          <p className="site-kicker">利用規約</p>
          <h1>Terms of Service</h1>
          <p className="site-lead2">Last updated {UPDATED}</p>
        </section>

        <article className="terms">
          <h2 className="site-h2">1. Using {SITE.name}</h2>
          <p>{SITE.name} is an English map of restaurants in Japan built on public Tabelog listings. By creating an account or using the service as a guest you agree to these terms. If you don’t agree, please don’t use {SITE.name}.</p>

          <h2 className="site-h2">2. Your account</h2>
          <p>You need a valid email address to create an account. Keep your password private; you are responsible for what happens under your account. You must be at least 13 years old, or the minimum age required where you live.</p>

          <h2 className="site-h2">3. Guest access</h2>
          <p>Guests can search the map without an account, with a limited number of searches per hour. We may change these limits at any time.</p>

          <h2 className="site-h2">4. Restaurant information</h2>
          <p>Ratings, hours, prices and other details come from third-party sources, mainly Tabelog, and may be out of date or wrong. Always check with the restaurant before you go. {SITE.name} is not affiliated with Tabelog or Kakaku.com, Inc.</p>

          <h2 className="site-h2">5. Premium</h2>
          <p>{SITE.name} Premium is a monthly subscription (¥{SITE.premiumYen} a month) billed through Stripe. It renews automatically until you cancel, which you can do any time from your account menu; you keep Premium until the end of the paid period. Payments are non-refundable except where the law requires otherwise.</p>

          <h2 className="site-h2">6. Acceptable use</h2>
          <p>Don’t scrape, overload, reverse engineer or resell the service, don’t try to get around usage limits, and don’t use {SITE.name} for anything unlawful. We may suspend accounts that do.</p>

          <h2 className="site-h2">7. No warranty</h2>
          <p>{SITE.name} is provided “as is”. To the extent the law allows, we are not liable for indirect or consequential losses, or for anything that results from relying on restaurant information shown in the app.</p>

          <h2 className="site-h2">8. Changes</h2>
          <p>We may update these terms. If the changes are significant we’ll tell signed-in users in the app. Continuing to use {SITE.name} after an update means you accept the new terms.</p>

          <h2 className="site-h2" id="privacy">Privacy Policy</h2>
          <p><strong>What we collect.</strong> Your email address and password (stored hashed by our auth provider, Supabase), the lists and places you save, your subscription status, and the approximate location you search from. Guests’ search counts are tracked by a one-way hash of their IP address.</p>
          <p><strong>How we use it.</strong> To run the service: sign you in, show restaurants near you, keep your lists, enforce limits and handle billing. We don’t sell your data or use it for advertising.</p>
          <p><strong>Who we share it with.</strong> Only the providers that run {SITE.name}: Supabase (accounts and database), Stripe (payments) and Vercel (hosting).</p>
          <p><strong>Cookies.</strong> We use cookies to keep you signed in, remember guest mode and your last location. No advertising cookies.</p>
          <p><strong>Your choices.</strong> You can ask us to export or delete your account and data at any time by contacting us.</p>
        </article>
      </main>
      <SiteFooter />
    </div>
  );
}
