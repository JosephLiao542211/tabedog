import Image from "next/image";
import Link from "next/link";
import { CITIES, CUISINES, FEATURED, LANDING_FAQS, SITE, cityCuisineUrl, cityUrl, cuisineBySlug, cuisineUrl } from "@/lib/seo";
import { CtaBand, FaqSection, JsonLd, SiteFooter, SiteHeader, faqSchema } from "./site";
import { LandingMap, LandingSpots, MiniMap, SpotCard } from "./landing-map";
import { ArrowRight, ClockIcon, Logo, MapIcon, FilterIcon, GlobeIcon, HeartIcon, PawIcon, PinIcon, ScaleIcon, SearchIcon, SparkIcon, StarIcon, UsersIcon } from "./icons";

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
      { "@type": "Offer", price: String(SITE.premiumYen), priceCurrency: "JPY", name: "TabeDog Premium", description: "Monthly subscription: saved restaurant lists, AI restaurant recommendations, AI search and curated local guides" },
    ],
    featureList: ["Tabelog ratings in English", "Map search near you", "Filter by cuisine, price and opening hours", "Open-now filter", "Credit card and QR payment info", "Saved restaurant lists", "AI restaurant recommendations", "AI search in plain English", "Curated local restaurant guides"],
  },
  faqSchema(LANDING_FAQS),
];

const SHOW_CUISINES = ["sushi", "ramen", "yakiniku", "izakaya", "kaiseki", "tempura", "tonkatsu", "yakitori", "soba", "udon", "unagi", "okonomiyaki"];
const CUISINE_PHOTOS: Record<string, string> = {
  sushi: "/img/sushi.jpg", ramen: "/img/ramen.jpg", yakiniku: "/img/yakiniku.jpg", izakaya: "/img/izakaya.jpg", kaiseki: "/img/washoku.jpg",
  tempura: "/img/tempura.jpg", tonkatsu: "/img/tonkatsu.jpg", yakitori: "/img/yakitori.jpg", soba: "/img/soba.jpg", udon: "/img/udon.jpg",
  unagi: "/img/unagi.jpg", okonomiyaki: "/img/takoyaki.jpg",
};
// Wikimedia Commons photos that need a credit (CC BY / CC BY-SA)
const CREDITS = [
  { what: "Sushi", who: "Tim Reckmann", lic: "CC BY 2.0", url: "https://commons.wikimedia.org/wiki/File:Nigiri_Sushi_(26478725732).jpg" },
  { what: "Tempura", who: "Yaco", lic: "CC BY 2.0", url: "https://commons.wikimedia.org/wiki/File:Tempura_01.jpg" },
  { what: "Tonkatsu", who: "ayustety", lic: "CC BY-SA 2.0", url: "https://commons.wikimedia.org/wiki/File:Tonkatsu_by_ayustety_in_Tokyo.jpg" },
  { what: "Soba", who: "spinachdip", lic: "CC BY-SA 2.0", url: "https://commons.wikimedia.org/wiki/File:Zaru_soba_by_spinachdip.jpg" },
  { what: "Udon", who: "udono", lic: "CC BY 2.0", url: "https://commons.wikimedia.org/wiki/File:Kake_udon_by_udono.jpg" },
  { what: "Unagi", who: "663highland", lic: "CC BY 2.5", url: "https://commons.wikimedia.org/wiki/File:Tokyo_Chikuyotei_Unadon01s2100.jpg" },
  { what: "Ramen and izakaya", who: "GiveMeMollusks, Syced", lic: "CC0", url: "https://commons.wikimedia.org/wiki/File:Bowl_of_shio_ramen_with_pork.jpg" },
];

