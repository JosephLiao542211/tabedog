# TabeDog (tabedog.com) — Content Quality & On-Page SEO Findings

Audit date: 2026-10-22. Scope: 103 sitemap URLs (1 home, 12 city hubs, 20 cuisine hubs, 70 city x cuisine pages), live HTML fetched 2026-10-22 (all 200), cross-checked against `lib/seo.ts` and the page templates. Framework: Google Search Quality Rater Guidelines (Sept 11, 2025), spam policies (scaled content abuse, doorways).

Method notes: Main-content text was extracted from `<main>` (header and footer excluded). Uniqueness = share of a page's 5-word shingles that appear on no other page in the same template group. The bundled `render_page.py` / `metadata_template.py` runtime is not set up on this machine ("Claude SEO runtime is not ready"), so pages were fetched with curl and the metadata-template check was reproduced with an equivalent deterministic string comparison.

Important deploy caveat: the live site runs the last commit. The uncommitted working tree adds `/terms` (with a privacy policy), makes `/terms` public in `lib/supabase/proxy.ts`, adds a footer link to it, and adds guest mode. On the live site today, `/terms`, `/privacy`, `/about` and `/contact` all return **307 to /login**.

---

## Scores

| Metric | Score |
|---|---|
| **Content quality (overall)** | **52 / 100** |
| E-E-A-T composite (weighted) | 33 / 100 |
| AI citation readiness | 50 / 100 |

### E-E-A-T breakdown (skill's internal weighting; Google publishes no weights)

| Factor | Weight | Score | Why |
|---|---|---|---|
| Experience | 20% | 25 | No first-hand signals at all: no "we ate here", no own photos (all Wikimedia Commons stock photos), no named restaurants, no dated visits. The writing has local texture (kaedama ¥100, morning sets before 10:00, Omicho nodoguro), which hints at real knowledge but is never attributed to anyone. |
| Expertise | 25% | 55 | Cuisine hubs are knowledgeable and mostly accurate (ordering etiquette, Kanto vs Kansai unagi, nishin soba 1880s, Taiwan ramen from Imaike). Undercut by no author, no credentials, several factual errors (see F-10), and template-made claims nobody checked. |
| Authoritativeness | 25% | 15 | New site, no About page, no outside citations or references, no press, no `sameAs` profiles. The Organization schema is just a name, URL and logo. |
| Trustworthiness | 30% | 35 | Good: clear non-affiliation disclaimer for Tabelog/Kakaku.com, photo credits, OSM attribution. Bad: no live privacy policy or terms while collecting emails and taking payments; no contact method anywhere; no operator identity; unproven "#1 App" and "only English app" claims; no Japanese Specified Commercial Transactions Act disclosure for a paid ¥500/month subscription. |

Weighted: 0.2x25 + 0.25x55 + 0.25x15 + 0.3x35 = **33**.

### Word counts (main content, live)

| Page type | Count | Min / median / max words | Floor | Status |
|---|---|---|---|---|
| Home | 1 | 1,719 | 500 | OK |
| City hub | 12 | 588 / 681 / 855 | ~500-600 (location) | OK |
| Cuisine hub | 20 | 500 / 628 / 1,075 | ~800 (guide/service) | Below on 18 of 20 |
| City x cuisine | 70 | 520 / 620 / 710 | n/a, see uniqueness | Bulk is reused text |

### Uniqueness (5-gram shingles, main content only)

| Group | Mean unique ratio | Mean pairwise Jaccard | Worst pairs |
|---|---|---|---|
| Cuisine hubs (20) | **0.86** | 0.08 | kushikatsu vs okinawan 0.11 |
| City hubs (12) | **0.77** | 0.14 | kanazawa vs nara 0.16 |
| **City x cuisine (70)** | **0.34** (min 0.28 kyoto/sushi, osaka/izakaya, okinawa/izakaya) | 0.14 overall; **0.26 same-city siblings, 0.27 same-cuisine siblings** | kanazawa/izakaya vs nara/izakaya 0.34; kobe, hiroshima and nara izakaya pages 0.33 each |

