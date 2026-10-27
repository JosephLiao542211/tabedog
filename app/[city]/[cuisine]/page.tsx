import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SITE, allCityCuisinePages, mapHref, citiesForCuisine, cityBySlug, cityCuisine, cityCuisineFaqs, cityCuisineUrl, cityUrl, cuisineBySlug, cuisineTerms, cuisineUrl } from "@/lib/seo";
import { Breadcrumbs, CtaBand, FaqSection, JsonLd, SiteFooter, SiteHeader, breadcrumbSchema, faqSchema } from "@/components/site";
import { TopRestaurants, rankingSchema } from "@/components/top-restaurants";
import { topRated } from "@/lib/rankings";
import { postsAbout } from "@/lib/blog-server";
import { FromTheBlog } from "@/components/blog/blog-ui";

type Props = { params: Promise<{ city: string; cuisine: string }> };

export const dynamicParams = false;
export const revalidate = 86400; // the Tabelog ranking refreshes daily
export function generateStaticParams() {
  return allCityCuisinePages().map(({ city, cuisine }) => ({ city: city.slug, cuisine: cuisine.slug }));
}

function load(cityS: string, cuisineS: string) {
  const city = cityBySlug(cityS);
  const cuisine = cuisineBySlug(cuisineS);
  const cc = city && cityCuisine(city, cuisineS);
  return city && cuisine && cc ? { city, cuisine, cc } : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await params;
  const d = load(p.city, p.cuisine);
  if (!d) return {};
  const { city, cuisine, cc } = d;
  const title = `Best ${cuisine.name} in ${city.name}: Top-Rated on Tabelog, in English`;
  const description = `${cc.blurb.split(". ")[0]}. Where to find it (${cc.areas.slice(0, 3).join(", ")}), what it costs, what score to look for, and how to order.`;
  const url = cityCuisineUrl(city.slug, cuisine.slug);
  return { title, description, alternates: { canonical: url }, openGraph: { title, description, url, type: "article" } };
}

export default async function CityCuisinePage({ params }: Props) {
  const p = await params;
  const d = load(p.city, p.cuisine);
  if (!d) notFound();
  const { city, cuisine, cc } = d;
  const faqs = cityCuisineFaqs(city, cuisine, cc);
  const url = cityCuisineUrl(city.slug, cuisine.slug);
  const crumbs = [{ name: city.name, url: cityUrl(city.slug) }, { name: cuisine.name, url }];
  const siblings = city.cuisines.filter((x) => x.cuisine !== cuisine.slug);
  const elsewhere = citiesForCuisine(cuisine.slug).filter((c) => c.slug !== city.slug);
  const lower = cuisine.name.toLowerCase();
  const [ranking, posts] = await Promise.all([topRated(city.tabelogArea, cuisine.code), postsAbout({ place: city.name, topics: cuisineTerms(cuisine) })]);
  const map = mapHref({ city, q: cuisine.code });

  return (
    <div className="site">
      <JsonLd data={[breadcrumbSchema(crumbs), faqSchema(faqs), ...(ranking.items.length ? [rankingSchema(ranking, `Top-rated ${lower} in ${city.name} on Tabelog`, url, city.name)] : []), {
        "@context": "https://schema.org",
        "@type": "Article",
        headline: `Best ${cuisine.name} in ${city.name}`,
        description: cc.blurb,
        inLanguage: "en",
        url: `${SITE.url}${url}`,
        author: { "@id": `${SITE.url}/#org` },
        publisher: { "@id": `${SITE.url}/#org` },
        about: [{ "@type": "City", name: city.name }, { "@type": "Thing", name: cuisine.name, alternateName: cuisine.ja }],
      }]} />
      <SiteHeader />
      <main>
        <section className="site-hero site-hero-page">
          <Breadcrumbs items={crumbs} />
          <p className="site-kicker">{city.ja} · {cuisine.ja}</p>
          <h1>Best {lower} in {city.name}</h1>
          <p className="site-lead">{cc.blurb}</p>
          <div className="site-hero-actions">
            <a href={map} className="site-btn site-btn-lg">Open {lower} in {city.name} on the map</a>
          </div>
        </section>

        <TopRestaurants
          ranking={ranking}
          title={`Top-rated ${lower} in ${city.name} on Tabelog`}
          intro={`The ${ranking.items.length} highest-scoring ${lower} restaurants in ${city.name} right now, by Tabelog score. Open the map to see where each one is, its hours and whether it takes cards.`}
        />

        <FromTheBlog title={`More on eating in ${city.name}`} posts={posts} />

        <section className="site-section">
          <h2 className="site-h2">Where to find the best {lower} in {city.name}</h2>
          <p className="p1">The neighborhoods where Tabelog's highest-rated {lower} in {city.name} clusters:</p>
          <ul className="site-areas">
            {cc.areas.map((a, i) => {
              const match = (x: { name: string }) => x.name.split(" & ").some((n) => a.includes(n) || n.includes(a));
              const area = city.areas.find(match);
              // two listed neighborhoods can share one city-area entry; show its note only once
              const seen = area && cc.areas.slice(0, i).some((b) => city.areas.find((x) => x.name.split(" & ").some((n) => b.includes(n) || n.includes(b))) === area);
              return <li key={a}><strong>{a}</strong>{area && !seen ? <span className="p2"> {area.note}</span> : null}</li>;
            })}
          </ul>
        </section>

        <section className="site-section site-two">
          <div>
            <h2 className="site-h2">What {lower} costs in {city.name}</h2>
            <dl className="site-dl">
              <dt>Lunch</dt><dd>{cuisine.lunch}</dd>
              <dt>Dinner</dt><dd>{cuisine.dinner}</dd>
            </dl>
            <p className="p2">
              <Link href={cuisineUrl(cuisine.slug)}>How to order {lower}, reservations and etiquette</Link> are on the {cuisine.name} guide.
            </p>
          </div>
          <div>
            <h2 className="site-h2">Reading Tabelog scores for {lower} in {city.name}</h2>
            <p className="p1">{city.tabelog}</p>
            <p className="p2">{cuisine.score.split(". ")[0]}.</p>
          </div>
        </section>

        <FaqSection title={`${cuisine.name} in ${city.name}: questions people ask`} faqs={faqs} />


        <CtaBand
          title={`Every ${lower} shop in ${city.name}, on one map.`}
          body={`TabeDog shows all of ${city.name}'s ${lower} with Tabelog scores, hours, prices and payment methods in English. Filter to what's open now.`}
          label={`Open ${lower} in ${city.name}`}
          href={map}
        />

        <section className="site-section">
          <h2 className="site-h2">More in {city.name}</h2>
          <ul className="site-links">
            <li><Link href={cityUrl(city.slug)}>Best restaurants in {city.name}</Link></li>
            {siblings.map((s) => <li key={s.cuisine}><Link href={cityCuisineUrl(city.slug, s.cuisine)}>Best {cuisineBySlug(s.cuisine)!.name.toLowerCase()} in {city.name}</Link></li>)}
          </ul>
          {elsewhere.length > 0 && (
            <>
              <h2 className="site-h2">{cuisine.name} in other cities</h2>
              <ul className="site-links">
                <li><Link href={cuisineUrl(cuisine.slug)}>{cuisine.name} in Japan: the guide</Link></li>
                {elsewhere.map((c) => <li key={c.slug}><Link href={cityCuisineUrl(c.slug, cuisine.slug)}>Best {lower} in {c.name}</Link></li>)}
              </ul>
            </>
          )}
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
