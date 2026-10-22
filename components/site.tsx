// Chrome shared by every public page: header, SEO footer, JSON-LD helper, FAQ block, CTA band.
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Logo } from "./icons";
import { CITIES, CUISINES, FEATURED, SITE, cityCuisineUrl, cityUrl, cuisineUrl, type Faq } from "@/lib/seo";

export function JsonLd({ data }: { data: object | object[] }) {
  const list = Array.isArray(data) ? data : [data];
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(list.length === 1 ? list[0] : list).replace(/</g, "\\u003c") }}
    />
  );
}

export const faqSchema = (faqs: Faq[]) => ({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
});

export const breadcrumbSchema = (items: { name: string; url: string }[]) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.name, item: `${SITE.url}${it.url}` })),
});

export function SiteHeader() {
  return (
    <header className="site-header">
      <Link href="/" className="site-brand" aria-label="TabeDog home">
        <Logo size={24} />
        <span className="site-brand-name">TabeDog</span>
      </Link>
      <nav className="site-nav" aria-label="Primary">
        <Link href="/#cities">Cities</Link>
        <Link href="/#cuisines">Cuisines</Link>
        <Link href="/#premium">Premium</Link>
        <Link href="/#faq">FAQ</Link>
      </nav>
      <div className="site-actions">
        <Link href="/login" className="site-link">Sign in</Link>
        <Link href="/login" className="site-btn">Open the map</Link>
      </div>
    </header>
  );
}

export function Breadcrumbs({ items }: { items: { name: string; url: string }[] }) {
  return (
    <nav className="site-crumbs sub" aria-label="Breadcrumb">
      <ol>
        <li><Link href="/">Home</Link></li>
        {items.map((it, i) => (
          <li key={it.url} aria-current={i === items.length - 1 ? "page" : undefined}>
            {i === items.length - 1 ? <span>{it.name}</span> : <Link href={it.url}>{it.name}</Link>}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function FaqSection({ faqs, title }: { faqs: Faq[]; title: string }) {
  return (
    <section className="site-section" id="faq">
      <h2 className="site-h2">{title}</h2>
      <div className="site-faq">
        {faqs.map((f) => (
          <details key={f.q}>
            <summary><h3>{f.q}</h3></summary>
            <p className="p2">{f.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

export function CtaBand({ title, body, label = "Open the map", href = "/login", image }: { title: string; body: string; label?: string; href?: string; image?: string }) {
  return (
    <section className={`site-cta${image ? " site-cta-photo" : ""}`}>
      {image && <Image src={image} alt="" fill sizes="100vw" className="site-cta-img" />}
      <div className="site-cta-body">
        <h2 className="site-h2">{title}</h2>
        <p className="p1">{body}</p>
        <Link href={href} className="site-btn site-btn-lg">{label} <ArrowRight /></Link>
      </div>
    </section>
  );
}

export function SiteFooter() {
  const topCuisines = CUISINES;
  return (
    <footer className="site-footer">
      <div className="site-footer-grid">
        <div>
          <h2 className="sub">Restaurants by city</h2>
          <ul>
            {CITIES.map((c) => (
              <li key={c.slug}><Link href={cityUrl(c.slug)}>Best restaurants in {c.name}</Link></li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="sub">Japanese food by cuisine</h2>
          <ul>
            {topCuisines.map((c) => (
              <li key={c.slug}><Link href={cuisineUrl(c.slug)}>{c.name} in Japan</Link></li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="sub">Popular searches</h2>
          <ul>
            {FEATURED.map((f) => (
              <li key={f.city + f.cuisine}><Link href={cityCuisineUrl(f.city, f.cuisine)}>{f.label}</Link></li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="sub">TabeDog</h2>
          <ul>
            <li><Link href="/login">Sign in</Link></li>
            <li><Link href="/login">Create a free account</Link></li>
            <li><Link href="/#premium">TabeDog Premium</Link></li>
            <li><Link href="/#best-app">Best app for restaurants in Japan</Link></li>
            <li><Link href="/#faq">Tabelog ratings explained</Link></li>
            <li><Link href="/#how">How TabeDog works</Link></li>
            <li><a href="https://tabelog.com/en/" rel="nofollow noopener" target="_blank">Tabelog (official site)</a></li>
          </ul>
        </div>
      </div>
      <div className="site-footer-about">
        <p className="p2">
          <strong>TabeDog</strong> is an English map of Japan's restaurants built on Tabelog ratings, the scores Japanese diners actually use.
          Find authentic sushi, ramen, yakiniku, izakaya, kaiseki and more in Tokyo, Osaka, Kyoto, Fukuoka and every other city in Japan,
          with opening hours, price ranges and accepted payment methods in English. It is the #1 app for eating like a local in Japan:
          the free map covers every Tabelog listing, and Premium adds saved lists, AI restaurant recommendations, AI search and curated local guides.
        </p>
        <p className="sub">
          TabeDog is an independent project and is not affiliated with, endorsed by or connected to Tabelog or Kakaku.com, Inc.
          Tabelog is a trademark of Kakaku.com, Inc. Ratings are shown with a link to their source. © {new Date().getFullYear()} TabeDog.
        </p>
        <p className="sub">
          Map data © <a href="https://openfreemap.org" rel="noopener" target="_blank">OpenFreeMap</a>, <a href="https://www.openmaptiles.org/" rel="noopener" target="_blank">OpenMapTiles</a> and <a href="https://www.openstreetmap.org/copyright" rel="noopener" target="_blank">OpenStreetMap</a> contributors.
        </p>
      </div>
    </footer>
  );
}