On a city x cuisine page, the only text written for that exact page is the `cc.blurb` (**30-70 words, median 45**), the area list and 2-3 long-tail phrases. That is about **7% of a ~620-word page**. Everything else is reused: the national price ranges (`cuisine.lunch/dinner`), `city.tabelog` (shown twice per page), the first sentence of `cuisine.score`, area notes from the city hub, 6 template FAQs and link lists.

---

## Findings

### F-01 [CRITICAL] City x cuisine pages promise "Best X in Y" but name no restaurants (doorway / scaled-content risk)
- **Evidence:** All 70 pages have titles like "Best Sushi in Tokyo: Top-Rated on Tabelog, in English" and H1s like "Best sushi in Tokyo", but no restaurant is named, listed, scored or mapped on any of them. All 6 primary CTAs per page (`Show sushi near me in Tokyo`, `Open sushi in Tokyo`, header buttons) go to `/login`, which robots.txt disallows. The unique text per page is about 45 words (unique-shingle ratio 0.34). The pages exist for every curated city x cuisine combination, and their main job is to send users into the gated app. That is the pattern Google's doorway policy names: "pages that funnel users to the usable or relevant portion of the site". It also matches the QRG "Lowest/Low: main content does not satisfy the purpose stated in the title".
- **Mitigating:** the combinations are hand-picked (70, not 12x20=240), and the blurbs are specific and mostly accurate. Today this is more a "Low quality / unhelpful" risk than a likely manual action. It turns into scaled-content-abuse risk if the matrix grows.
- **Fix (pick one per page):**
  1. **Enrich.** Server-render a ranked list of 10-15 actual restaurants per page from the app's own cached data (name in English and Japanese, Tabelog score, area, price band, cash/card, a link to the Tabelog listing). Add `ItemList` schema. Make the CTA deep-link to the map pre-filtered to the city and cuisine in guest mode (the new `app/auth/guest` flow makes this possible) instead of `/login`. Each page needs at least ~150-250 words of its own writing: a local specialty to order, a seasonality note, one "how locals do it here" tip, and the queue or booking situation in that city.
  2. **Consolidate.** For the thinnest pages (blurb under 40 words: kyoto/tempura 30, osaka/ramen 31, kobe/izakaya 31, kobe/sushi 32, hiroshima/izakaya 34, nara/izakaya 34) and the near-duplicate izakaya set (kanazawa, nara, kobe, hiroshima, okinawa, sapporo), fold the content into an anchored section of the city hub, 301 the URL there and drop it from `app/sitemap.ts`. Or `noindex` it until it is enriched.
- Also: change the comment in `lib/seo.ts` line 2 ("so each page says something only it can say"). For the city x cuisine template, that is true of about 45 words.

### F-02 [CRITICAL] No live privacy policy, terms, contact or operator identity (Trust)
- **Evidence:** Live `/terms`, `/privacy`, `/about`, `/contact` all 307 to `/login?next=...`. The live footer has no terms link (it exists only in the uncommitted `components/site.tsx`). The site collects emails and passwords (Supabase), approximate location and IP hashes, and sells a subscription through Stripe. No email address, contact form, company name or person is shown anywhere. Even the new terms text says "contacting us" without saying how.
- **Fix:** Deploy the `/terms` page and the `proxy.ts` public-path change. Add a contact email (for example support@tabedog.com) to the footer and the privacy section. Add a **特定商取引法に基づく表記 (Specified Commercial Transactions Act) page**. It is expected for paid digital subscriptions sold to consumers in Japan and is a strong trust signal with Japanese users and with Stripe. Add the pages to `PUBLIC_PATHS` and to the sitemap.

### F-03 [HIGH] No About page / no "who is behind this" / no methodology (E-E-A-T)
- **Evidence:** No About page. The Organization schema has only name, URL and logo. Articles are authored by `#org`. Nothing says who built TabeDog, why, whether they live in or travel to Japan, or how restaurant data is fetched, translated (machine or AI?) and refreshed. "Every restaurant in Japan" and "the free map covers every Tabelog listing" are stated with no explanation.
- **Fix:** Create `/about` with the founder's name, photo, Japan connection and contact. Create `/how-it-works` (methodology): where data comes from, how often it refreshes, how translation works, what "open now" is based on, known limits ("hours can be out of date; check before you go"). Add `founder`, `email`, `sameAs` (X/GitHub/Product Hunt) and `foundingDate` to the Organization schema. Add a visible "Written by <name>, last reviewed <date>" byline on city and cuisine guides with a `Person` author in the Article schema.

