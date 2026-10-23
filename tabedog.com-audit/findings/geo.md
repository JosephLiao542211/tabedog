# GEO and Agent Readiness: tabedog.com

Audited 2026-10-22 against the live production site (Vercel) and the local source in `/Users/josephliao/Projects/tabelog-map`. Sample pages: `/`, `/tokyo`, `/tokyo/ramen`, `/cuisine/ramen` (103 URLs in the sitemap).

## GEO Readiness Score: 56 / 100

| Dimension | Weight | Score | Weighted | Notes |
|---|---|---|---|---|
| Citability | 25% | 62 | 15.5 | Well-sized FAQ answers that work on their own, but "best X in Y" pages name no restaurants, statistics have no sources, and template text leaks between pages |
| Structural Readability | 20% | 82 | 16.4 | SSR HTML, question headings, landmarks, details/summary, a comparison table, FAQPage/Article/Breadcrumb JSON-LD |
| Multi-Modal Content | 15% | 40 | 6.0 | 17 alt-tagged images on `/` only; none on the city or cuisine pages; no video, map image or charts |
| Authority & Brand Signals | 20% | 20 | 4.0 | Domain registered 2026-10-19; no exact-match mentions found; no author, dates or sameAs |
| Technical Accessibility | 20% | 70 | 14.0 | Every AI user agent gets a 200 with full content and no challenge. No llms.txt (it would be auth-walled), no Markdown, www is a duplicate host, unknown paths soft-redirect to /login |
| **Total** | | | **55.9** | |

### Platform scores (estimates)

| Platform | Score | Main limiter |
|---|---|---|
| Google AI Overviews | 50 | No E-E-A-T signals (author, dates, entity); no named restaurants for "best ramen in Tokyo" queries; www duplicate |
| ChatGPT Search | 42 | OAI-SearchBot can crawl, but there are no third-party mentions or Bing footprint yet, and the brand name is easily confused with "Tabelog" |
| Perplexity | 50 | Crawlable and extractable FAQs; it prefers pages that cite sources and name entities, which these don't |
| Bing Copilot | 42 | New domain with no Bing Webmaster or IndexNow signals; entity unknown |

---

## 1. AI crawler access

### robots.txt (live, from `app/robots.ts`)
```
User-Agent: *
Allow: /
Disallow: /api/
Disallow: /auth/
Disallow: /login
Host: https://tabedog.com
Sitemap: https://tabedog.com/sitemap.xml
```
No bot-specific groups exist, so every crawler inherits `*`.

| Crawler | What it governs | robots.txt | Live HTTP (/, /tokyo, /tokyo/ramen) |
|---|---|---|---|
| OAI-SearchBot | ChatGPT Search citations | Allowed | 200, full SSR HTML |
| ChatGPT-User | User-triggered ChatGPT fetches | Allowed | 200 |
| GPTBot | OpenAI **training** only (not ChatGPT Search) | Allowed | 200 |
| Claude-SearchBot | Claude search citations | Allowed | 200 |
| Claude-User | User-triggered Claude fetches | Allowed | 200 |
| ClaudeBot | Anthropic **training** only | Allowed | 200 |
| PerplexityBot | Perplexity index | Allowed | 200 |
| Perplexity-User | User-triggered fetches | Allowed | 200 |
| Googlebot | Google Search **and AI Overviews / AI Mode** | Allowed | 200 |
| Google-Extended | Gemini/Vertex training and grounding; not Search or AIO | Allowed (token only) | n/a, see note |
| bingbot | Bing and Copilot | Allowed | 200 |
| Applebot-Extended | Apple Intelligence training only | Allowed | 200 |
| CCBot | Common Crawl (training corpora) | Allowed | 200 |

**Evidence:** I curled every UA above. Each got HTTP 200 with the correct `<title>` and a byte-identical or near-identical body (147,568 to 147,640 bytes on `/`; the 72-byte difference is a nonce or flight payload, not a challenge). There was no `x-vercel-mitigated` header, no 403/429, and no JS challenge. Vercel Bot Protection and Attack Challenge Mode are **not** interfering.

Note: Google-Extended is a robots.txt control token, not a fetching user agent. Google fetches with Googlebot, so the UA test only shows the site doesn't block the string.

