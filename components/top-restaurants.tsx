// Server-rendered "top on Tabelog" list for the public city and city × cuisine pages, plus its ItemList schema.
import { SITE } from "@/lib/seo";
import type { Ranking } from "@/lib/rankings";

const asOf = (iso: string) => new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "Asia/Tokyo" });

export function TopRestaurants({ ranking, title, intro }: { ranking: Ranking; title: string; intro: string }) {
  if (!ranking.items.length) return null;
  return (
    <section className="site-section" id="top">
      <h2 className="site-h2">{title}</h2>
      <p className="p1">{intro}</p>
      <ol className="site-rank">
        {ranking.items.map((r) => (
          <li key={r.id}>
            <div className="site-rank-main">
              <a href={r.url} rel="nofollow noopener" target="_blank" className="site-rank-name">{r.name}</a>
              <span className="p2">{[r.genre, r.station].filter(Boolean).join(" · ")}</span>
            </div>
            <div className="site-rank-meta">
              <strong className="site-rank-score" aria-label={`Tabelog score ${r.rating?.toFixed(2)}`}>{r.rating?.toFixed(2)}</strong>
              <span className="sub">{r.reviews.toLocaleString("en-US")} reviews</span>
              {(r.dinner || r.lunch) && <span className="sub">{r.dinner ? `Dinner ${r.dinner}` : `Lunch ${r.lunch}`}</span>}
            </div>
          </li>
        ))}
      </ol>
      <p className="sub">
        Ranked by Tabelog score as of {asOf(ranking.fetchedAt)}, refreshed daily from <a href={ranking.source} rel="nofollow noopener" target="_blank">Tabelog's ranking</a>.
        Prices are Tabelog's per-person budget bands. Check hours and book with the restaurant before you go.
      </p>
    </section>
  );
}

/** schema.org ItemList of the ranked restaurants. No aggregateRating: the scores are Tabelog's, not ours. */
export function rankingSchema(ranking: Ranking, name: string, url: string, cityName: string) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name,
    url: `${SITE.url}${url}`,
    numberOfItems: ranking.items.length,
    itemListOrder: "https://schema.org/ItemListOrderDescending",
    itemListElement: ranking.items.map((r, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: {
        "@type": "Restaurant",
        name: r.name,
        sameAs: r.url,
        ...(r.genre ? { servesCuisine: r.genre } : {}),
        address: { "@type": "PostalAddress", addressLocality: cityName, addressCountry: "JP" },
      },
    })),
  };
}