### F-04 [HIGH] Unproven superlatives in title, meta and FAQ
- **Evidence:** Home title "The #1 App for Eating Like a Local in Japan". Meta "TabeDog is the best app...". FAQ "TabeDog is the only English app that shows Tabelog ratings for every restaurant in Japan... which is why travelers and residents use it". Footer "It is the #1 app for eating like a local in Japan". Nothing backs any of these up (no user count, ranking or award). The QRG treats unsupported claims as a trust negative. In Japan, unsupported "No.1" claims are also a known Premiums and Representations Act (景品表示法) enforcement area.
- **Fix:** Replace with checkable claims: "Tabelog scores in English, on a map", "Free English map of Tabelog-rated restaurants across Japan". Drop "only" and "#1" unless you can cite evidence.

### F-05 [HIGH] Templated metadata at scale; every title and description over length limits
- **Evidence:** 102 of 103 descriptions end with one of 3 stock closing phrases:
  - "Where to find it (…), what it costs, what score to look for, and how to order." x **70** (all city x cuisine pages)
  - "…, typical prices, what Tabelog score to look for, and how to order without Japanese." x **20**
  - "…on Tabelog, with hours and prices in English." x **12**
  - `site_risk`: high · `templated_ratio`: 0.99 · `shared_cta_phrases`: the three above.
  All 103 titles are 62-81 characters (all over ~60, so they get truncated; worst: `/cuisine/nabe` 81, `/cuisine/steak` 80, `/fukuoka/nabe` 79). All 103 descriptions are 161-334 characters (home 326, kanazawa/sushi 334). Every title string is still unique.
- **Fix:** Cut titles to 60 characters or less and move the differentiator to the front, for example `Best Sushi in Tokyo: Tabelog Top-Rated Counters` (49) or `Ginza Lunch Omakase & Tokyo Sushi by Tabelog Score`. Drop " | TabeDog" on long titles (`title.absolute`). Write descriptions of 140-155 characters by hand, or build them from `cc.blurb`'s first sentence only (no stock tail), with one concrete fact (price, area, score threshold) per page.

### F-06 [HIGH] Keyword cannibalization on "Tabelog ... English"
- **Evidence:** "Tabelog" + "English" appears in **all 83 city and city x cuisine titles** ("Tabelog Ratings in English" x12, "Top-Rated on Tabelog, in English" x70) plus home ("Tabelog in English"). The FAQ "Is Tabelog available in English for {City}?" is repeated on 12 city hubs and answered on home. Each page competes with home for the head term "Tabelog English / Tabelog in English / Tabelog English app".
- **Fix:** Keep "Tabelog in English" for home only (and a future `/tabelog-english` guide, see F-14). City titles: target "best restaurants in {city}" / "where to eat in {city}". City x cuisine titles: target "{cuisine} in {city}" plus a local hook. Remove the per-city "Is Tabelog available in English" FAQ and link to the home/guide answer instead.

### F-07 [HIGH] "Related searches" are unlinked keyword lists, with doubled city names on many pages
- **Evidence:** Every city x cuisine and cuisine hub page shows a "Related searches" H2 with plain `<span>` tags (not links) of keyword phrases, each with the city name appended. When `cc.longtail` already contains the city, you get "standing sushi bar tokyo **tokyo**" (tokyo/sushi), plus 57 more doubled-city tokens across the city x cuisine pages (osaka x9, tokyo x9, hiroshima/nagoya/nara/sapporo x5…). Lowercase keyword lists with no function for users look like keyword stuffing to raters.
- **Fix:** Remove the section, or turn each item into a real link to a section or page that answers it (for example "lunch omakase ginza" goes to an anchor on the Tokyo sushi page). At minimum, stop appending `city.name` when the phrase already contains it (`app/[city]/[cuisine]/page.tsx`, the `searches.map` line).