**Severity: Info (pass).** Search and citation crawlers can reach everything public. Policy decision for the owner: training crawlers (GPTBot, ClaudeBot, CCBot, Google-Extended, Applebot-Extended) are also allowed. Blocking them does not affect ChatGPT, Claude, Perplexity or Google AIO citation, because those use different bots. For a brand-new brand, allowing training probably helps the model learn the entity, so keeping them allowed is reasonable.

### F1. Soft-404s: every unknown path 307-redirects to /login (Medium)
**Evidence:** `/llms.txt`, `/index.md`, `/.well-known/mcp.json`, `/about`, `/privacy` and `/nonexistent-xyz` all return `307 -> /login?next=...`. `/login` is disallowed in robots.txt. `lib/supabase/proxy.ts` gates every path not in `PUBLIC_PATHS`.
**Impact:** Crawlers and agents can't tell "missing" from "private", and every typo or removed URL becomes a redirect into a disallowed page. Any discovery file you add later (llms.txt, .well-known) will be invisible unless you allowlist it.
**Fix:** In `PUBLIC_PATHS`, add `/^\/llms(-full)?\.txt$/`, `/^\/\.well-known\//`, `/^\/privacy$/`, `/^\/about$/` and any `.md` alternates. For non-API paths that match no route, let them fall through to Next's `not-found` (404) rather than redirecting. Only redirect known app routes.

### F2. /terms is auth-walled on production (Medium)
**Evidence:** Live `/terms` returns 307 to `/login?next=%2Fterms`. The local uncommitted `lib/supabase/proxy.ts` adds `/^\/terms$/` to `PUBLIC_PATHS`, so the fix exists but isn't deployed.
**Fix:** Deploy. Also add a public `/privacy` page. A legal identity is a trust signal for both AI systems and Stripe.

### F3. www.tabedog.com serves a duplicate site with 200 (Medium)
**Evidence:** `curl -I https://www.tabedog.com` returns `HTTP/2 200` (no redirect). The canonical tag points to `https://tabedog.com`, which mitigates this partly. `http://` correctly 308s to https.
**Fix:** In Vercel Domains, set `www.tabedog.com` to redirect (308) to `tabedog.com`.

### F4. The homepage is uncacheable (Low)
**Evidence:** `/` returns `cache-control: private, no-cache, no-store` and `x-vercel-cache: MISS` on every hit, while `/tokyo` is `HIT` (age 11917). The proxy's `supabase.auth.getUser()` runs on `/` and makes it dynamic.
**Impact:** Slower TTFB for crawlers on the most important page. Fetchers used by AI assistants have tight timeouts.
**Fix:** Serve the landing statically for anonymous requests: skip `updateSession` when there is no `sb-*` cookie, or split the signed-in app off `/`.

---

## 2. llms.txt, RSL and content signals

### F5. llms.txt missing, and it would be auth-walled if added (Medium)
**Evidence:** `/llms.txt` and `/llms-full.txt` return 307 to /login (see F1). No `/license.xml` (RSL 1.0) and no `Content-Signal` directive in robots.txt.
**Fix:**
1. Add `app/llms.txt/route.ts`, generated from `lib/seo.ts`, and allowlist it in the proxy. Suggested content:
```
# TabeDog
> TabeDog (tabedog.com) is an independent English-language map of Japanese restaurants that displays Tabelog ratings, opening hours, price bands and payment methods. Not affiliated with Tabelog or Kakaku.com, Inc.

## Guides
- [How Tabelog scores work](https://tabedog.com/#faq): 3.0-3.2 average, 3.5 excellent, 3.7+ destination, 4.0+ national best
- [Best restaurants in Tokyo](https://tabedog.com/tokyo)
- [Best ramen in Tokyo](https://tabedog.com/tokyo/ramen)
- [Ramen in Japan](https://tabedog.com/cuisine/ramen)
... (all 12 cities and the cuisine hubs)

## Product
- Free: map search, filters, restaurant details. Premium: ¥500/month (lists, AI recommendations, AI search, guides)
```
2. Add a Content Signals line (Cloudflare Content Signals Policy) to declare intent. `MetadataRoute.Robots` can't emit custom directives, so replace `app/robots.ts` with `app/robots.txt/route.ts` that returns plain text including `Content-Signal: search=yes, ai-input=yes, ai-train=yes` (or `ai-train=no`, the owner's choice).
3. RSL 1.0 is optional. It is only worth adding if you want machine-readable licensing terms. Low priority for a growth-stage site.

