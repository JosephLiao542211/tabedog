# SXO (Search Experience) Findings: tabedog.com

Audit date: 2026-10-22. Scope: the homepage, city hubs (`/tokyo`, `/kyoto`), cuisine hubs (`/cuisine/ramen`) and city x cuisine pages (`/tokyo/ramen`, `/osaka/sushi`). The page copy comes from `lib/seo.ts`.

**SXO Gap Score: 32/100 for the city x cuisine and city hub templates, 58/100 for the homepage.** This score is separate from the SEO Health Score.

---

## 1. Main finding: the page type does not match what ranks (CRITICAL)

Google ranks **named-restaurant listicles** and **map/local results** for "best ramen tokyo", "best sushi osaka" and "best restaurants kyoto". TabeDog's hub pages are **neighborhood and etiquette guides that never name a restaurant.** Every "Show / Open" button leads to `/login`.

What was checked on the live HTML for `/tokyo/ramen`, `/osaka/sushi`, `/kyoto` and `/cuisine/ramen`:
- **No restaurant is named anywhere.** There is no shop, no score, no address and no photo. The H2 "Where to find the best ramen in Tokyo" lists *neighborhoods* (Shinjuku, Ikebukuro, Shibuya, Ogikubo, Kanda). The answer in the FAQ schema to "Where is the best ramen in Tokyo?" is also a list of neighborhoods.
- Each page has about 1,000 to 1,450 words. Roughly 40% of that is site-wide link blocks (Restaurants by city, Cuisines, Popular searches, footer). The unique content is about 500 to 700 words, and much of it is shared through templates. For example, the Tokyo score-guide paragraph repeats almost word for word on `/tokyo`, `/tokyo/ramen` and in the FAQ.
- City, cuisine and city x cuisine pages have **0 `<img>`**. The homepage has about 10, and 6 of those have empty alt text.
- Every primary CTA ("Show ramen near me in Tokyo", "Open ramen in Tokyo", "Open the map", "Find restaurants near me") goes to `/login`. The live site has a **hard sign-in wall**: `/auth/guest` returns 404 in production, and guest mode exists only in uncommitted local code. A searcher who clicked "best ramen tokyo" gets no list and then hits a login form.
- The "Related searches" block shows broken strings built from templates: "tsukemen tokyo **tokyo**", "tokyo ramen top 100 **tokyo**". These are not links, and they read as keyword stuffing.

The pages promise "Best ramen in Tokyo" in the title and H1, then give no ranking. That gap is the main reason these pages are unlikely to rank, or to hold their position after users bounce back to Google.