### F-08 [MEDIUM] Templated FAQs that don't answer, plus template-made factual claims
- **Evidence:** All 70 city x cuisine pages have the same 5-6 questions:
  - "Which {cuisine} in {city} accepts credit cards?" The answer never names a place; it is the same app pitch 70 times.
  - "Which neighborhood in {city} should I stay in for {cuisine}?" Odd for kissaten, udon or curry. For 4 pages the area match fails and the template invents a claim: "It has the densest cluster of top-rated soba in Tokyo" (tokyo/soba → Kanda), tokyo/kissaten, kyoto/kissaten, nagoya/ramen.
  - The late-night FAQ asserts "{nightlife} is {city}'s late-night district and has the highest concentration of {cuisine} open after 23:00" for every late-night cuisine, for example "Sanjo-dori … Nara … izakaya", "highest concentration of chinese open after 23:00" (Kobe/Yokohama), "hot pot & motsunabe" in Nakasu. Nobody has checked these.
  - "What is a good Tabelog score for X in Y?" just joins `cuisine.score` + `city.tabelog`, the same paragraph already shown in the "Reading Tabelog scores" section on the same page.
  - All are marked up as FAQPage. Google has limited FAQ rich results to government and health sites since 2023, so the markup brings no SERP benefit, and 70 near-identical FAQ blocks add to the templated footprint.
- **Fix:** Keep 2-3 FAQs per page written for that page (for example tokyo/sushi: "Can I get into a Ginza counter without Japanese?", "Is Tsukiji sushi worth it after the market moved to Toyosu?"). Drop the cards and stay questions. Gate the late-night FAQ behind a per-city-cuisine field. Remove the duplicate score answer.

### F-09 [MEDIUM] Price claim is generated and wrong for premium cuisines
- **Evidence:** Every non-Tokyo page shows national price ranges, then "{City} usually sits toward the lower end of those ranges compared with Tokyo" (plus the same claim in the cost FAQ). That is false or misleading for **kyoto/kaiseki** (Kyoto's top kaiseki is as expensive as Tokyo's, ¥30,000-50,000+), **kobe/steak** (certified Kobe beef teppanyaki in Kobe is not discounted against Tokyo), **kanazawa/kaiseki** and **okinawa/steak**. The national ranges are also shown unchanged on every city page, so the "What X costs in Y" H2 has no city-specific numbers.
- **Fix:** Add optional `lunch`/`dinner` fields on `CityCuisine` with city-specific numbers, and only print the "lower than Tokyo" sentence when it has been checked to be true.

### F-10 [MEDIUM] Factual accuracy spot-checks

