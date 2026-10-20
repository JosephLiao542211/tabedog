import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CITIES, CITY_SLUGS, SITE, cityBySlug, cityCuisine, cityCuisineUrl, cityFaqs, cityUrl, cuisineBySlug, cuisineUrl } from "@/lib/seo";
import { Breadcrumbs, CtaBand, FaqSection, JsonLd, SiteFooter, SiteHeader, breadcrumbSchema, faqSchema } from "@/components/site";

type Props = { params: Promise<{ city: string }> };

export const dynamicParams = false;
export function generateStaticParams() {
  return CITY_SLUGS.map((city) => ({ city }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const city = cityBySlug((await params).city);
  if (!city) return {};
  const top = city.cuisines.slice(0, 4).map((cc) => cuisineBySlug(cc.cuisine)!.name.toLowerCase());
  const title = `Best Restaurants in ${city.name}: Tabelog Ratings in English`;
  const description = `Where to eat in ${city.name} by neighborhood: ${city.areas.slice(0, 3).map((a) => a.name).join(", ")} and more. Top-rated ${top.join(", ")} on Tabelog, with hours and prices in English.`;
  return {
    title,
    description,
    alternates: { canonical: cityUrl(city.slug) },
    openGraph: { title, description, url: cityUrl(city.slug), type: "website" },
  };
}

export default async function CityPage({ params }: Props) {
  const city = cityBySlug((await params).city);
  if (!city) notFound();
  const faqs = cityFaqs(city);
  const others = CITIES.filter((c) => c.slug !== city.slug);
  const crumbs = [{ name: city.name, url: cityUrl(city.slug) }];
  const [intro1, intro2] = city.intro.split("\n\n");

  return (
    <div className="site">
      <JsonLd data={[breadcrumbSchema(crumbs), faqSchema(faqs), {
        "@context": "https://schema.org",
        "@type": "WebPage",
        name: `Best Restaurants in ${city.name}`,
        url: `${SITE.url}${cityUrl(city.slug)}`,
        inLanguage: "en",
        about: { "@type": "City", name: city.name, alternateName: city.ja },
        isPartOf: { "@id": `${SITE.url}/#website` },
      }]} />
      <SiteHeader />
      <main>
        <section className="site-hero site-hero-page">
          <Breadcrumbs items={crumbs} />
          <p className="site-kicker">{city.ja} · {city.region}</p>
          <h1>Best restaurants in {city.name}</h1>
          <p className="site-lead">{intro1}</p>
          <p className="p1 site-lead2">{intro2}</p>
          <div className="site-hero-actions">
            <Link href="/login" className="site-btn site-btn-lg">Open {city.name} on the map</Link>
          </div>
        </section>

        <section className="site-section">
          <h2 className="site-h2">Where to eat in {city.name}, by neighborhood</h2>
          <ul className="site-areas">
            {city.areas.map((a) => (
              <li key={a.name}><strong>{a.name}</strong> <span className="p2">{a.note}</span></li>
            ))}
          </ul>
        </section>

        <section className="site-section">
          <h2 className="site-h2">What to eat in {city.name}</h2>
          <ul className="site-dishes">
            {city.dishes.map((d) => (
              <li key={d.name}>
                <Link href={cityCuisine(city, d.cuisine) ? cityCuisineUrl(city.slug, d.cuisine) : cuisineUrl(d.cuisine)}><strong>{d.name}</strong></Link>
                <span className="p2"> {d.note}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="site-section">
          <h2 className="site-h2">Top-rated cuisines in {city.name}</h2>
          <div className="site-grid">
            {city.cuisines.map((cc) => {
              const c = cuisineBySlug(cc.cuisine)!;
              return (
                <Link key={cc.cuisine} href={cityCuisineUrl(city.slug, cc.cuisine)} className="site-tile">
                  <span className="site-tile-ja">{c.ja}</span>
                  <span className="site-tile-name">Best {c.name.toLowerCase()} in {city.name}</span>
                  <span className="sub">{cc.areas.slice(0, 3).join(" · ")}</span>
                </Link>
              );
            })}
          </div>
        </section>

        <section className="site-section">
          <h2 className="site-h2">Reading Tabelog scores in {city.name}</h2>
          <p className="p1">{city.tabelog}</p>
        </section>

        <FaqSection title={`${city.name} restaurant FAQ`} faqs={faqs} />

        <CtaBand
          title={`See every restaurant in ${city.name}, rated.`}
          body={`Open the map, zoom into ${city.areas[0].name} or anywhere else in ${city.name}, and filter by Tabelog score, cuisine, price and what's open now.`}
          label={`Open ${city.name} on the map`}
        />

        <section className="site-section">
          <h2 className="site-h2">Other cities</h2>
          <ul className="site-links">
            {others.map((c) => <li key={c.slug}><Link href={cityUrl(c.slug)}>Best restaurants in {c.name}</Link></li>)}
          </ul>
          <p className="site-more p2">
            Or browse by cuisine: {city.cuisines.map((cc, i, arr) => (
              <span key={cc.cuisine}><Link href={cuisineUrl(cc.cuisine)}>{cuisineBySlug(cc.cuisine)!.name}</Link>{i < arr.length - 1 ? ", " : ""}</span>
            ))}.
          </p>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
