import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CUISINES, CUISINE_SLUGS, SITE, citiesForCuisine, cityCuisine, cityCuisineUrl, cuisineBySlug, cuisineFaqs, cuisineUrl, mapHref } from "@/lib/seo";
import { Breadcrumbs, CtaBand, FaqSection, JsonLd, SiteFooter, SiteHeader, breadcrumbSchema, faqSchema } from "@/components/site";

type Props = { params: Promise<{ cuisine: string }> };

export const dynamicParams = false;
export function generateStaticParams() {
  return CUISINE_SLUGS.map((cuisine) => ({ cuisine }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const cuisine = cuisineBySlug((await params).cuisine);
  if (!cuisine) return {};
  const cities = citiesForCuisine(cuisine.slug).map((c) => c.name);
  const title = `${cuisine.name} in Japan: Where to Eat It, Prices, and How to Order`;
  const description = `${cuisine.tagline}. Best cities for ${cuisine.name.toLowerCase()} (${cities.slice(0, 4).join(", ")}), typical prices, what Tabelog score to look for, and how to order without Japanese.`;
  const url = cuisineUrl(cuisine.slug);
  return { title, description, alternates: { canonical: url }, openGraph: { title, description, url, type: "article" } };
}

export default async function CuisinePage({ params }: Props) {
  const cuisine = cuisineBySlug((await params).cuisine);
  if (!cuisine) notFound();
  const cities = citiesForCuisine(cuisine.slug);
  const faqs = cuisineFaqs(cuisine);
  const url = cuisineUrl(cuisine.slug);
  const crumbs = [{ name: "Cuisines", url: "/#cuisines" }, { name: cuisine.name, url }];
  const lower = cuisine.name.toLowerCase();

  return (
    <div className="site">
      <JsonLd data={[breadcrumbSchema(crumbs), faqSchema(faqs), {
        "@context": "https://schema.org",
        "@type": "Article",
        headline: `${cuisine.name} in Japan`,
        description: cuisine.intro,
        inLanguage: "en",
        url: `${SITE.url}${url}`,
        author: { "@id": `${SITE.url}/#org` },
        publisher: { "@id": `${SITE.url}/#org` },
        about: { "@type": "Thing", name: cuisine.name, alternateName: cuisine.ja },
      }]} />
      <SiteHeader />
      <main>
        <section className="site-hero site-hero-page">
          <Breadcrumbs items={crumbs} />
          <p className="site-kicker">{cuisine.ja}</p>
          <h1>{cuisine.name} in Japan</h1>
          <p className="site-lead">{cuisine.tagline}.</p>
          <p className="p1 site-lead2">{cuisine.intro}</p>
          <div className="site-hero-actions">
            <a href={mapHref({ q: cuisine.code })} className="site-btn site-btn-lg">Find {lower} near me</a>
          </div>
        </section>

        <section className="site-section">
          <h2 className="site-h2">Best cities for {lower}</h2>
          <div className="site-cards">
            {cities.map((c) => {
              const cc = cityCuisine(c, cuisine.slug)!;
              return (
                <article key={c.slug} className="site-card">
                  <h3><Link href={cityCuisineUrl(c.slug, cuisine.slug)}>Best {lower} in {c.name}</Link></h3>
                  <p className="p2">{cc.blurb.split(". ").slice(0, 2).join(". ")}.</p>
                  <p className="sub">{cc.areas.join(" · ")}</p>
                </article>
              );
            })}
          </div>
        </section>

        <section className="site-section site-two">
          <div>
            <h2 className="site-h2">How to order {lower}</h2>
            <p className="p1">{cuisine.order}</p>
            <p className="p2">{cuisine.english}</p>
          </div>
          <div>
            <h2 className="site-h2">What {lower} costs</h2>
            <dl className="site-dl">
              <dt>Lunch</dt><dd>{cuisine.lunch}</dd>
              <dt>Dinner</dt><dd>{cuisine.dinner}</dd>
              <dt>Reservations</dt><dd>{cuisine.reservation}</dd>
            </dl>
            <h2 className="site-h2">Tabelog score guide</h2>
            <p className="p1">{cuisine.score}</p>
          </div>
        </section>

        <FaqSection title={`${cuisine.name} FAQ`} faqs={faqs} />

        <section className="site-section">
          <h2 className="site-h2">Related searches</h2>
          <ul className="site-tags">
            {cuisine.longtail.map((s) => <li key={s}><span>{s}</span></li>)}
          </ul>
        </section>

        <CtaBand
          title={`Every ${lower} shop in Japan, rated.`}
          body={`Open TabeDog, pick ${lower}, and see Tabelog's top-rated shops around you with hours, prices and payment methods in English.`}
          label={`Find ${lower} on the map`}
          href={mapHref({ q: cuisine.code })}
        />

        <section className="site-section">
          <h2 className="site-h2">Other cuisines</h2>
          <ul className="site-links">
            {CUISINES.filter((c) => c.slug !== cuisine.slug).map((c) => <li key={c.slug}><Link href={cuisineUrl(c.slug)}>{c.name} in Japan</Link></li>)}
          </ul>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