| Claim (location) | Issue | Fix |
|---|---|---|
| "Kyoto's kissaten are the oldest in Japan: coffee houses founded in the 1930s and 40s" (kyoto/kissaten blurb, `lib/seo.ts` l.390) | **Wrong.** Tokyo has older ones still running (Café Paulista Ginza, 1911), and Japan's first kissaten (Kahiichakan) opened in Tokyo in 1888. | "Kyoto has one of Japan's best-preserved kissaten cultures, with houses from the 1930s…" |
| "invented in Sapporo in the 1950s; thick, buttery, with corn and sweetcorn" (Sapporo dishes, l.440) | Says the same thing twice (corn = sweetcorn); a copy-editing slip that shows on the Sapporo hub and FAQ. | "…with butter and sweetcorn" |
| "This is where tonkotsu was invented" (fukuoka/ramen) | Imprecise. Pork-bone ramen is usually credited to **Kurume** (Nankin Senryo, 1937), in Fukuoka Prefecture but not Fukuoka city. Hakata-style is the later thin-noodle version. | "Tonkotsu was born in Kurume, an hour south; Hakata turned it into…" |
| Iekei ramen "invented at a single shop near Shin-Yokohama" (Yokohama intro, l.486) | **Wrong place.** Yoshimuraya opened in 1974 in Shin-Sugita (Isogo-ku) and later moved near Yokohama Station. | "…at Yoshimuraya in southern Yokohama" |
| "Japan has over 30,000 ramen shops" (cuisine/ramen) | High compared with commonly cited counts of ramen specialty shops (~20,000-25,000). No source given. | Cite a source or say "tens of thousands". |
| "Ueno is where tonkatsu was born" (Tokyo) | Disputed. Rengatei (Ginza, 1895) is usually credited with the katsuretsu; Ueno shops (Ponta Honke, Ponchiken) are credited with the thick tonkatsu style. | "Ueno is home to the oldest tonkatsu houses…" |
| "Ichijoji … Kyoto's own style … was born here" (kyoto/ramen) | Kyoto *kotteri* is linked to Tenka Ippin (Kitashirakawa, 1971) and dark shoyu to Shinpuku Saikan (near Kyoto Station). "More highly rated ramen shops per block than anywhere in Japan" can't be checked. | Soften to "one of Japan's densest ramen streets". |
| "Tokyo scores skew low because reviewers here have eaten everywhere" / "a 3.5 here is a top-3% restaurant" (Tokyo) | Tabelog scores are calculated on one national scale; there is no per-city skew. The 3% figure is about all of Japan. Landing says "top 3 to 5 percent" while the scale graphic says "Top 5%", which is inconsistent. | Pick one figure, cite Tabelog's own explanation, and remove the per-city skew claims (each city's `tabelog` field repeats this idea). |
| "Tabelog lists every restaurant in the country" / "Every restaurant in Japan" / "All of Tabelog" (home FAQ, hero meta, comparison table) | Overclaim. Tabelog lists most but not all restaurants, and it is unclear whether TabeDog serves the full set. | "Hundreds of thousands of Tabelog-listed restaurants across Japan". |
| "Ginza alone has more 3.8+ sushi counters than most countries" (tokyo/sushi, also the meta description) | Rhetorical and can't be checked, yet it is used as the meta description. | Give a real count from your data ("N sushi counters rated 3.8+ within 1 km of Ginza 4-chome"). |
| Okinawa treated as a city ("Best restaurants in Okinawa", "Okinawa's late-night district") | Okinawa is a prefecture; the content is really Naha plus Chatan. | Use "Okinawa (Naha)" in the H1 and title, or treat it as a region. |

Checked and accurate: Kanto steamed vs Kansai unagi; nishin soba (Matsuba, 1880s); Taiwan ramen (Misen, Imaike, 1970s); Napolitan from Hotel New Grand; kushikatsu in Shinsekai in 1929 (Daruma); Kobe beef certificate and ten-digit ID; Omicho Market ~300 years; taco rice from a base town (Kin); miso ramen in Sapporo in the 1950s; Yokohama Chinatown being Japan's largest; Tabelog scale of 1-5 with weighted reviewers.

### F-11 [MEDIUM] Grammar and casing bugs from the template (show in H1/H2/titles)
- **Evidence:**
  - Multi-word cuisine names break singular templates: "What **kissaten & cafes costs** in Nara", "Where **is** the best kissaten & cafes", "Which kissaten & cafes in Nara **accepts**", "Every **kissaten & cafes shop**", "Every hot pot & motsunabe shop".
  - Inconsistent title casing: "Best **Hot pot** & motsunabe in Fukuoka", "Best **Wagyu & teppanyaki** in Kobe" (title) vs lowercase in the H1.
  - Proper adjectives lowercased by `.toLowerCase()`: "Best cities for **chinese**", "Best **japanese curry** in Osaka", "Top-rated **okinawan**, … **chinese**", "Find **okinawan** near me", "highest concentration of **chinese** open after 23:00".
- **Fix:** Add `nounPlural: boolean`, `lower` (a display form that keeps Japanese/Chinese/Okinawan capitalized) and `titleName` fields to `Cuisine`, and stop calling `.toLowerCase()` on `name`. Rename "Kissaten & cafes" to "Kissaten" in templates, or make the copy work for a plural noun ("What a kissaten visit costs").

