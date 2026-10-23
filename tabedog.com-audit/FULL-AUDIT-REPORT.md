# TabeDog (tabedog.com) — Full SEO Audit
**Date:** 2026-10-22 · **Scope:** live site (103 sitemap URLs crawled) + source at `/Users/josephliao/Projects/tabelog-map` · **Business type:** consumer web app / travel-food discovery (programmatic SEO hubs)

## SEO Health Score: 60 / 100

| Category | Weight | Score | Notes |
|---|---|---|---|
| Technical SEO | 22% | 72 | Clean SSR, canonicals, sitemap; proxy breaks 404s, `/` dynamic, www dup |
| Content Quality | 23% | 48 | Cuisine hubs strong; 70 city×cuisine pages thin/doorway-like; E-E-A-T 33 |
| On-Page SEO | 20% | 60 | Unique titles/H1s, but all titles >60 chars, descs 161–334, cannibalization, template bugs |
| Schema | 10% | 65 | Valid JSON-LD; broken breadcrumbs, SVG logo, Article missing dates |
| Performance | 10% | 65 | Hubs cached & fast; `/` uncacheable + 214 KB maplibre chunk up-front |
| AI Search Readiness | 10% | 56 | All AI bots allowed; zero brand mentions, no named restaurants to cite |
| Images | 5% | 60 | 37 MB of unused originals public; no og:image on 102/103 pages |

Search-experience gap (separate score): **32/100** on hub pages — the page type doesn't match what ranks.

---

## Executive summary

The technical foundation is better than most new sites: every URL is server-rendered, returns 200, has a self canonical, one H1, unique title and full content in raw HTML. The problems are **strategic, not technical**:

### Top 5 critical issues
1. **The hub pages don't name any restaurants.** "Best ramen in Tokyo" and similar searches are ~90% listicles of named shops. TabeDog's 70 city×cuisine pages list neighbourhoods only, and only ~7% of each page (the 30–70-word blurb) is unique. That fits Google's doorway / scaled-content-abuse profile (`findings/content.md`, `findings/sxo.md`).
2. **Every CTA dead-ends at a login wall.** All CTAs go to `/login` (which robots.txt blocks). Guest mode (`app/auth/guest`) is uncommitted, so `/auth/guest` returns 404 in production.
3. **No legal or trust pages live, but you sell a ¥500/month subscription.** `/terms`, `/privacy`, `/about` and `/contact` all redirect to `/login`. There's no operator name, no contact method, and no 特定商取引法 disclosure page.
4. **Unknown URLs never 404.** `lib/supabase/proxy.ts` gates every non-allowlisted path, so `/foo`, `/Tokyo`, `/manifest.webmanifest` and a future `/llms.txt` all 307 to `/login` and end on a 200. The result is soft-404s and lost crawl signals.
5. **Brand/trademark risk.** "TabeDog" is one letter off "Tabelog", "Tabelog in English" leads the title/H1/keywords, and the data comes from Tabelog's own pages (`lib/tabelog.ts:203`). Separately, the official Tabelog multilingual app (Nov 2025) undercuts the "only English app" claim. Legal review recommended.

### Top 5 quick wins (each under a day)
1. Redirect `www.tabedog.com` to the apex in Vercel Domains (currently both return 200).
2. Delete the 3 unreferenced originals in `public/` (13.5 + 9.0 + 14.8 MB, publicly downloadable).
3. Fix per-page OG/Twitter metadata. Page-level `openGraph` currently replaces the layout's, so 102/103 pages have no `og:image` and generic Twitter text. Add `opengraph-image.tsx` for `[city]`, `cuisine/[cuisine]` and `[city]/[cuisine]`.
4. Fix template bugs: "tsukemen tokyo tokyo" (~57 cases), heading grammar ("What kissaten & cafes costs"), lowercase cuisine names, blank area notes (Ogikubo, Kanda), and turn "Related searches" into real links or drop it.
5. Fix BreadcrumbList (add Home root; drop the `/#cuisines` fragment), use a PNG logo, and add `datePublished`/`dateModified` to Article.

---

## Technical SEO (72) — `findings/technical.md`
**Working:** 103/103 URLs 200, self canonicals, `index,follow`, 1 H1 each, unique titles/descs, single-hop 308s for trailing slash and http, SSR content, no orphans, `dynamicParams=false` gives real 404s for `/tokyo/foo`.

| Sev | Finding | Fix |
|---|---|---|
| High | `/` is `private, no-store`, x-vercel-cache MISS. `app/page.tsx:15-23` reads cookies + `getUser()` | Split landing (static) from app shell; rewrite in proxy by session cookie |
| High | Unknown paths 307 to `/login`, so there are no 404s | Gate only `/api/*` + app routes in the proxy; let everything else hit `not-found` |
| High | Prod lags local: `/terms`, guest mode, proxy allowlist are uncommitted | Commit + deploy together |
| Med | `www` returns 200 (duplicate host) | 308 to the apex |
| Med | `/login` is indexable but blocked in robots, with no own title | `noindex` it; remove the robots disallow so Google can see the noindex |
| Med | Only HSTS is sent; no XCTO / Referrer-Policy / Permissions-Policy / frame-ancestors | `headers()` in `next.config.ts` |
| Med | Sitemap `lastmod` is hard-coded 2026-10-20 on every URL | Use real per-page dates |
| Low | robots `Host:` is non-standard; `/favicon.ico` 404 | Remove `host`; add `app/icon.png` / `favicon.ico` |

## Content quality (48) — `findings/content.md`
**Working:** cuisine hubs are knowledgeable and 86% unique; readability is grade 8–9; almost no AI-cliché phrasing; solid hub-and-spoke linking.

