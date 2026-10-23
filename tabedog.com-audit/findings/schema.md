# Schema / Structured Data Audit: tabedog.com (2026-10-22)

Pages fetched live: `/`, `/tokyo`, `/cuisine/ramen`, `/tokyo/ramen`. Emitted via `JsonLd` in `components/site.tsx` as one `<script type="application/ld+json">` per page holding a top-level JSON array (valid). It is server-rendered, with `<` escaped.

## Detection
| Page | Types |
|---|---|
| `/` | Organization, WebSite, WebApplication, FAQPage (11 Q) |
| `/tokyo` | BreadcrumbList (1 item), FAQPage (5 Q), WebPage |
| `/cuisine/ramen` | BreadcrumbList (2), FAQPage (5), Article |
| `/tokyo/ramen` | BreadcrumbList (2), FAQPage (6), Article |

All use `https://schema.org`, absolute URLs and no placeholders. No Microdata or RDFa.

## Findings

### High
1. **Article is missing required and recommended properties** (`/cuisine/*`, `/city/cuisine`).
   - Missing `datePublished`, `dateModified` and `image`.
   - `author` points to the Organization, which is acceptable.
   - `description` is a long paragraph. Fine, but trim it to one or two sentences.
   - These are evergreen guide pages, so Article is arguably the wrong type. Use `WebPage` or `CollectionPage` with an `ItemList`, or add real dates and an image.
2. **BreadcrumbList is wrong on `/tokyo`.**
   - It has a single item, and Google wants at least 2.
   - Add Home as position 1.
   - On `/cuisine/ramen`, item 1 is `https://tabedog.com/#cuisines`, a fragment URL that is not a real page. Use Home, then Ramen.
   - On `/tokyo/ramen`, Home is missing and the trail does not pass through a parent. Use Home > Tokyo > Ramen.
   - Compare the visible breadcrumb, if any, with the markup.
3. **FAQPage on every page (4 of 4)**, which is Info priority.
   - Google retired FAQ rich results for all sites on 2026-05-07, so there is no SERP benefit. Any AI/GEO benefit is unconfirmed.
   - It is harmless and the content is visible, so keep it if you accept that. Do not spend more effort on it.
   - Q&A is marketing copy, not user-submitted, so QAPage is not appropriate.
   - Check that every FAQ answer is visible on the page. The homepage markup has 11 Q&As, and the visible count should match.
   - Some answers are templated and mechanically concatenated, for example "Tokyo: Tokyo's ramen scene..." and "The pages for sushi, ramen, yakiniku in Tokyo go neighborhood by neighborhood" (grammar). That is a content-quality issue, not a schema one.

### Medium
4. **WebApplication (homepage).**
   - `applicationCategory: "TravelApplication"` is acceptable. `LifestyleApplication` or a food-related category is arguably closer.
   - The markup is not eligible for the Google software-app rich result without `aggregateRating` or `review`, so do not invent them.
   - `offers` is an array of two Offers. The Premium offer reflects "¥500 a month", which matches the visible text, but the monthly recurrence is only in the description. Add `priceSpecification` with `UnitPriceSpecification` (`billingDuration` P1M, `unitCode` MON) so it is machine-readable.
   - Offers lack `availability`, `url` and `category`.
   - The `@id` is missing. Add `https://tabedog.com/#app` and `provider`/`publisher` referencing `#org`.
   - If an iOS or Android app exists, use `MobileApplication` instead. If it is web only, WebApplication is correct.
5. **Organization is minimal.**
   - It is missing `sameAs` (X, Instagram, GitHub etc.), `description`, `email` or `contactPoint`, and `foundingDate`.
   - `logo` is an SVG. Google's logo guidelines require a raster format (PNG, JPG, WebP, at least 112x112), and SVG is not supported. Provide a PNG logo. `/logo.svg` returns 200 but is not eligible.
   - Make it an `ImageObject` with `url`, `width` and `height`.
6. **WebSite has no `potentialAction` SearchAction.**
   - Google removed the sitelinks search box in 2024, so this has little benefit.
   - Add one only if there is a URL-addressable search (for example `/search?q=`). Do not add one that points to the app's AI search.
   - The WebSite `description` duplicates the WebApplication `description`. Fine.
7. **WebPage on `/tokyo` is only in the city page.**
   - Cuisine and city x cuisine pages lack one.
   - `about` as `City` is OK (`City` is a schema.org type).
   - Add `breadcrumb` (`@id` reference), `primaryImageOfPage`, `dateModified` and `mainEntity` (ItemList).
   - The node has no `@id`, so the BreadcrumbList cannot reference it.

### Low / opportunities
8. **No ItemList** for the top restaurants on city, cuisine and city x cuisine pages.
   - If the page visibly lists restaurants (for example featured or top-rated), add an `ItemList` of `ListItem` with `url`, and `Restaurant` entities only if those pages have real, visible detail pages.
   - Do NOT mark up `Restaurant` with `aggregateRating` from Tabelog scores unless the rating is visible and the source is cited. Google treats self-serving or third-party ratings inconsistently, and it is a policy risk. Tabelog is a third-party source, so skip `aggregateRating`.
   - Carousel rich results need Restaurant ListItems that each link to a separate detail URL. Detail URLs appear to be app-only, so ItemList is only a modest win.