---

## 3. Markdown delivery for agents

### F6. No Markdown representation (Low-Medium)
**Evidence:** `curl -H "Accept: text/markdown" https://tabedog.com/` returns `content-type: text/html`. `/index.md` and `/tokyo.md` 307 to /login. There's no `<link rel="alternate" type="text/markdown">`.
**Impact:** Agents (Claude-User, ChatGPT-User, coding and browsing agents) must parse 58 to 147 KB of HTML, including the RSC flight payload that duplicates all content, to get about 2 KB of prose.
**Fix:** All hub content already lives as structured data in `lib/seo.ts`. Add a route such as `app/[city]/[cuisine]/md/route.ts` (or a single `app/md/[...path]/route.ts`) that renders the same data as Markdown. In `proxy.ts`, rewrite requests with `Accept: text/markdown`, or paths ending `.md`, to it. Send `Vary: Accept`, and add `alternates.types["text/markdown"]` in `generateMetadata`.

---

## 4. Passage-level citability

Your FAQ answers are 22 to 81 words, open with the answer, and mostly work on their own. That is a strong base. Target query results:

### Query: "what is a good Tabelog score" (Good, with a gap)
**Best passage** (`/`, FAQ "What does a Tabelog rating of 3.5 mean?", 67 words): *"Tabelog scores run from 1 to 5 but almost nothing scores above 4. The average restaurant is around 3.0 to 3.2. A 3.5 puts a restaurant in roughly the top 3 to 5 percent..."* It is direct and specific. The table's aria-label repeats the scale, which helps.
- **F7 (Medium): The statistics have no source.** "top 3 to 5 percent" and "average 3.0 to 3.2" have no citation or data basis. Perplexity and AIO favor attributed numbers. Fix: cite a source (Tabelog's own score explanation page, or compute it from your own data: "Of N restaurants in TabeDog's Tokyo index, X% score 3.5+ (data as of 2026-10)"). First-party data is the most citable thing you can publish.
- There's no question heading that matches the literal query. Add an H3 "What is a good Tabelog score?" with a first sentence such as "A good Tabelog score is 3.5 or higher..." The current heading is about "3.5" specifically.

### Query: "is Tabelog available in English" (Good, with an accuracy risk)
**Passage** (`/`, 50 words): *"Tabelog has a partial English site, but most of its listings, reviews, hours and payment details are Japanese only..."*
- **F8 (Medium): accuracy and consistency risk.** `lib/tabelog.ts:203` fetches from `s.tabelog.com/en/rstLst/...`, Tabelog's own English listing pages. The copy says the details are "Japanese only" on Tabelog and "translated" on TabeDog. If the data actually comes from Tabelog's English pages, an AI system cross-checking tabelog.com/en may judge the claim false, and it creates legal exposure (see F12). Fix: describe precisely what TabeDog adds (map UI, open-now filter, payment filter, aggregation) rather than claiming translation. Link `https://tabelog.com/en/` inline in this answer. The footer already links it.

### Query: "best ramen in Tokyo Tabelog" (Weak)
**Evidence:** `/tokyo/ramen` (H1 "Best ramen in Tokyo") names **zero restaurants**. "Where is the best ramen in Tokyo?" answers with neighborhoods only.
- **F9 (High): the page doesn't answer its own query.** An AI building an answer to "best ramen in Tokyo Tabelog" will cite pages that list named shops with scores (Tabelog's Hyakumeiten, Time Out, Reddit). Fix: add a server-rendered "Top-rated ramen in Tokyo on Tabelog" ordered list (`<ol>`) of 10 to 20 shops: name (English + Japanese), area, Tabelog score, price band, and a link to the Tabelog source. Add an "as of YYYY-MM-DD" `<time>`, and an `ItemList` JSON-LD of `Restaurant` items. You already have `/api/landing-spots` and a cached search, so this can be generated at build/ISR time. Do this for every city×cuisine page; it is the highest-leverage GEO change on the site.
- **F10 (Medium): template defects that hurt trust and extractability.**
  - Related searches render duplicated city tokens: "tokyo ramen top 100 tokyo", "tsukemen tokyo tokyo", "ramen open late shinjuku tokyo". The template appends the city to longtail strings that already contain it (`lib/seo.ts:322` `longtail`).
  - The neighborhoods "Ogikubo" and "Kanda" render with no description (the `areas` list has names, but the area-blurb lookup is empty).
  - City-level area blurbs leak into cuisine pages: on the ramen page, Shinjuku is described as "Omoide Yokocho yakitori alleys, Golden Gai bars..." and "Which neighborhood... for ramen?" answers "Shinjuku. Omoide Yokocho yakitori alleys, Golden Gai bars...", which is off-topic.
  - "Tokyo sits/runs at the top of those ranges" appears twice, and the score answer repeats "3.5 excellent / 3.7 destination" twice within 81 words.
  - Fix: write cuisine-specific area notes (or omit the blurb), dedupe the city token in longtail rendering, and drop empty `<dt>`/`<dd>` pairs.
