import Link from "next/link";
import { CITIES, CUISINES, FEATURED, LANDING_FAQS, SITE, cityCuisineUrl, cityUrl, cuisineBySlug, cuisineUrl } from "@/lib/seo";
import { CtaBand, FaqSection, JsonLd, SiteFooter, SiteHeader, faqSchema } from "./site";

const schema = [
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${SITE.url}/#org`,
    name: SITE.name,
    url: SITE.url,
    logo: `${SITE.url}/logo.svg`,
  },
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE.url}/#website`,
    url: SITE.url,
    name: SITE.name,
    description: SITE.description,
    inLanguage: "en",
    publisher: { "@id": `${SITE.url}/#org` },
  },
  {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: SITE.name,
    url: SITE.url,
    applicationCategory: "TravelApplication",
    operatingSystem: "Web",
    description: SITE.description,
    inLanguage: "en",
    offers: [
      { "@type": "Offer", price: "0", priceCurrency: "JPY", name: "Free" },
      { "@type": "Offer", price: String(SITE.premiumYen), priceCurrency: "JPY", name: "TabeDog Premium", description: "Monthly subscription" },
    ],
    featureList: ["Tabelog ratings in English", "Map search near you", "Filter by cuisine, price and opening hours", "Open-now filter", "Credit card and QR payment info", "Saved lists"],
  },
  faqSchema(LANDING_FAQS),
];

const SHOW_CUISINES = ["sushi", "ramen", "yakiniku", "izakaya", "kaiseki", "tempura", "tonkatsu", "yakitori", "soba", "udon", "unagi", "okonomiyaki"];

export function Landing() {
  return (
    <div className="site">
      <JsonLd data={schema} />
      <SiteHeader />
      <main>
        <section className="site-hero">
          <p className="site-kicker">Tabelog ratings · English map · All of Japan</p>
          <h1>Tabelog in English, on a map.</h1>
          <p className="site-lead">
            TabeDog puts Tabelog's restaurant ratings, the scores Japanese locals actually trust, on a map you can read.
            Find authentic Japanese restaurants near you, filter by cuisine, price and what's open right now, and skip the tourist traps.
          </p>
          <div className="site-hero-actions">
            <Link href="/login" className="site-btn site-btn-lg">Find restaurants near me</Link>
            <Link href="/tokyo" className="site-btn site-btn-ghost site-btn-lg">Browse Tokyo</Link>
          </div>
          <ul className="site-proof">
            <li><strong>3.5+</strong> on Tabelog is the top 5% of Japan. Google gives everything 4.3.</li>
            <li><strong>Hours, prices, payment</strong> in English, pulled from each listing.</li>
            <li><strong>Open now</strong> filter, because the best places close when they sell out.</li>
          </ul>
        </section>

        <section className="site-section" id="why">
          <h2 className="site-h2">Why Tabelog scores beat Google ratings in Japan</h2>
          <div className="site-cards">
            <article className="site-card">
              <h3>The scale is harsh on purpose</h3>
              <p className="p2">Tabelog runs 1 to 5 but almost nothing scores above 4. The average restaurant sits near 3.1. A 3.5 means a queue; a 3.7 is a destination; a 4.0 is one of the best meals in the country. A 0.2 gap is real.</p>
            </article>
            <article className="site-card">
              <h3>Reviewers are weighted</h3>
              <p className="p2">Scores are not simple averages. Tabelog weights reviewers by how much and how consistently they review, so a tourist's five stars for the hotel sushi bar does not move the number.</p>
            </article>
            <article className="site-card">
              <h3>Locals choose by it</h3>
              <p className="p2">Japanese diners pick restaurants by Tabelog score and the annual Hyakumeiten (Top 100) lists. Google's 4.0 to 4.5 band cannot tell a great ramen shop from an average one. Tabelog can.</p>
            </article>
          </div>
        </section>

        <section className="site-section" id="how">
          <h2 className="site-h2">How TabeDog works</h2>
          <ol className="site-steps">
            <li><strong>Open the map.</strong> TabeDog finds restaurants around you, or around any station or neighborhood you search, anywhere in Japan.</li>
            <li><strong>Filter like a local.</strong> Cuisine, price range, Tabelog score, open now, takes credit cards. Sort by rating, distance or price.</li>
            <li><strong>Read it in English.</strong> Every listing shows the name, address, hours, lunch and dinner prices and payment methods, with a link to the Tabelog page for photos and reviews.</li>
          </ol>
        </section>

        <section className="site-section" id="cities">
          <h2 className="site-h2">Find authentic Japanese restaurants by city</h2>
          <p className="site-sub p2">Neighborhood-by-neighborhood guides, with what to eat, where locals go, and what a good Tabelog score looks like in each city.</p>
          <div className="site-grid">
            {CITIES.map((c) => (
              <Link key={c.slug} href={cityUrl(c.slug)} className="site-tile">
                <span className="site-tile-ja">{c.ja}</span>
                <span className="site-tile-name">Best restaurants in {c.name}</span>
                <span className="sub">{c.dishes.slice(0, 3).map((d) => d.name).join(" · ")}</span>
              </Link>
            ))}
          </div>
        </section>

        <section className="site-section" id="cuisines">
          <h2 className="site-h2">Browse by cuisine</h2>
          <p className="site-sub p2">What each dish is, how to order it, what it costs, and which cities do it best.</p>
          <div className="site-grid">
            {SHOW_CUISINES.map((slug) => {
              const c = cuisineBySlug(slug)!;
              return (
                <Link key={c.slug} href={cuisineUrl(c.slug)} className="site-tile">
                  <span className="site-tile-ja">{c.ja}</span>
                  <span className="site-tile-name">{c.name}</span>
                  <span className="sub">{c.tagline}</span>
                </Link>
              );
            })}
          </div>
          <p className="site-more p2">
            Also: {CUISINES.filter((c) => !SHOW_CUISINES.includes(c.slug)).map((c, i, arr) => (
              <span key={c.slug}><Link href={cuisineUrl(c.slug)}>{c.name}</Link>{i < arr.length - 1 ? ", " : ""}</span>
            ))}.
          </p>
        </section>

        <section className="site-section" id="popular">
          <h2 className="site-h2">Popular searches</h2>
          <ul className="site-links">
            {FEATURED.map((f) => (
              <li key={f.city + f.cuisine}><Link href={cityCuisineUrl(f.city, f.cuisine)}>{f.label}</Link></li>
            ))}
          </ul>
        </section>

        <FaqSection title="Tabelog, explained for foreigners" faqs={LANDING_FAQS} />

        <CtaBand
          title="Eat where the locals eat."
          body="Free to use. Open the map, allow location, and see the best-rated restaurants around you in English."
          label="Open the map"
        />
      </main>
      <SiteFooter />
    </div>
  );
}