export function Landing() {
  const tokyo = CITIES.find((c) => c.slug === "tokyo")!;
  return (
    <LandingSpots>
      <div className="site ld">
        <JsonLd data={schema} />
        <LandingMap />
        <SiteHeader />
        <main className="ld-main">
          {/* ---- hero: one centred card floating on the map, with the live map inside it ---- */}
          <section className="ld-hero">
            <p className="ld-brand"><Logo size={34} /><span>TabeDog</span></p>
            <h1 className="ld-h1">Tabelog in English,<br /> on a map.</h1>
            <p className="ld-lead">
              The restaurant ratings Japanese locals actually trust, on a map you can read.
              Find the places locals queue for and skip the tourist traps.
            </p>
            <div className="ld-actions">
              <Link href="/login" className="site-btn site-btn-lg">Find restaurants near me</Link>
              <Link href="/tokyo" className="site-btn site-btn-ghost site-btn-lg">Browse Tokyo</Link>
            </div>
            <p className="ld-meta"><span>Free to use</span><span>Every restaurant in Japan</span><span>Hours, prices and payment in English</span></p>
            <MiniMap variant="rating" count={40} zoom={14.4} className="ld-hero-map">
              <Link href="/login" className="ld-hero-open" aria-label="Open the map">
                <span className="ld-hero-open-text">
                  <span className="ld-hero-open-title"><MapIcon size={30} /> Open the map</span>
                  <span className="ld-hero-open-sub">Sit. Stay. We&apos;ll fetch the best bowl in the neighborhood.</span>
                </span>
              </Link>
              <div className="ld-hero-search" aria-hidden="true"><SearchIcon /><span>Ramen near Shibuya</span></div>
              <SpotCard />
            </MiniMap>
          </section>

          {/* ---- why Tabelog ---- */}
          <section className="ld-sheet" id="why">
            <header className="ld-head">
              <h2 className="ld-h2">Why Tabelog scores beat Google ratings in Japan</h2>
              <p className="ld-sub">Tabelog runs 1 to 5, but almost nothing scores above 4. That is the point: a 0.2 gap on Tabelog is a real difference. The same gap on Google is noise.</p>
            </header>
            <div className="ld-scale" role="img" aria-label="Tabelog rating scale: 3.0 average, 3.5 top 5 percent with a queue, 3.7 a destination, 4.0 one of the best in Japan">
              <div className="ld-scale-bar" />
              <div className="ld-scale-tick" style={{ left: "8%" }}><b>3.0</b><span>The average restaurant</span></div>
              <div className="ld-scale-tick hot" style={{ left: "50%" }}><i><PawIcon size={14} /></i><b>3.5</b><span>Top 5%. Expect a queue</span></div>
              <div className="ld-scale-tick" style={{ left: "70%" }}><b>3.7</b><span>Worth crossing the city</span></div>
              <div className="ld-scale-tick" style={{ left: "92%" }}><b>4.0</b><span>One of the best in Japan</span></div>
            </div>
            <div className="ld-cards">
              <article className="ld-card">
                <span className="ld-ic"><ScaleIcon /></span>
                <h3>The scale is harsh on purpose</h3>
                <p>The average restaurant sits near 3.1. A 3.5 means a queue, a 3.7 is a destination, a 4.0 is one of the best meals in the country.</p>
              </article>
              <article className="ld-card">
                <span className="ld-ic"><UsersIcon /></span>
                <h3>Reviewers are weighted</h3>
                <p>Tabelog weights reviewers by their track record, so a tourist&apos;s five stars for the hotel sushi bar does not move the number.</p>
              </article>
              <article className="ld-card">
                <span className="ld-ic"><PawIcon /></span>
                <h3>Locals choose by it</h3>
                <p>Japanese diners pick restaurants by Tabelog score and the Hyakumeiten (Top 100) lists. Google&apos;s 4.0 to 4.5 band cannot tell a great ramen shop from an average one.</p>
              </article>
            </div>
          </section>

          {/* ---- the best app: one row of map and photos, three short points ---- */}
          <section className="ld-sheet" id="best-app">
            <header className="ld-head ld-head-wide">
              <h2 className="ld-h2">The best app for finding restaurants in Japan</h2>
              <p className="ld-sub">Google rates everything in Japan 4.0 to 4.5. Guidebooks send everyone to the same ten places. TabeDog shows the ratings locals use, in English.</p>
            </header>
            <div className="ld-strip">
              <MiniMap variant="open" count={10} className="ld-tile ld-tile-map ld-strip-map">
                <figcaption><span className="dot ok" /> Open right now near Shibuya</figcaption>
              </MiniMap>
              <figure className="ld-tile ld-tile-photo">
                <Image src="/img/yakitori.jpg" alt="Yakitori skewers with grilled negi and sesame" fill sizes="(max-width: 720px) 50vw, 25vw" />
                <figcaption>Yakitori, Shinjuku</figcaption>
              </figure>
              <figure className="ld-tile ld-tile-photo">
                <Image src="/img/takoyaki.jpg" alt="Takoyaki with mayonnaise and sauce on a black plate" fill sizes="(max-width: 720px) 50vw, 25vw" />
                <figcaption>Takoyaki, Osaka</figcaption>
              </figure>
            </div>
            <ul className="ld-points">
              <li><span className="ld-ic"><StarIcon /></span><div><h3>Scores locals trust</h3><p>The 3.6 ramen shop a block away stands out from the 3.0 with the English sign.</p></div></li>
              <li><span className="ld-ic"><ClockIcon /></span><div><h3>Open now, cash or card</h3><p>Today&apos;s hours and payment methods for every listing, because many places are cash only.</p></div></li>
              <li><span className="ld-ic"><GlobeIcon /></span><div><h3>All of Japan, in English</h3><p>Every Tabelog listing, from <Link href={cityUrl("sapporo")}>Sapporo</Link> to <Link href={cityUrl("okinawa")}>Okinawa</Link>.</p></div></li>
            </ul>
            <details className="ld-compare">
              <summary>Compare TabeDog with Google Maps, Tabelog.com and guidebooks</summary>
              <div className="site-table-wrap">
                <table className="site-table">
                  <caption className="sub">TabeDog vs Google Maps vs Tabelog.com vs guidebooks for eating in Japan</caption>
                  <thead>
                    <tr><th scope="col">What you need in Japan</th><th scope="col">TabeDog</th><th scope="col">Google Maps</th><th scope="col">Tabelog.com</th><th scope="col">Guidebooks / TikTok</th></tr>
                  </thead>
                  <tbody>
                    <tr><th scope="row">Ratings Japanese locals trust</th><td className="yes">Tabelog scores</td><td className="no">4.3 for everything</td><td className="yes">Tabelog scores</td><td className="no">Opinion</td></tr>
                    <tr><th scope="row">Fully in English</th><td className="yes">Yes</td><td className="yes">Yes</td><td className="no">Partial</td><td className="yes">Yes</td></tr>
                    <tr><th scope="row">Map search near you</th><td className="yes">Yes</td><td className="yes">Yes</td><td className="no">Limited</td><td className="no">No</td></tr>
                    <tr><th scope="row">Open right now, sold-out aware</th><td className="yes">Yes</td><td className="no">Often wrong</td><td className="no">Japanese only</td><td className="no">No</td></tr>
                    <tr><th scope="row">Cash, card, IC and QR payment</th><td className="yes">Yes</td><td className="no">Rarely</td><td className="no">Japanese only</td><td className="no">No</td></tr>
                    <tr><th scope="row">Every restaurant in Japan</th><td className="yes">All of Tabelog</td><td className="yes">Most</td><td className="yes">All</td><td className="no">A few dozen</td></tr>
                    <tr><th scope="row">Saved lists, AI recommendations, AI search, local guides</th><td className="yes">Premium</td><td className="no">Lists only</td><td className="no">No</td><td className="no">No</td></tr>
                  </tbody>
                </table>
              </div>
            </details>
          </section>

          {/* ---- premium: each card shows the feature instead of describing it ---- */}
          <section className="ld-sheet" id="premium">
            <header className="ld-head">
              <h2 className="ld-h2">TabeDog Premium: a local&apos;s shortlist in your pocket</h2>
              <p className="ld-sub">The map is free for everyone. Premium turns TabeDog into your personal Japanese food guide for ¥{SITE.premiumYen} a month, less than a bowl of ramen.</p>
            </header>
            <div className="ld-premium">
              <MiniMap variant="hearts" count={9} className="ld-tile ld-tile-map ld-premium-map">
                <figcaption><HeartIcon filled size={14} /> Your saved lists</figcaption>
              </MiniMap>
              <div className="ld-premium-grid">
                <article className="ld-feature">
                  <div className="ld-feature-demo" aria-hidden="true">
                    <span className="ld-chip"><i style={{ background: "#ff6347" }} />Tokyo trip</span>
                    <span className="ld-chip"><i style={{ background: "#2f7de1" }} />Late-night ramen</span>
                    <span className="ld-chip"><i style={{ background: "#4CB944" }} />Date night sushi</span>
                  </div>
                  <h3>Restaurant lists</h3>
                  <p>Save places into colour-coded lists that show up as pins on the map.</p>
                </article>
                <article className="ld-feature">
                  <div className="ld-feature-demo" aria-hidden="true">
                    <span className="ld-bubble">Sushi for two, under ¥10,000?</span>
                    <span className="ld-bubble ld-bubble-me"><b>3.72</b> A sushi counter in Ginza · opens 17:00</span>
                  </div>
                  <h3>AI recommendations</h3>
                  <p>Say what you feel like and get a shortlist of top-rated places near you.</p>
                </article>
                <article className="ld-feature">
                  <div className="ld-feature-demo" aria-hidden="true">
                    <span className="ld-search"><SearchIcon /><span>yakitori near Shibuya that takes cards</span></span>
                  </div>
                  <h3>AI search in plain English</h3>
                  <p>Ask the way you think. AI search reads Tabelog in Japanese and answers on the map.</p>
                </article>
                <article className="ld-feature">
                  <div className="ld-feature-demo ld-feature-guide" aria-hidden="true">
                    <span className="ld-guide"><b>Hyakumeiten ramen</b><small>Tokyo · 24 places</small></span>
                    <span className="ld-guide"><b>Best kushikatsu</b><small>Osaka · 12 places</small></span>
                  </div>
                  <h3>Local guides</h3>
                  <p>Curated lists of where locals actually eat, by city and neighborhood.</p>
                </article>
              </div>
            </div>
            <div className="ld-premium-foot">
              <p><strong>¥{SITE.premiumYen} a month, cancel any time.</strong> Ratings, filters, hours, prices and payment methods stay free for everyone.</p>
              <Link href="/login" className="site-btn site-btn-lg"><SparkIcon size={14} /> Start with the free map</Link>
            </div>
          </section>

          {/* ---- how it works ---- */}
          <section className="ld-sheet ld-how" id="how">
            <figure className="ld-how-photo">
              <Image src="/img/sensoji.jpg" alt="Cherry blossoms at Sensoji temple, Asakusa, Tokyo" fill sizes="(max-width: 900px) 100vw, 50vw" />
            </figure>
            <div className="ld-how-copy">
              <h2 className="ld-h2">How TabeDog works</h2>
              <ol className="ld-steps">
                <li><span className="ld-step-ic"><PinIcon /></span><div><h3>Open the map</h3><p>TabeDog finds restaurants around you, or around any station or neighborhood you search, anywhere in Japan.</p></div></li>
                <li><span className="ld-step-ic"><FilterIcon /></span><div><h3>Filter like a local</h3><p>Cuisine, price range, Tabelog score, open now, takes credit cards. Sort by rating, distance or price.</p></div></li>
                <li><span className="ld-step-ic"><GlobeIcon /></span><div><h3>Read it in English</h3><p>Name, address, hours, lunch and dinner prices and payment methods, with a link to the Tabelog page for photos and reviews.</p></div></li>
              </ol>
              <Link href="/login" className="site-btn site-btn-lg">Open the map</Link>
            </div>
          </section>

          {/* ---- cities ---- */}
          <section className="ld-sheet" id="cities">
            <header className="ld-head ld-head-wide">
              <h2 className="ld-h2">Find authentic Japanese restaurants by city</h2>
              <p className="ld-sub">Neighborhood-by-neighborhood guides, with what to eat, where locals go, and what a good Tabelog score looks like in each city.</p>
            </header>
            <div className="ld-cities">
              <Link href={cityUrl(tokyo.slug)} className="ld-city-hero">
                <Image src="/img/tokyo-aerial.jpg" alt="Aerial view of Tokyo with Mount Fuji behind" fill sizes="(max-width: 720px) 100vw, 66vw" />
                <span className="ld-city-hero-text">
                  <span className="ld-city-ja">{tokyo.ja}</span>
                  <span className="ld-city-name">Best restaurants in Tokyo</span>
                  <span className="ld-city-sub">{tokyo.dishes.slice(0, 4).map((d) => d.name).join(" · ")}</span>
                </span>
              </Link>
              {CITIES.filter((c) => c.slug !== "tokyo").map((c) => (
                <Link key={c.slug} href={cityUrl(c.slug)} className="ld-tile-link">
                  <span className="ld-city-ja">{c.ja}</span>
                  <span className="ld-tile-name">{c.name}</span>
                  <span className="ld-tile-sub">{c.dishes.slice(0, 3).map((d) => d.name).join(" · ")}</span>
                  <span className="ld-tile-arrow"><ArrowRight /></span>
                </Link>
              ))}
            </div>
          </section>

          {/* ---- cuisines: every tile is a photo ---- */}
          <section className="ld-sheet" id="cuisines">
            <header className="ld-head ld-head-wide">
              <h2 className="ld-h2">Browse by cuisine</h2>
              <p className="ld-sub">What each dish is, how to order it, what it costs, and which cities do it best.</p>
            </header>
            <div className="ld-cuisines">
              {SHOW_CUISINES.map((slug) => {
                const c = cuisineBySlug(slug)!;
                return (
                  <Link key={c.slug} href={cuisineUrl(c.slug)} className="ld-dish">
                    <Image src={CUISINE_PHOTOS[slug]} alt="" fill sizes="(max-width: 720px) 50vw, 25vw" />
                    <span className="ld-dish-text">
                      <span className="ld-dish-name">{c.name}<small>{c.ja}</small></span>
                      <span className="ld-dish-sub">{c.tagline}</span>
                    </span>
                  </Link>
                );
              })}
            </div>
            <div className="ld-chips">
              {CUISINES.filter((c) => !SHOW_CUISINES.includes(c.slug)).map((c) => (
                <Link key={c.slug} href={cuisineUrl(c.slug)}>{c.name}</Link>
              ))}
              {FEATURED.map((f) => (
                <Link key={f.city + f.cuisine} href={cityCuisineUrl(f.city, f.cuisine)}>{f.label}</Link>
              ))}
            </div>
            <p className="ld-credits">
              Photos via Wikimedia Commons:{" "}
              {CREDITS.map((c, i) => (
                <span key={c.url}><a href={c.url} rel="nofollow noopener" target="_blank">{c.what}</a> by {c.who} ({c.lic}){i < CREDITS.length - 1 ? ", " : "."}</span>
              ))}
            </p>
          </section>

          <FaqSection title="Tabelog, explained for foreigners" faqs={LANDING_FAQS} />

          <CtaBand
            title="Eat where the locals eat."
            body="Free to use. Open the map, allow location, and see the best-rated restaurants around you in English."
            label="Open the map"
            image="/img/kawaguchiko.jpg"
          />
        </main>
        <SiteFooter />
      </div>
    </LandingSpots>
  );
}