### F-12 [MEDIUM] Heading structure
- **Evidence:**
  - One H1 per page everywhere (good).
  - City x cuisine pages have 12 H2s, 4-5 of which are nav or CTA ("Every sushi shop in Tokyo, on one map.", "More in Tokyo", "Sushi in other cities", plus three footer H2s: "Restaurants by city", "Japanese food by cuisine", "Popular searches"). Footer column labels should not be H2s.
  - FAQ questions are `<h3>` inside `<summary>`, which is fine.
  - Cuisine hub "Tabelog score guide" sits as a second H2 inside the same column as "What X costs".
  - The live home page H2 order ("Why Tabelog…" before "The best app…") differs from the working tree. Confirm which order you want; the "best app" H2 targets a commercial query, while "why Tabelog" is the stronger informational hook.
- **Fix:** Make footer headings `<p>` or `<h2 class="sr-only">` once (a single "Site navigation" heading). Make CTA band titles `<p class="site-h2">`. Keep 4-6 content H2s per page.

### F-13 [MEDIUM] Internal linking
- **Good:** Clear hub-spoke structure. City hub → all its city x cuisine spokes. Cuisine hub → all city spokes (H3 links). Spoke → city hub, sibling spokes, cuisine hub ("Sushi in Japan: the guide") and same-cuisine spokes in other cities. Breadcrumbs plus BreadcrumbList on every page. Descriptive anchors ("Best ramen in Fukuoka").
- **Issues:**
  1. The breadcrumb on cuisine hubs points to `/#cuisines` (a fragment) and the BreadcrumbList `item` is `https://tabedog.com/#cuisines`. There is no real cuisines index or cities index page. Create `/cuisine` and `/cities` (or `/japan`) index pages and use them as breadcrumb parents.
  2. City x cuisine breadcrumb is Home > City > Cuisine. Consider showing the cuisine hub too, as a secondary "Part of: Sushi in Japan" link near the H1.
  3. Every page has ~50+ footer links (12 cities + 20 cuisines + 16 featured), so a single body link carries little weight. The body text itself has almost no contextual links: blurbs mention neighborhoods, dishes and other cities with no links (for example the kyoto/ramen blurb mentions "Kyoto Station" and the Fukuoka ramen blurb mentions "Nakasu yatai"). Add 2-4 in-text links per blurb to related spokes and hubs.
  4. Anchor text "Best X in Y" is repeated exactly on the hubs, footer and sibling lists. Vary it in body links ("Hakata tonkotsu shops", "Ginza lunch omakase").
  5. `/login` is the most-linked URL on every page (6 links per page) and is disallowed in robots.txt.

### F-14 [MEDIUM] Missing content opportunities (high intent, matches the brand)
Make each one a real, dated, authored page. These are what earn citations and links; city x cuisine variants will not.
1. **How Tabelog scores work** (`/guides/tabelog-scores`): the score distribution, why scores sit near 3.0, reviewer weighting, Hyakumeiten / Award / Bronze-Silver-Gold, score drops after the 2019 algorithm change, with a cited data table. Today this is spread across home, 12 city "Reading Tabelog scores" blocks and 20 cuisine "score guide" blocks, which also cannibalize each other.
2. **Tabelog vs Google Maps for restaurants in Japan** (`/guides/tabelog-vs-google-maps`): build out the comparison table currently hidden in a `<details>` on home, with real examples (same restaurant: Google 4.4 vs Tabelog 3.08). Follow the `seo-competitor-pages` standards: fair, dated, sourced.
3. **How to use Tabelog in English** (`/guides/tabelog-english`): the canonical target for "tabelog english", taking the pressure off home (see F-6).
4. **Tabelog Hyakumeiten (Top 100) explained** plus per-genre lists.
5. **How to book hard-to-get restaurants in Japan** (phone-only bookings, concierges, Omakase/TableCheck/Tabelog reservations, introductions only).
6. **Cash vs card in Japanese restaurants** (IC cards, QR payments). Your unique data (payment methods) supports original statistics such as "% of Tabelog 3.5+ ramen shops that are cash only, by city". That is the most citable asset the site could publish.
7. **About**, **How TabeDog works / data methodology**, **Contact**, **特定商取引法** (see F-02 / F-03).