- "Tokyo scores skew low because reviewers here have eaten everywhere" is an unsupported causal claim. Soften it or source it.

### General
- **F11 (Medium): superlatives that AI systems discount.** "TabeDog is the only English app that shows Tabelog ratings for every restaurant in Japan" and the title "The #1 App for Eating Like a Local in Japan" are unverifiable. LLMs tend to drop marketing superlatives and may treat the passage as promotional. Replace them with verifiable facts (counts, coverage, features).

---

## 5. Entity clarity: TabeDog vs Tabelog

### F12. Trademark and confusion risk (High, business risk; get a legal review)
**Evidence:**
- The name "TabeDog" differs from "Tabelog" by one letter (l to D) and shares the "Tabe-" stem (食べ, "eat").
- The H1 on `/` is "Tabelog in English, on a map." and the `<title>` is "TabeDog: Tabelog in English | ...". Meta keywords on every page start with "Tabelog English, Tabelog in English". Using a third party's mark as your headline or slogan goes beyond nominative reference.
- Mitigations already present: the footer on hub pages says "not affiliated with, endorsed by or connected to Tabelog or Kakaku.com, Inc. Tabelog is a trademark of Kakaku.com, Inc.", and the FAQ "What is TabeDog?" states it is independent. The homepage only carries the short FAQ version, not the full footer disclaimer.
- The data is fetched from Tabelog's servers (`lib/tabelog.ts`, `app/api/reviews/route.ts`). Review Tabelog's terms of use on automated access and redisplay. A takedown would remove the product's core value and every citation built on it.

**GEO impact:** LLMs and search engines may (a) treat "TabeDog" as a misspelling of "Tabelog" and auto-correct queries, (b) describe TabeDog as "Tabelog's English app", which both misinforms users and strengthens a confusion claim, or (c) leave TabeDog out as an unknown entity.

**Fixes:**
1. Get IP counsel to review the name and the "Tabelog in English" slogan before investing in brand-building. Renaming at 3 days old costs far less than renaming later.
2. Lead with your own descriptor: H1 "The English restaurant map for Japan", with Tabelog mentioned descriptively in body copy ("shows Tabelog ratings"). Keep "Tabelog in English" phrasing out of titles and H1s.
3. Add the full disclaimer to the homepage footer, not only the FAQ.
4. Strengthen the Organization JSON-LD:
```json
{"@type":"Organization","@id":"https://tabedog.com/#org","name":"TabeDog","alternateName":"TabeDog Japan restaurant map",
 "disambiguatingDescription":"Independent English map of Japanese restaurants; not Tabelog and not affiliated with Kakaku.com, Inc.",
 "url":"https://tabedog.com","logo":"https://tabedog.com/logo.svg",
 "founder":{"@type":"Person","name":"Joseph Liao"},"foundingDate":"2026-10",
 "sameAs":["https://x.com/…","https://www.reddit.com/user/…","https://www.producthunt.com/products/…","https://github.com/…","https://www.linkedin.com/company/…"]}
```
   `sameAs` is currently absent entirely. Create the profiles first, then list them.

---

## 6. Authority and brand mentions