9. **No `@id` / entity graph.** The array has no `@graph`. `isPartOf` and `publisher` use `@id` references to `#website` and `#org`, which are only defined on the homepage. Google resolves them poorly across pages, so each page should include a minimal `{"@type":"Organization","@id":...,"name":...}` or the full node.
10. **No `inLanguage`, `sameAs` or `Place` data** for `about: City`. Add `sameAs` with Wikipedia/Wikidata URLs for Tokyo and Ramen to strengthen entity linking.
11. No deprecated types found (no HowTo, SpecialAnnouncement, CourseInfo etc.). No `http://` contexts. All required types validate against schema.org.
12. **Schema vs visible content.** Prices (¥500/month) and the feature list match visible text. The homepage `featureList` is accurate. Verify the FAQ answers appear visibly on each page (the content did appear in the HTML).

## Corrected snippets

### Home: Organization + WebSite + WebApplication (replace the three nodes)
```json
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://tabedog.com/#org",
      "name": "TabeDog",
      "url": "https://tabedog.com",
      "logo": {"@type": "ImageObject", "url": "https://tabedog.com/logo-512.png", "width": 512, "height": 512},
      "description": "English map of Japan's restaurants built on Tabelog ratings.",
      "sameAs": ["https://x.com/REPLACE_WITH_REAL_HANDLE"]
    },
    {
      "@type": "WebSite",
      "@id": "https://tabedog.com/#website",
      "url": "https://tabedog.com",
      "name": "TabeDog",
      "inLanguage": "en",
      "publisher": {"@id": "https://tabedog.com/#org"}
    },
    {
      "@type": "WebApplication",
      "@id": "https://tabedog.com/#app",
      "name": "TabeDog",
      "url": "https://tabedog.com",
      "applicationCategory": "LifestyleApplication",
      "operatingSystem": "Web",
      "inLanguage": "en",
      "publisher": {"@id": "https://tabedog.com/#org"},
      "offers": [
        {"@type": "Offer", "name": "Free", "price": "0", "priceCurrency": "JPY", "url": "https://tabedog.com", "availability": "https://schema.org/InStock"},
        {"@type": "Offer", "name": "TabeDog Premium", "price": "500", "priceCurrency": "JPY", "url": "https://tabedog.com", "availability": "https://schema.org/InStock",
         "priceSpecification": {"@type": "UnitPriceSpecification", "price": "500", "priceCurrency": "JPY", "billingDuration": "P1M", "unitCode": "MON"}}
      ]
    }
  ]
}
```
Replace the `sameAs` placeholder with real profiles or remove it. Create a raster logo (PNG at least 112x112).

### BreadcrumbList fixes
```json
{"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[
 {"@type":"ListItem","position":1,"name":"Home","item":"https://tabedog.com"},
 {"@type":"ListItem","position":2,"name":"Tokyo","item":"https://tabedog.com/tokyo"},
 {"@type":"ListItem","position":3,"name":"Ramen","item":"https://tabedog.com/tokyo/ramen"}]}
```
- `/tokyo`: Home > Tokyo.
- `/cuisine/ramen`: Home > Ramen (drop `#cuisines`).

### City x cuisine page: Article replacement
```json
{"@context":"https://schema.org","@type":"CollectionPage","@id":"https://tabedog.com/tokyo/ramen#page",
 "name":"Best Ramen in Tokyo","url":"https://tabedog.com/tokyo/ramen","inLanguage":"en",
 "description":"Tokyo's ramen scene ranked by Tabelog score, with neighborhoods, prices and payment info in English.",
 "dateModified":"2026-10-22","isPartOf":{"@id":"https://tabedog.com/#website"},
 "publisher":{"@id":"https://tabedog.com/#org"},
 "about":[{"@type":"City","name":"Tokyo","sameAs":"https://en.wikipedia.org/wiki/Tokyo"},{"@type":"Thing","name":"Ramen","alternateName":"ラーメン","sameAs":"https://en.wikipedia.org/wiki/Ramen"}]}
```
Use real last-modified dates (from data or build time). If you keep Article, add `datePublished`, `dateModified` and `image` (the OG image URL).

## Suggested priority
1. Fix BreadcrumbLists (Home root, no fragment URLs).
2. Add a raster logo and fix Organization.
3. Add dates and an image to Article (or switch to CollectionPage).
4. Add priceSpecification and `@id` to the WebApplication.
5. Leave FAQPage as is (Info), or drop it to reduce HTML weight.
6. Optionally add ItemList where restaurants are visibly listed.

Notes: `app/[city]/page.tsx` and the other page files were not read. Source changes were inferred from live output only. No project source was modified.
