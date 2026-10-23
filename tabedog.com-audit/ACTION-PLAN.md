# TabeDog SEO Action Plan

## Critical (this week)
- [ ] **Deploy the uncommitted work** (`/terms`, guest mode, proxy allowlist, footer link). Prod currently login-walls `/terms`, and `/auth/guest` 404s.
- [ ] **Proxy: stop redirecting unknown paths to `/login`** (`lib/supabase/proxy.ts`). Gate only app/API routes and let everything else 404.
- [ ] **Publish legal/trust pages:** `/privacy`, `/terms`, `/about` (who runs it, how data is sourced/refreshed), contact, 特定商取引法に基づく表記 (required for the ¥500 subscription).
- [ ] **Decide on the city×cuisine pages:** enrich them with real restaurant lists, or `noindex` + consolidate the thinnest ~20 until they are enriched.
- [ ] **Legal review of the name and Tabelog usage**, plus Tabelog ToS for republishing scores. Remove "#1 App" and "only English app" claims.

## High (weeks 1–2)
- [ ] Server-render a top 10–20 restaurant list on every city×cuisine (and city) page. Reuse the `lib/landing.ts` pipeline and cache daily. Each entry gets: EN/JA name, score, reviews, station, price, payment, hours. Add `ItemList` schema and an "Scores as of {date}" line.
- [ ] Point CTAs to a pre-filtered guest map (`/app?city=tokyo&genre=ramen`), not `/login`.
- [ ] Make `/` static: move the auth branch into the proxy (rewrite to the app shell when the session cookie is present).
- [ ] Lazy-load maplibre on the landing page; use a static map image as the LCP placeholder.
- [ ] Per-page OG images and Twitter metadata (shared `pageMetadata()` helper plus `opengraph-image.tsx` in each route).
- [ ] Shorten titles to ≤60 chars and descriptions to ~150, and de-template the closers. Take "Tabelog in English" off city×cuisine titles (cannibalization).
- [ ] Fix template bugs: doubled city names, heading grammar and casing, blank area notes, the "Related searches" block, fabricated and incorrect claims (see `findings/content.md` item 9).
- [ ] 301 `www` to the apex. Delete the 37 MB of unused images in `public/`.

## Medium (month 1)
- [ ] Schema fixes: breadcrumbs with a Home root, PNG logo, `sameAs`, Article dates/image (or CollectionPage), WebApplication `provider` + `priceSpecification`.
- [ ] New pages: `/tabelog-score`, `/tabelog-english`, `/best-restaurant-apps-japan`, Hyakumeiten lists.
- [ ] Add images to hub pages: a map preview and dish photos with real alt text.
- [ ] Security headers; real sitemap `lastmod`; `noindex` `/login` and drop it from robots; add a favicon; remove robots `Host`.
- [ ] Add `llms.txt` (after the proxy fix), and an `images` config with AVIF.

## Ongoing
- [ ] Brand mentions: Product Hunt / Show HN, genuine Reddit participation, YouTube explainers. Then add the profiles to `sameAs`.
- [ ] An original-data study ("cash-only rate of top-rated restaurants by city") for links and AI citations.
- [ ] Area pages (`/tokyo/shinjuku`) and data filters (late-night, card-friendly) once restaurant lists exist.
- [ ] Set up Google Search Console + Bing Webmaster and submit the sitemap. Re-run PSI with an API key for real CWV.