### F13. Essentially no off-site footprint (High, expected for a 3-day-old domain)
**Evidence:**
- WHOIS: `tabedog.com` created **2026-10-19** (Cloudflare registrar).
- Bing `"TabeDog" tabelog`: 0 relevant results (only unrelated oji-container.co.jp pages).
- YouTube `"tabedog"`: "no matching results" (一致する検索結果はありませんでした).
- Hacker News (Algolia, exact match): 0 hits.
- Wikipedia: no article and no mentions.
- Reddit: couldn't verify (blocked to automated fetch). Assume none.
- LinkedIn: not checked (login wall).

| Signal | Status | Correlation with AI citation |
|---|---|---|
| YouTube | None | Strongest (~0.74) |
| Reddit | None found | High |
| Wikipedia | None (not notable yet) | High |
| LinkedIn | Unknown | Moderate |
| Backlinks/DR | Near zero | Weak (~0.27) |

**Fixes (ordered by AI-citation impact):**
1. **YouTube:** 2 to 4 short videos, such as "How to read Tabelog scores (3.5 explained)", "Finding ramen in Shinjuku with TabeDog", or "Google Maps vs Tabelog in Japan". Put "TabeDog" and tabedog.com in titles and descriptions. Video is the strongest mention correlate and gives the Multi-Modal score a lift.
2. **Reddit:** answer real questions in r/JapanTravel, r/JapanTravelTips, r/ramen and r/Tokyo where Tabelog-in-English comes up. Disclose that you're the maker and follow each sub's self-promotion rules.
3. Product Hunt / Show HN launch, and a listing on "Tabelog in English" roundup posts on travel blogs.
4. Skip Wikipedia until independent press coverage exists. A self-written article would be deleted.

### F14. No authorship or freshness signals (Medium)
**Evidence:** `Article` JSON-LD on `/tokyo/ramen` and `/cuisine/ramen` has `author: {"@id":"#org"}` and **no `datePublished` or `dateModified`**. Pages have no visible byline, no `<time>` element, and no About page (`/about` is auth-walled). Sitemap `lastmod` is the same date for all URLs.
**Fix:** Add a Person author (name, short bio, why you know Japanese dining, `sameAs`). Add `datePublished`/`dateModified` in JSON-LD and a visible "Updated 2026-10-20" `<time datetime>` line. Create a public `/about` page with methodology: where ratings come from, how often they're refreshed, and how score bands were derived.

---

## 7. Multi-modal (F15, Medium)
**Evidence:** `/` has 17 `<img>` with descriptive alt text (good; Wikimedia attribution links present). `/tokyo`, `/tokyo/ramen` and `/cuisine/ramen` have **0 images**. There's no video, no static map image and no chart of the score distribution.
**Fix:** On each hub page, add one representative dish image with alt text and `ImageObject` in the JSON-LD, plus a static map snapshot of the top-rated pins (server-rendered PNG via `next/og` or a tile render) with alt text like "Map of top-rated ramen shops around Shinjuku Station". Add a score-distribution chart (SVG with a text caption) to the "Tabelog score guide" section. Embed the YouTube videos from F13.

---

## 8. Semantic HTML and accessibility tree for agents

**Good (pass):**
- Full SSR. All copy, FAQs and JSON-LD are present in the raw HTML (no SPA shell), so non-JS agents get everything.
- Landmarks: one `<main>`, `<header>`, `<footer>`, 1 to 2 `<nav>` with `aria-label="Primary"`, `<section>`/`<article>` blocks, `<ol>` breadcrumbs, `<dl>` for prices, `<details>/<summary>` FAQs, and a real `<table>` with caption for the comparison.
- Single H1 per page with a logical H2/H3 hierarchy, and question-form H3s.
- The login form wraps inputs in `<label>`, with `type=email` and `autocomplete` set.
- `lang="en"` is set.

