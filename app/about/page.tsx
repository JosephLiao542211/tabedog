import type { Metadata } from "next";
import Link from "next/link";
import { OPERATOR, SITE } from "@/lib/seo";
import { JsonLd, SiteFooter, SiteHeader } from "@/components/site";

export const metadata: Metadata = {
  title: "About TabeDog: Who Runs It and Where the Data Comes From",
  description: `Who is behind ${SITE.name}, where its restaurant ratings come from, how often they refresh, and how to get in touch.`,
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <div className="site">
      <JsonLd data={{
        "@context": "https://schema.org",
        "@type": "AboutPage",
        name: `About ${SITE.name}`,
        url: `${SITE.url}/about`,
        inLanguage: "en",
        isPartOf: { "@type": "WebSite", "@id": `${SITE.url}/#website`, url: SITE.url, name: SITE.name },
        about: { "@type": "Organization", "@id": `${SITE.url}/#org`, name: SITE.name, url: SITE.url, email: OPERATOR.email },
      }} />
      <SiteHeader />
      <main>
        <section className="site-hero site-hero-page">
          <p className="site-kicker">TabeDogについて</p>
          <h1>About {SITE.name}</h1>
          <p className="site-lead">{SITE.name} is an independent English map of Japan’s restaurants, built so visitors and residents can choose where to eat the way Japanese diners do: by Tabelog score.</p>
        </section>

        <article className="terms">
          <h2 className="site-h2">Who runs it</h2>
          <p>{SITE.name} is built and run by {OPERATOR.name}. It is a small independent project, not a company with a sales team, and it has no relationship with any restaurant it lists: nobody can pay to be ranked higher.</p>

          <h2 className="site-h2">Where the data comes from</h2>
          <p>Ratings, review counts, prices, hours and payment methods come from each restaurant’s public listing on <a href="https://tabelog.com/en/" rel="nofollow noopener" target="_blank">Tabelog</a>, Japan’s largest restaurant review site. Every restaurant in the app and on these pages links to its Tabelog listing so you can check the source.</p>
          <p>Map searches are fetched live and kept for about 15 minutes. A restaurant’s address, hours and payment methods are kept for up to 90 days. The top-rated lists on the city and cuisine pages refresh once a day and show the date they were taken.</p>
          <p>{SITE.name} is not affiliated with, endorsed by or connected to Tabelog or Kakaku.com, Inc. Tabelog is a trademark of Kakaku.com, Inc.</p>

          <h2 className="site-h2">How we rank</h2>
          <p>We don’t. The order on every list is Tabelog’s own score, highest first. We add things Tabelog’s English site makes hard to see at a glance: a map, what’s open right now, and filters for price and card payment. The city and cuisine guides are written by hand from those rankings and from eating in these places.</p>

          <h2 className="site-h2">What it costs</h2>
          <p>The map is free. Premium is ¥{SITE.premiumYen} a month and adds saved lists, AI recommendations, AI search and local guides. See the <Link href="/terms">Terms</Link>, <Link href="/privacy">Privacy Policy</Link> and <Link href="/legal">特定商取引法に基づく表記</Link>.</p>

          <h2 className="site-h2">Contact</h2>
          <p>Corrections, data requests, press or anything else: {OPERATOR.email}. If a restaurant’s details are wrong, tell us and also report it on its Tabelog page, since that is where the data comes from.</p>
        </article>
      </main>
      <SiteFooter />
    </div>
  );
}