### F-15 [LOW] Freshness signals
- **Evidence:** No visible "updated" date on any guide. Article JSON-LD has no `datePublished` or `dateModified` (0 of 103 pages). All sitemap `lastmod` values are the same hard-coded date (`CONTENT_UPDATED = 2026-10-20`). Prices and "open past midnight" claims go stale.
- **Fix:** Add `updated` per city/cuisine in `lib/seo.ts`, show "Last reviewed {date}" under the H1, emit `dateModified`, and use it as the per-URL sitemap `lastmod`.

### F-16 [LOW] Thin cuisine hubs
- 18 of 20 cuisine hubs are 500-770 words. Three hubs link to only one city (`/cuisine/kushikatsu` → Osaka, `/cuisine/nabe` → Fukuoka, `/cuisine/okinawan` → Okinawa), so the "Best cities for X" section has one card and "Which city in Japan is best for X?" answers with a single city. Either expand them (variants, regional styles, what to order, 600+ words of your own text) or merge them with their one city page and 301.

### F-17 [LOW] Readability and AI-typical phrasing
- Readability is good for a travel audience: Flesch Reading Ease about 49-58, Flesch-Kincaid grade about 8-9, average sentence length 10-12 words. The longest sentences (52-65 words) are the home meta-style paragraphs and the footer "about" text.
- There are almost none of the usual AI markers ("delve", "nestled", "vibrant", "tapestry", "hidden gem" = 0 hits). The prose is specific and opinionated, which is a plus.
- Repetitive patterns that read as templated across pages: "worth crossing the city" (25 uses on 13 pages), "the only way" to pick… (15 uses on 8 pages), "tourist traps" (15 uses on 13 pages), "genuinely" (19), "locals" (94 uses on 44 pages), "Tabelog" about 8 per page (868 total). The tourist-trap FAQ and the "Use the Tabelog score, not the sign" answer are the same on all 12 city hubs. Vary them or keep them on home only.
- Hero microcopy "Sit. Stay. We'll fetch the best bowl in the neighborhood." gives the brand personality. Keep it.

### F-18 [LOW] Brand and data-source transparency
- The name "TabeDog" plus the tagline "Tabelog in English" invites confusion with Tabelog. The footer disclaimer is good, but it sits in small print. Repeat a one-line "Independent; not affiliated with Tabelog" on the About and methodology pages, and in the hero sub-line on the home page.
- The site says data is "pulled from its Tabelog listing" and "built on public Tabelog listings". Raters and users will reasonably ask whether this is licensed. Tabelog's terms of use restrict reuse of its content. This is outside the SEO scope, but it is a material trust and business risk. Clarify the data relationship on the methodology page (linking out per restaurant, scores attributed) and get your own legal read.

---

## AI citation readiness (50/100)
- **Strengths:** short, quotable, declarative facts ("A 3.5 ramen shop is genuinely excellent and will have a queue"; "Tokyo-style unagi is steamed before grilling"); clean H2/H3 hierarchy; question-form headings; BreadcrumbList, Article and WebApplication schema; server-rendered HTML (not an SPA shell for public pages).
- **Gaps:** no sources or citations for statistics; no author or date (models prefer attributable, dated sources); claims are inconsistent across pages (3.5 = "top 3%" vs "top 5%"); no original data tables. Publishing one dataset-backed page (see F-14 #6) and a methodology page would raise this most.

## Priority order
1. Deploy terms/privacy, add contact and 特商法 pages, About and methodology (F-02, F-03).
2. Remove "#1" and "only" claims (F-04).
3. Enrich or consolidate the 70 city x cuisine pages: real restaurant lists, guest-mode deep-link CTAs, page-specific copy; noindex or merge the six thinnest and the izakaya cluster (F-01).
4. Rewrite titles and descriptions to fit length limits and remove the stock tails; de-cannibalize "Tabelog English" (F-05, F-06).
5. Remove or fix "Related searches", fix the template grammar, rebuild the FAQs (F-07, F-08, F-11).
6. Correct the facts in F-10 and the price logic in F-09.
7. Publish the guide pages in F-14, starting with "How Tabelog scores work" and "Tabelog vs Google Maps".