### F16. Agent dead-end: every CTA goes to /login and drops context (Medium)
**Evidence:** "Open the map" (`aria-label="Open the map"`), "Open ramen in Tokyo" and "Show ramen near me in Tokyo" all `href="/login"` with no `next` parameter. 9 links on `/` point to `/login`. `/login` is disallowed in robots.txt. `/api/search` returns 401 without a session or guest cookie. The guest flow (`app/auth/guest/`, uncommitted) isn't linked from public pages.
**Impact:** A browsing agent asked "find late-night ramen near Shinjuku that takes cards" can read the guide but can't operate the product. The user's intent (city and cuisine) is also lost at the auth wall.
**Fix:**
1. Point CTAs at a deep link that survives auth, for example `/login?next=/map?city=tokyo&cuisine=ramen` or, better, a direct guest entry `/auth/guest?next=...`.
2. Consider a public, read-only, rate-limited results page per city×cuisine (server-rendered list, see F9). It serves agents and AI fetchers without opening the map API.
3. Optional, later: publish an OpenAPI description or MCP server for search, advertised in llms.txt. Only do this if you want agents to transact. It isn't needed for citation.

### F17. Minor HTML items (Low)
- The full footer disclaimer is missing on `/` (see F12).
- `twitter:title`/`twitter:description` on hub pages are the generic site values, not the page values (`/tokyo/ramen` shows "TabeDog: Tabelog in English, on a map"). Set them per page in `generateMetadata`.
- The `/` breadcrumb item "Cuisines" points to a fragment URL `https://tabedog.com/#cuisines`. Google requires a crawlable URL; use `https://tabedog.com/cuisine` (create an index page) or omit level 1.
- `meta keywords` is ignored by every engine. Remove it; it only advertises the trademark-heavy targeting.

---

## Top 5 highest-impact changes

| # | Change | Fixes | Impact | Effort |
|---|---|---|---|---|
| 1 | Add server-rendered top-10/20 named restaurant lists with Tabelog score, area, price, "as of" date and ItemList JSON-LD to every city×cuisine page | F9 | High: turns "best X in Y" pages into citable answers | 1 to 2 days (data already in cache/search) |
| 2 | Legal review of the name and "Tabelog in English" slogan; reposition H1/title; full disclaimer site-wide; review the data-sourcing terms | F12, F8 | High: existential risk and entity clarity | Hours of copy work plus counsel |
| 3 | Seed off-site entity: 2 to 4 YouTube explainers, honest Reddit participation, Product Hunt/Show HN, then add `sameAs` + `disambiguatingDescription` + founder to Organization JSON-LD | F13, F12 | High: mentions correlate far more with AI citation than backlinks | 1 to 2 weeks, ongoing |
| 4 | Fix the proxy: 404 instead of /login redirects for unknown paths; allowlist llms.txt, .well-known, about, privacy; deploy /terms; 308 www to apex; add llms.txt + Content-Signal | F1 to F5 | Medium: clean crawl surface and agent discovery | 2 to 4 hours |
| 5 | Author/About/methodology page + datePublished/dateModified + visible `<time>`; source or compute the score-band statistics from your own data; fix template defects (duplicated city tokens, empty areas, yakitori text on ramen pages) | F7, F10, F11, F14 | Medium: E-E-A-T, factual trust, extractability | 1 day |

Lower priority: Markdown alternates (F6), hub-page images/static maps (F15), deep-link CTAs/guest entry (F16), static homepage caching (F4), per-page Twitter tags (F17).

---

## Structured findings (for audit-data.json, category "AI Search Readiness")