- **Critical:** 70 city×cuisine pages are doorway-like (34% unique 5-gram ratio, 0.28 at worst). Either add real restaurant lists + page-specific copy, or fold the thinnest (kyoto/tempura, osaka/ramen, kobe/izakaya, kobe/sushi, hiroshima/izakaya, nara/izakaya…) into city hubs and `noindex` until enriched.
- **Critical:** there are no About / Privacy / Terms / Contact / 特商法 pages live.
- **High:** no author, methodology or data-source explanation ("how we get scores, how often refreshed").
- **High:** unsupported superlatives: "#1 App", "only English app… for every restaurant in Japan". This is also a 景品表示法 risk in Japan.
- **Medium:** fabricated template claims (e.g. "Sanjo-dori has Nara's highest concentration of izakaya open after 23:00"), plus a wrong "lower end on price" line for kaiseki and steak pages.
- **Medium:** factual errors:
  - "Kyoto's kissaten are the oldest" — wrong; Tokyo had the first in 1888.
  - Iekei ramen originated in Shin-Sugita, not "near Shin-Yokohama".
  - Tonkotsu is credited to Kurume.
  - "Tokyo scores skew low" — wrong; Tabelog uses one national scale.
  - 3.5 is described as both "top 3%" and "top 5%".
  - "30,000 ramen shops" has no source.

## On-page SEO (60)
- All 103 titles are 62–81 chars (truncated). All descriptions are 161–334 chars, and 102/103 end in one of three stock closers.
- **Cannibalization:** home + 82 titles contain "Tabelog… in English", and the "Is Tabelog available in English" FAQ appears on all 12 city hubs. Give that intent to one dedicated `/tabelog-english` page and use "best {cuisine} in {city}" elsewhere.
- Footer/CTA blocks use H2s, which dilutes the outline. In-text contextual links are sparse.
- "Related searches" is an unlinked keyword dump. Remove it (it reads as keyword stuffing).

## Schema (65) — `findings/schema.md`
Valid JSON-LD everywhere: Organization, WebSite, WebApplication + offers, FAQPage, BreadcrumbList, Article/WebPage. To fix:
- Breadcrumbs: missing Home root, and the fragment URL.
- SVG logo: Google needs a raster ≥112 px.
- No `sameAs`.
- Article lacks dates and image (or switch to CollectionPage).
- `#org` / `#website` `@id`s are only defined on the home page.
- WebApplication lacks `provider` and `priceSpecification` (P1M).
- FAQ rich results are retired, so the FAQPage markup gives no SERP benefit. Harmless to keep.
- Add `ItemList` once restaurants are listed (no `aggregateRating` from Tabelog scores).

## Performance (65) — `findings/performance.md`
PSI was rate-limited (429), so there's no lab or field data. These results are inferred from measurement and code.
- Hubs: TTFB about 0.2 s (CDN HIT), about 201 KB JS. Likely pass CWV.
- `/`: TTFB about 0.45 s (no-store), about 430 KB JS of which 214 KB brotli is maplibre-gl, statically imported via `components/landing.tsx` → `landing-map.tsx`. Three `MiniMap` WebGL contexts exist on the page. That's an LCP/INP risk on mobile.
- Fixes:
  - Static `/`.
  - Lazy-load maplibre (`import()` on IntersectionObserver/idle), with a static image placeholder.
  - Add an `images` config with AVIF and trimmed `deviceSizes`.
  - Recompress the 0.5–1.1 MB sources in `public/img`.
  - Drop the italic Urbanist if unused.

## Images (60)
- 37 MB of unused originals are in `public/`.
- City and city×cuisine pages have no images at all, so there's nothing for image search or AI multimodal answers.
- 102/103 pages have no `og:image`.
- Some decorative `alt=""` is fine; give cuisine tiles real alt text if the tile link text doesn't name the cuisine.

## AI search readiness (56) — `findings/geo.md`
**Working:** all AI crawlers are allowed and served full SSR (tested 13 UAs; no Vercel challenge); semantic HTML; answer-first FAQs of 22–81 words.
- No named entities to cite, so "best ramen in Tokyo Tabelog" can't be answered from TabeDog.
- Zero brand mentions (the domain is 3 days old). Launch on Product Hunt / Show HN, post genuinely on Reddit (r/JapanTravel, r/ramen), and make YouTube explainers. Then add `sameAs`.
- No `llms.txt`, which would be login-walled today anyway because of the proxy.
- Copy says Tabelog details are "Japanese only" while the app scrapes `s.tabelog.com/en`. That's an accuracy issue LLMs will notice.

## Search experience (32/100 on hubs) — `findings/sxo.md`
Competitors: tabelog.com/en (including official ranking pages), the Tabelog app, Google Maps, byFood, Lonely Planet, Time Out, Wanderlog, JustOneCookbook explainers, and Reddit.

New page types with clear SERP demand:
- `/tabelog-score` — what a 3.5 means; a high-intent informational query with no page today.
- `/tabelog-english` — an honest comparison of tabelog.com/en, the official app and TabeDog.
- `/best-restaurant-apps-japan`
- Hyakumeiten / Top 100 lists
- Area pages, e.g. `/tokyo/shinjuku`
- Data-driven filters: late-night, card-friendly, open-now
- An original-data piece, e.g. "% of 3.5+ restaurants that are cash-only, by city". This is the most linkable asset.

Persona scores on `/tokyo/ramen`:

| Persona | Score |
|---|---|
| Foodie | 27 |
| Booker | 35 |
| First-time tourist | 36 |
| Expat | 50 |
| Score-researcher | 65 |

---
*Limitations:* No GSC, GA4 or CrUX access. PSI was quota-limited. Reddit and LinkedIn mentions couldn't be checked. SERP features were inferred from web search, not a live Google SERP. Raw crawl data is in `raw/`.