| Template | What it is now (taxonomy) | What ranks in the SERP | Severity |
|---|---|---|---|
| `/[city]/[cuisine]` ("best ramen tokyo", "best sushi osaka") | Blog-style guide with a login CTA | Listicle that ranks named restaurants (Comparison/"best X") plus a local pack | **CRITICAL** |
| `/[city]` ("best restaurants kyoto") | Blog-style guide | Listicles with 10 to 44 named restaurants (insidekyoto, Fodor's, mai-ko, hamoni, hotels.com) | **CRITICAL** |
| `/cuisine/[x]` ("ramen in japan" / "how to order ramen") | Blog guide (Article schema) | Informational guides | ALIGNED / MEDIUM (no named shops, no images) |
| `/` ("tabelog english", "tabelog in english") | Landing + Hybrid | Tabelog's own site and app (navigational), explainer blogs (JustOneCookbook, real-japan-guide, Planetware), press | **MEDIUM**: the query is mostly navigational to Tabelog |
| no page ("tabelog score meaning") | Only an FAQ answer on `/` | Dedicated explainer posts (real-japan-guide, unseen-japan, Gigazine, Tabelog help page) | **HIGH**: no page exists |
| `/` ("japan restaurant app") | Landing | App Store listing (Tabelog app, Nov 2025), "best food apps in Japan" listicles (Nomad, Stripes) | **HIGH**: no store listing and no listicle presence |

## 2. SERP analysis by keyword

The WebSearch tool does not show Google SERP features such as PAA, the local pack or AI Overviews. The feature notes below are labeled as inference.

| Keyword | Top results observed | Main page type (confidence) | Features (inferred) |
|---|---|---|---|
| tabelog english | tabelog.com/en (official), JustOneCookbook Tabelog guide, asiajin (2013), BusinessWire/Bernama press on the Tabelog multilingual app (Nov 2025, 2M downloads), Garage PR | Navigational to Tabelog plus explainer blogs (~70%) | Sitelinks for tabelog.com, likely app pack |
| tabelog in english | Same as above plus real-japan-guide "How to Use Tabelog: Scores vs Google Maps" | Explainer blog (~60%) | PAA such as "Is Tabelog available in English?" |
| best ramen tokyo | Lonely Planet, byFood, Changi "Now Boarding", goingawesomeplaces, Time Out (Best Ramen Awards), Shopee blog, plus spam/AI pages | **Listicle of named shops (~90%)** | Local pack/map, Reddit r/JapanTravel and r/ramen (typical), Tabelog's official `tabelog.com/en/ramen/rank/` |
| best sushi osaka | jw-webmagazine "5 Best", byFood omakase list, Wanderlog list, magical-trip "10 best local", Funliday "15 best Michelin", ladyironchef | **Listicle (~90%)**. Wanderlog is a map plus list, the nearest analogue to TabeDog | Local pack |
| tabelog score meaning | real-japan-guide, unseen-japan neighborhood rankings, Monolith Law (the Tabelog lawsuit), Gigazine "HonestStars", Tabelog help/score | Explainer blog (~80%) | Paragraph featured snippet ("3.5+ is excellent") |
| japan restaurant app | App Store: Tabelog Food Guide in Japan; Stripes "reservation apps"; Nomad "best food apps japan"; JAPPAN crowdfunding | App store plus comparison listicle (~70%) | App pack |
| best restaurants kyoto | insidekyoto (updated Jan 2026), hotels.com, hamoni "Best 20", mai-ko "Best 10", Fodor's "44 Best", travelcaffeine | **Listicle (~95%)** | Local pack, Michelin/Tripadvisor |

**Competitors, grouped by job:**
- *Ranked lists of named restaurants:* Lonely Planet, byFood, Time Out, insidekyoto, Fodor's, Wanderlog, plus Reddit threads.
- *Tabelog's own English offering:* tabelog.com/en has ranking pages, the Hyakumeiten 100 and reservations. The **Tabelog multilingual app (Nov 2025)** is now the biggest threat to "Tabelog in English" as a value proposition.
- *Maps and logistics:* Google Maps.
- *Booking:* TableCheck, Omakase.in, Pocket Concierge, TableAll, Auto Reserve, byFood.
- *Explainers:* JustOneCookbook, real-japan-guide, Planetware ("Ditch Google reviews in Japan"), japan-guide.

**Positioning risk:** the homepage claims "Is Tabelog available in English? ... Partial" in its comparison table. The official app now covers English search, a map and booking. TabeDog's real advantages are opening hours, payment, a map-first view, unified scores, AI search and lists. The copy should rest on those, not on "in English" alone, and should name the official app honestly.

## 3. User stories (each tied to a SERP signal)

1. **Awareness, first-time tourist.** As a first-time visitor, I want to know whether I can use Tabelog without Japanese, because everyone says Google ratings are useless in Japan. But I'm blocked by not knowing whether the English site or app is complete. *Signal: JustOneCookbook comments "less filters, fewer results in English"; the Planetware headline "Ditch Google Reviews".*
2. **Awareness, every persona.** As a planner, I want to know what a 3.4 vs a 3.7 means, because a 3.5 looks mediocre to me. But I'm blocked by scattered, conflicting rules of thumb. *Signal: a "tabelog score meaning" SERP of blog explainers that disagree (2.7 to 3.2 "solid" vs 3.5 "top").*
3. **Consideration, foodie.** As a ramen-focused traveller, I want a ranked shortlist of named shops with scores, queue tips and closest station, because I have only a few meals. But I'm blocked by listicles that repeat the same tourist names (Ichiran, Afuri). *Signal: the "best ramen tokyo" top 10 is all named-shop listicles; the Hyakumeiten 2025 list is searched in English (enprimeurclub mirror, Tabelog `/en/ramen/rank`).*
4. **Decision, resident or expat.** As someone living in Japan, I want to see what's open now near me, whether it takes cards, and whether I can book, because I eat out spontaneously. But I'm blocked because booking apps (TableCheck, Auto Reserve) don't rate and Tabelog's English filters are thin. *Signal: the "japan restaurant app" SERP is booking-app roundups (Stripes, Nomad).*
5. **Decision, Kyoto/Osaka trip planner.** As someone with one night in Kyoto, I want 10 vetted places across price bands (kaiseki to teishoku), because high-end places need booking a month ahead. *Signal: Osaka sushi results stress "reservations one month ahead"; Kyoto lists mix Michelin and casual picks.*

## 4. Gap analysis (SXO Gap Score), city x cuisine and city templates

| Dimension | Score | Evidence |
|---|---|---|
| Page type | 4/15 | Guide page with no named restaurants, while the SERP is ~90% named-restaurant listicles. CRITICAL mismatch. |
| Content depth | 7/15 | Real local knowledge (late-night Shinjuku, Ogikubo cluster, price bands, score thresholds by city), but no restaurants, a lot of template repetition, and about 40% of the words are site-wide link lists. |
| UX signals | 6/15 | Clear H1 and breadcrumbs. Every action goes behind the `/login` wall, with no in-page list or map preview. The "Related searches" strings are broken. Site-wide link blocks make the page very long. |
| Schema | 7/15 | Valid BreadcrumbList plus FAQPage (FAQ rich results are limited to gov/health sites since 2023, so they bring little benefit). No `ItemList` of `Restaurant` entries. City pages have no `Article`/`dateModified`. |
| Media | 1/15 | 0 images on city and city x cuisine pages. No map preview, no dish photos. |
| Authority | 4/15 | No author, no methodology ("how we rank"), no source date for the scores, an unsubstantiated "#1 app" claim, a new domain. The Tabelog disclaimer is good. |
| Freshness | 3/10 | No visible "updated" date. The SERP leaders show dates (insidekyoto "January 2026", Hyakumeiten 2025). |
| **Total** | **32/100** | |

**Homepage ("tabelog english"): 58/100.** Page type 9 (explainer plus app works for the informational half), Depth 11 (strong score explainer and comparison table), UX 8 (good above-the-fold H1 and value proposition, but every CTA hits a login wall), Schema 10 (WebApplication plus Offer, Organization, WebSite, FAQ), Media 8 (live Shibuya map pins plus food photos, 6 alts empty), Authority 6, Freshness 6.

## 5. Persona scoring (`/tokyo/ramen` as the representative page, weakest first)

| Persona | Relevance | Clarity | Trust | Action | Total |
|---|---|---|---|---|---|
| Foodie or Hyakumeiten hunter ("best ramen tokyo", "top 100") | 6 | 6 | 10 | 5 | **27: Critical** |
| First-time tourist ("best restaurants kyoto", one-night planner) | 9 | 10 | 11 | 6 | **36: Critical** |
| Booker or decision-maker ("japan restaurant app", needs a reservation) | 7 | 12 | 10 | 6 | **35: Critical** |
| Resident expat (open-now, card, near me) | 14 | 14 | 13 | 9 | **50: Needs work** |
| Score-curious researcher ("tabelog score meaning") | 20 | 17 | 14 | 14 | **65: Good** (best served; the score section is the strongest content) |

Fixes, starting with the weakest persona:
- **Foodie.** Add a server-rendered "Top 20 ramen in Tokyo by Tabelog score" table: rank, name (EN plus JP), score, review count, station, lunch/dinner price, card or cash, open-now flag, and a "View on Tabelog" source link. The Hyakumeiten badge and 2025/2026 year belong next to the score.
- **First-time tourist.** Put a 5-item "If you only eat one bowl" shortlist above the fold, segmented by budget and area (near Shinjuku / Tokyo Station / Shibuya). Add a static map preview image with the pins, and one dish photo per style.
- **Booker.** For each listed restaurant, say "Reservations: walk-in only / book via Tabelog / TableCheck / Omakase". Add a "How to book" box on sushi and kaiseki pages.
- **Expat.** Show an "Open now" or "Open late (after 23:00)" filter preview on the page. Let people **try the map without signing in** (ship guest mode) and save sign-up for saving lists.
- **Researcher.** Spin the homepage score section out into a dedicated page (see 6b).

## 6. Recommendations

### 6a. Changes to the existing hub template (P0)
1. **List real restaurants on every city and city x cuisine page.** The data pipeline already exists: `lib/landing.ts` calls `search({lat, lon, range, sort: "rating"})` and caches for 24h. Generalize it to `cityCuisineSpots(city, cuisine)` using the city centroid or area centroids and render the top 10 to 20 **server-side** (ISR, daily). Each item should show name, JP name, Tabelog score, review count, genre, station, price bands, payment and today's hours, with a link to the Tabelog source. Mark it up as `ItemList` -> `ListItem` -> `Restaurant` (name, address, geo, servesCuisine, priceRange, url). Do not put Tabelog's score in `aggregateRating`: it is third-party data and self-serving review markup rules apply. *Check Tabelog's terms of use and legal exposure before you republish lists at scale; the Monolith Law Tabelog litigation shows up in this SERP.*
2. **Split the "Where to find" section** into "Top-rated in Shinjuku: [3 named shops]", "Ikebukuro: [3 named shops]", and so on, so neighborhood content becomes listicle content.
3. **Replace the `/login` wall in CTAs.** Ship the guest mode that is already built (`lib/guest.ts`, `app/auth/guest`) and deep-link to `/map?city=tokyo&genre=ramen` with no login. CTA text: "Open these 20 shops on the map (no sign-up)".
4. Add a static map preview (OG-style image of the pins) plus 2 to 3 photos with alt text on every hub. Fix the 6 empty alts on the homepage.
5. Add "Updated [Month YYYY] · Scores from Tabelog as of [date]" plus `dateModified`, and a short "How we rank" methodology box with an author or editor byline.
6. Remove or fix the "Related searches" block (it has duplicated city tokens). Cut the four site-wide link blocks down to one collapsible block.
7. Make the first FAQ answer name restaurants, not just neighborhoods.

### 6b. New page types (P1)
| New page | Target query | Type | Notes |
|---|---|---|---|
| `/tabelog-score` "Tabelog scores explained: what 3.0, 3.5 and 4.0 mean" | tabelog score meaning, tabelog rating | Blog explainer | Distribution chart, city-by-city thresholds (content already in `lib/seo.ts`), Google vs Tabelog comparison, featured-snippet-ready 40-word answer |
| `/tabelog-english` "How to use Tabelog in English (2026)" | tabelog english, tabelog in english, tabelog app english | Blog plus comparison | Honest comparison of tabelog.com/en vs the official app (Nov 2025) vs TabeDog, step-by-step screenshots, how to book (fees around ¥440) |
| `/best-restaurant-apps-japan` | japan restaurant app, best food apps japan | Comparison listicle | Tabelog, Google Maps, TableCheck, Omakase, Auto Reserve, Gurunavi, Hot Pepper, TabeDog; table plus "best for" sections |
| `/[city]/[cuisine]/hyakumeiten` or `/hyakumeiten/ramen-tokyo-2026` | tabelog top 100 ramen tokyo, hyakumeiten | Listicle | High-intent, English-scarce topic (only an enprimeurclub mirror and SCMP rank today) |
| `/[city]/[area]` area pages (e.g. `/tokyo/shinjuku`) | where to eat in shinjuku, best restaurants shibuya | Listicle plus map | Already partly in `lib/seo.ts` (`areas`), so this is a natural expansion |
| `/[city]/[cuisine]/late-night`, `/cheap`, `/cash-free` | late night ramen shinjuku, ramen that takes credit card tokyo | Filtered list | Uses TabeDog's unique hours and payment data |
| Native app or PWA install plus App Store listing | japan restaurant app | Product listing | The app SERP is App Store-led |

### 6c. Homepage (P1)
- Retitle away from the unprovable "#1 App". Suggested: "TabeDog: Tabelog Ratings in English, on a Map | Japan Restaurant Finder".
- Update the comparison table to include the official **Tabelog app** column and to be honest about it.
- Let the hero map be explored without login, starting with the Shibuya pins already shown.

## 7. Cross-skill referrals
- `/seo schema`: ItemList/Restaurant markup and dateModified on hubs.
- `/seo content`: E-E-A-T (author, methodology, first-hand photos).
- `/seo page`: template duplication, thin unique content, site-wide link blocks.
- `/seo local`: local-pack-dominated "best X city" queries (TabeDog cannot have a GBP; rely on list pages).

## 8. Limitations
- `render_page.py` / `parse_html.py` could not run: the plugin runtime is "not ready" (`/seo setup` needed; system Python is 3.9). Pages were fetched as raw server HTML. The pages are server-rendered by Next.js, so headings, copy, links and JSON-LD are all present, but the post-JS viewport, the hero map and Core Web Vitals were not seen.
- SERP data comes from WebSearch, not a live Google SERP. Positions are approximate, and PAA, local pack, AI Overview, ads and Reddit placement were not visible and are inferred from typical behavior.
- No Search Console, ranking or traffic data. The persona weights are judgment calls.
- Only 6 of the 103 URLs were inspected in detail. The other hubs share the same template, and the finding applies to all of them.

Generate a PDF report? Use `/seo google report`.

---

## Structured findings (audit-data.json, category "Search Experience")
```json
{
  "category": "Search Experience",
  "sxo_gap_score": {"hub_templates": 32, "homepage": 58},
  "findings": [
    {"id": "sxo-1", "severity": "critical", "title": "City/cuisine hub pages name zero restaurants while SERP for 'best X city' is ~90% named-restaurant listicles", "urls": ["/tokyo/ramen", "/osaka/sushi", "/kyoto", "/tokyo"], "fix": "Server-render top 10-20 Tabelog-ranked restaurants per hub with ItemList/Restaurant schema"},
    {"id": "sxo-2", "severity": "critical", "title": "All primary CTAs go to /login hard wall; guest mode not deployed (/auth/guest 404)", "urls": ["/", "/tokyo/ramen"], "fix": "Ship guest map access and deep-link CTAs to a pre-filtered map"},
    {"id": "sxo-3", "severity": "high", "title": "No dedicated page for 'tabelog score meaning' (explainer SERP)", "fix": "Create /tabelog-score explainer"},
    {"id": "sxo-4", "severity": "high", "title": "No presence for 'japan restaurant app' (App Store + comparison listicle SERP); official Tabelog multilingual app (Nov 2025) undercuts 'Tabelog in English' positioning", "fix": "Create /best-restaurant-apps-japan comparison; update homepage comparison table; consider PWA/app listing"},
    {"id": "sxo-5", "severity": "medium", "title": "Zero images on city/cuisine pages; 6 empty alts on homepage", "fix": "Add map preview + dish photos with alt text"},
    {"id": "sxo-6", "severity": "medium", "title": "No freshness/author/methodology signals; unsubstantiated '#1 App' title claim", "fix": "Add updated date, dateModified, byline, 'How we rank' box; retitle homepage"},
    {"id": "sxo-7", "severity": "low", "title": "Templated 'Related searches' strings duplicate city ('tsukemen tokyo tokyo'); heavy sitewide link blocks", "fix": "Remove/fix block; collapse sitewide link lists"}
  ]
}
```