```json
{
  "category": "AI Search Readiness",
  "score": 56,
  "dimensions": {"citability": 62, "structural_readability": 82, "multimodal": 40, "authority_brand": 20, "technical_accessibility": 70},
  "platform_scores": {"google_aio": 50, "chatgpt_search": 42, "perplexity": 50, "bing_copilot": 42},
  "crawler_access": {"OAI-SearchBot": "allowed/200", "ChatGPT-User": "allowed/200", "GPTBot": "allowed/200", "Claude-SearchBot": "allowed/200", "Claude-User": "allowed/200", "ClaudeBot": "allowed/200", "PerplexityBot": "allowed/200", "Perplexity-User": "allowed/200", "Googlebot": "allowed/200", "Google-Extended": "allowed (robots token)", "bingbot": "allowed/200", "Applebot-Extended": "allowed/200", "CCBot": "allowed/200", "vercel_challenge": false},
  "llms_txt": "missing (307 to /login)",
  "rsl": "missing",
  "content_signal": "missing",
  "markdown_delivery": "none",
  "findings": [
    {"id": "F1", "severity": "medium", "title": "Unknown paths 307 to /login (soft-404); discovery files would be auth-walled", "evidence": "/llms.txt, /about, /nonexistent-xyz -> 307 /login?next=...", "fix": "Allowlist llms.txt/.well-known/about/privacy in PUBLIC_PATHS; 404 unknown routes"},
    {"id": "F2", "severity": "medium", "title": "/terms auth-walled in production", "evidence": "307 /login?next=%2Fterms; fix uncommitted in lib/supabase/proxy.ts", "fix": "Deploy; add /privacy"},
    {"id": "F3", "severity": "medium", "title": "www.tabedog.com serves 200 duplicate", "evidence": "curl -I https://www.tabedog.com -> 200", "fix": "308 www to apex in Vercel"},
    {"id": "F4", "severity": "low", "title": "Homepage uncacheable (no-store)", "evidence": "cache-control: private, no-store; x-vercel-cache MISS", "fix": "Skip session refresh for anonymous requests"},
    {"id": "F5", "severity": "medium", "title": "No llms.txt, Content-Signal or RSL", "evidence": "/llms.txt 307; robots.txt has no Content-Signal", "fix": "Add app/llms.txt/route.ts and a robots.txt route handler with Content-Signal"},
    {"id": "F6", "severity": "low", "title": "No Markdown representation", "evidence": "Accept: text/markdown returns text/html", "fix": "Markdown route from lib/seo.ts data; rewrite on Accept/.md; Vary: Accept"},
    {"id": "F7", "severity": "medium", "title": "Score statistics unsourced", "evidence": "'top 3 to 5 percent', 'average 3.0 to 3.2' without citation", "fix": "Cite a source or publish first-party distribution data"},
    {"id": "F8", "severity": "medium", "title": "'Japanese only'/'translated' claim conflicts with data source", "evidence": "lib/tabelog.ts:203 fetches s.tabelog.com/en", "fix": "Describe value-add accurately; link tabelog.com/en inline"},
    {"id": "F9", "severity": "high", "title": "'Best ramen in Tokyo' names no restaurants", "evidence": "/tokyo/ramen main content lists neighborhoods only", "fix": "SSR ranked list of named shops with score/date + ItemList JSON-LD on all city x cuisine pages"},
    {"id": "F10", "severity": "medium", "title": "Template defects", "evidence": "'tsukemen tokyo tokyo'; empty Ogikubo/Kanda; yakitori/Golden Gai text in ramen answer", "fix": "Dedupe city token; cuisine-specific area notes; drop empty dd"},
    {"id": "F11", "severity": "medium", "title": "Unverifiable superlatives", "evidence": "'only English app...every restaurant', '#1 App'", "fix": "Replace with verifiable facts"},
    {"id": "F12", "severity": "high", "title": "TabeDog/Tabelog trademark and entity-confusion risk", "evidence": "One-letter name difference; H1 'Tabelog in English'; data fetched from Tabelog", "fix": "Legal review; reposition H1/title; site-wide disclaimer; Organization disambiguatingDescription + sameAs"},
    {"id": "F13", "severity": "high", "title": "No brand mentions (domain created 2026-10-19)", "evidence": "0 exact-match results on Bing/YouTube/HN/Wikipedia", "fix": "YouTube explainers, Reddit participation, launch posts"},
    {"id": "F14", "severity": "medium", "title": "No author or dates", "evidence": "Article JSON-LD lacks datePublished/dateModified; author is org; /about walled", "fix": "Person author, dates, visible <time>, public methodology page"},
    {"id": "F15", "severity": "medium", "title": "Hub pages have no images", "evidence": "0 <img> on /tokyo, /tokyo/ramen, /cuisine/ramen", "fix": "Dish image, static map snapshot, score chart"},
    {"id": "F16", "severity": "medium", "title": "Agents dead-end at /login; CTA context lost", "evidence": "'Open ramen in Tokyo' href=/login, no next param; /api/search 401", "fix": "Deep-link CTAs through guest/login with next; public read-only result lists"},
    {"id": "F17", "severity": "low", "title": "Minor metadata issues", "evidence": "Generic twitter:title on hubs; breadcrumb to /#cuisines; meta keywords", "fix": "Per-page twitter tags; crawlable breadcrumb URL; drop keywords"}
  ]
}
```
