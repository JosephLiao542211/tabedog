# Technical SEO findings: tabedog.com (audited 2026-10-22)

Technical score: **72/100**. Content pages are in good shape. The main problems are the dynamic homepage, social metadata that is dropped on 102 of 103 pages, soft-404 behavior for unknown paths, and a production deploy that lags the local working tree.

Raw crawl data: `tabedog.com-audit/raw/` (`_rows.json`, `_status.txt`, per-URL `.html` and `.hdr`).

## Scorecard
| Category | Status |
|---|---|
| Crawlability | Pass with notes (robots.txt valid; non-standard `Host`; `/login` blocked but indexable) |
| Indexability | Pass (103/103 are 200, self-canonical, `index, follow`, unique title/description, 1 H1) |
| Security | Partial (HTTPS and HSTS only; no other security headers) |
| URL structure | Pass with notes (trailing slash 308 OK; www not redirected; unknown paths redirect to /login) |
| Mobile | Pass (viewport set, `viewport-fit=cover`) |
| Core Web Vitals (from source) | Pass for hubs (static, CDN HIT); homepage is dynamic with no CDN cache |
| Structured data | Pass (valid JSON-LD parsed on all pages; see Medium) |
| JS rendering | Pass (full SSR; all content is in raw HTML) |
| hreflang | N/A (single-language, English only; none emitted; fine) |
| IndexNow | Not implemented (Low) |

## Critical
None.

## High

### H1. Homepage `/` is fully dynamic: `cache-control: private, no-cache, no-store`, `x-vercel-cache: MISS`
Evidence: `curl -sI https://tabedog.com/` returned `cache-control: private, no-cache, no-store, max-age=0, must-revalidate`, `x-vercel-cache: MISS`, `x-matched-path: /`, and no `x-nextjs-prerender`. Every other page returns `x-nextjs-prerender: 1`, `x-vercel-cache: HIT`. Homepage TTFB is 0.40s versus 0.20s for `/tokyo`, and every crawler hit runs Supabase and RSC on a cold function.

Cause: `app/page.tsx:15-23`. `Home()` calls `createClient()` (reads `cookies()` in `lib/supabase/server`), `supabase.auth.getUser()`, and `(await cookies()).get(GUEST_COOKIE)`. One route serves three audiences (logged-in app, guest app, anonymous landing), so the whole route opts out of static rendering. `proxy.ts` and `lib/supabase/proxy.ts` run on all pages. The hub pages are unaffected only because they are prerendered and never read cookies.

Fix: keep the landing page static and let the proxy choose, so `/` never reads cookies in the page.
1. Move the current `Landing` render to `app/(public)/landing/page.tsx`, with `export const metadata = { ..., alternates: { canonical: "/" } }` (the metadata now in `app/page.tsx:10-16`). Move the app render to `app/(app)/app-shell/page.tsx`.
2. In `lib/supabase/proxy.ts`, after `getUser()`, when `pathname === "/"`: `if (user || isGuest) return NextResponse.rewrite(new URL("/app-shell", request.url)); return NextResponse.rewrite(new URL("/landing", request.url));` (copy the cookie headers onto the rewrite response). Block direct access to `/landing` and `/app-shell` (404, or redirect to `/`) so they do not become duplicate URLs. Also add `/landing` and `/app-shell` to `PUBLIC_PATHS` or make the rewrite happen before the gate.
3. Verify with `curl -sI https://tabedog.com/` and look for `x-vercel-cache: HIT`. Check the Next 16 docs in `node_modules/next/dist/docs/` for proxy rewrite and static-shell behavior before implementing. Note that on Vercel a rewrite target that is static is served from the CDN only if the proxy does not set per-user `Cache-Control`. Expect `Vary` on the cookie, or accept SSR with `s-maxage` and `Vary: Cookie` as a fallback.

### H2. OpenGraph and Twitter metadata is broken on 102 of 103 pages
Evidence: counting `og:image` across the crawl found it on 1 page (the homepage only). `/tokyo` has `og:title` and `og:url` but no `og:image`, no `og:site_name`, no `og:locale`, no `twitter:image`. Its `twitter:title` is the generic "TabeDog: Tabelog in English, on a map" and `twitter:description` is the generic site description. This is true on all 103 pages (`twitter:title generic = 103`).

Cause: page-level `openGraph` in `app/[city]/page.tsx:22`, `app/[city]/[cuisine]/page.tsx:34` and `app/cuisine/[cuisine]/page.tsx:25` replaces (does not deep-merge) the layout's `openGraph`. The `twitter` object in `app/layout.tsx:19` is inherited unchanged. The file-convention `app/opengraph-image.tsx` is not attached to these routes once they define their own `openGraph`.

Fix: add a shared helper, e.g. `lib/seo-meta.ts`:
```ts
export const social = (title: string, description: string, url: string, type: "website" | "article") => ({
  openGraph: { title, description, url, type, siteName: SITE.name, locale: "en_US", images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: title }] },
  twitter: { card: "summary_large_image" as const, title, description, images: ["/opengraph-image"] },
});
```
Spread `...social(title, description, url, "article")` in all three `generateMetadata` functions and in `app/terms/page.tsx`. Better still, generate a per-page OG image (a sibling `opengraph-image.tsx` in `app/[city]/` and `app/cuisine/[cuisine]/`).

### H3. Production is behind the local tree: `/terms` redirects to `/login` (307) in production
Evidence: `curl -sI https://tabedog.com/terms` returned `307 location: /login?next=%2Fterms`. The page `app/terms/page.tsx` and the `^/terms$` allowance in `lib/supabase/proxy.ts` are uncommitted (`git status`: `?? app/terms/`, ` M lib/supabase/proxy.ts`). The footer link at `components/site.tsx:133` points to `/terms` on every public page.

Impact: if the footer change is deployed without the proxy change, every footer link sends crawlers into a redirect to a robots-blocked login page. Terms and privacy are also required for Google OAuth and Stripe review.

Fix: deploy `app/terms/`, `proxy.ts` and `components/site.tsx` together. After deploy, verify `/terms` returns 200 with `canonical https://tabedog.com/terms`. Also add `/terms` to `app/sitemap.ts` (optional, Low priority) or set `robots: noindex` on it if you do not want it indexed.

### H4. Unknown paths do not return 404: they 307 to `/login`, which is HTTP 200
Evidence:
```
/foo            -> 307 /login?next=%2Ffoo -> 200
/app            -> 307 /login?next=%2Fapp
/index.html     -> 307 /login?next=%2Findex.html
/Tokyo, /TOKYO  -> 307 /login?next=... (case variants are not canonicalized)
/manifest.webmanifest -> 307 /login
/tokyo/foo, /cuisine/foo -> 404 (correct; body has <meta name="robots" content="noindex">)
/favicon.ico    -> 404
```
Cause: `lib/supabase/proxy.ts:34-40` redirects every non-public path to `/login` before Next can route it, and `PUBLIC_PATHS` only lists known paths. Dynamic params are fine: `dynamicParams = false` in the three page files yields real 404s for invalid slugs under known cities and `/cuisine/`. `/[city]` does not catch arbitrary paths, because the proxy regex only whitelists the real city slugs and everything else is gated.

Impact: Googlebot probing junk or legacy URLs (and spam backlinks) gets a redirect to an uncrawlable, indexable login URL instead of a clean 404. `/login?next=...` is a parameter-explosion risk (see M1). Probing `/Tokyo` reveals that uppercase slugs are not normalized.

Fix: only gate real app routes. In `lib/supabase/proxy.ts`:
```ts
const APP_PATHS = [/^\/api\//];  // everything that truly needs a session
if (!user && !isPublic) {
  if (pathname.startsWith("/api/")) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  if (!APP_PATHS.some((re) => re.test(pathname))) return response; // let Next render the 404
  ...
}
```
In practice the app lives at `/`, so most non-API paths need no gate. Add a case-normalizing redirect: `if (pathname !== pathname.toLowerCase() && isPublicLower) return NextResponse.redirect(lowercased, 308)`.

## Medium

### M1. `/login` is indexable and has no title, description or canonical of its own
Evidence: `/login` returns title "TabeDog: Tabelog in English, on a map" (the site default, the same as the OG default), `<meta name="robots" content="index, follow">`, no canonical, and `cache-control: private, no-store`. `robots.txt` has `Disallow: /login`, so Google cannot read a `noindex` there. Every hub page links to it (the CTA buttons), and it appears in the "linked but not in sitemap" check (the only such URL).

Fix: pick one. Preferred: remove `Disallow: /login` from `app/robots.ts:6` and add to `app/login/page.tsx`:
```ts
export const metadata: Metadata = { title: "Sign in", robots: { index: false, follow: true }, alternates: { canonical: "/login" } };
```
Alternatively keep the disallow and accept that blocked URLs can still be indexed as URL-only results.
Also add `rel="nofollow"` to the CTA `<Link href="/login">` is not needed once noindex is in place.

### M2. Meta lengths exceed display limits on every page
Evidence (decoded): title length min 62, avg 67, max 81 (103/103 over 60; 17 over 70). Longest: `/cuisine/nabe` "Hot pot & motsunabe in Japan: Where to Eat It, Prices, and How to Order | TabeDog" (81 chars). Meta descriptions: min 161, avg 248, max 334 (103/103 over 160; 88 over 200). Google truncates titles at roughly 60 characters and descriptions at about 155-160.

Fix: shorten the templates.
- Cuisine: `${cuisine.name} in Japan: Where to Eat and How to Order` (set `title.absolute` or shorten the layout template `%s | TabeDog`).
- City: `Best Restaurants in ${city.name}: Tabelog Ratings in English` is already about 62 with the suffix; drop "Ratings in" or the suffix.
- Descriptions: cap with a helper `clip(s, 155)`; `app/[city]/[cuisine]/page.tsx:33` uses a full blurb sentence (`cc.blurb.split(". ")[0]`) that can be very long.

### M3. `www.tabedog.com` returns 200 (no 301 to apex), 
Evidence: `curl -sI https://www.tabedog.com/` returned `HTTP/2 200` with the same `x-matched-path: /` content. Canonicals point to the apex, which limits the damage, but it is duplicate content and splits links.
Fix: in Vercel > Project > Domains, set `www.tabedog.com` to "Redirect to tabedog.com" (308). Or add to `next.config.ts` a `redirects()` rule: `{ source: "/:path*", has: [{ type: "host", value: "www.tabedog.com" }], destination: "https://tabedog.com/:path*", permanent: true }`.

### M4. Security headers: only HSTS is present
Evidence: response headers include `strict-transport-security: max-age=63072000` and nothing else. Missing: `x-content-type-options`, `x-frame-options` or CSP `frame-ancestors`, `referrer-policy`, `permissions-policy`, CSP. HSTS lacks `includeSubDomains; preload`. Also `access-control-allow-origin: *` appears on static pages (Vercel default for static assets).
Fix in `next.config.ts`:
```ts
async headers() { return [{ source: "/:path*", headers: [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "geolocation=(self), camera=(), microphone=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
]}]; }
```
The app uses geolocation (`/api/locate`), so keep `geolocation=(self)`. Add a CSP in report-only mode first because of Stripe, Supabase, map tiles and Vercel Analytics.

### M5. Sitemap `lastmod` is one hard-coded date for all 103 URLs; `changefreq` and `priority` are ignored by Google
Evidence: `app/sitemap.ts:4` `const CONTENT_UPDATED = new Date("2026-10-20")`; every `<lastmod>` is `2026-10-20T00:00:00.000Z`. Google discards lastmod when it is not accurate.
Fix: keep one date per content file (for example `updated` on each City or Cuisine record in `lib/seo.ts`) or derive it from git commit date at build time. Drop `changeFrequency` and `priority`. Consider adding `/terms` (if indexable).

### M6. 48 of 103 pages are under 1000 words; templated city x cuisine pages risk "thin or duplicate" classification
Evidence: word count ranges 882-2244 (rendered text, scripts removed). The 90 `/[city]/[cuisine]` pages share a template with FAQs, `city.tabelog` text (the same paragraph reused on every page of a city) and `cuisine.score` text. Titles and descriptions are all unique (0 duplicates), which is good.
Fix: spend the effort on unique content per page (named restaurants, price ranges, hours) rather than reusing the `city.tabelog` paragraph on all the city's cuisine pages (`app/[city]/[cuisine]/page.tsx` "Reading Tabelog scores" section). Monitor "Crawled, currently not indexed" in Search Console.

### M7. Pages with the thinnest internal linking
All 103 sitemap URLs are linked from at least one other page (no orphans). Lowest inlink counts: `/okinawa/steak` (6), `/kobe/chinese` (7), `/hiroshima/unagi` (8), `/kanazawa/kaiseki` (8). That is acceptable. The footer links to hubs on every page, so the structure is flat and healthy. Optional: add "nearby cities" links.

## Low

- **L1. robots.txt `Host:` directive** (`app/robots.ts:8`, output `Host: https://tabedog.com`). Non-standard; Google and Bing ignore it, and Yandex dropped it in 2018. Remove `host:`. Also consider explicit rules for AI crawlers (GPTBot, ClaudeBot, PerplexityBot, Google-Extended) per policy; currently all are allowed through `User-agent: *`.
- **L2. Missing `/favicon.ico`** (404). The icon is declared as `/logo.svg` only. Some crawlers (and Google's favicon service for SVG-only sites) prefer a raster icon. Add `app/favicon.ico` or `app/icon.png` (48x48 multiple).
- **L3. No `hreflang`**: none emitted; correct for a single-language site. Do not add one without a translation.
- **L4. No `llms.txt`** (404). Optional.
- **L5. IndexNow not implemented.** Add a key file and ping `https://api.indexnow.org/indexnow` after deploy to speed up Bing, Yandex and Naver discovery.
- **L6. Breadcrumb on cuisine pages** uses `/#cuisines` as the parent URL (`app/cuisine/[cuisine]/page.tsx:41`). A fragment URL in `BreadcrumbList` is not a real page. Point it to a `/cuisine` index page (does not exist) or drop the parent crumb.
- **L7. Structured data**: Homepage has `Organization`, `WebSite`, `WebApplication`, `FAQPage`. Hubs have `BreadcrumbList`, `FAQPage`, `WebPage`/`Article`. All parsed as valid JSON. Note that `FAQPage` rich results are limited to authoritative government and health sites since 2023, so expect no FAQ rich result; keep it for AI and answer-engine value. The `Article` type lacks `datePublished`/`dateModified`/`image`; add them (the author is the `#org` node, which is only defined on the homepage; define it inline or via the same `@id` in each page).
- **L8. Crawl budget and speed**: Cached hubs are TTFB about 0.2s. The `vary: rsc, next-router-state-tree...` header is standard.

## Verified OK
- Status: 103/103 sitemap URLs return 200 with no redirects (the sitemap uses the final URL form).
- Canonical: present and self-referencing on 103/103 (absolute URLs via `metadataBase`, `app/layout.tsx:9`). Home canonical is `https://tabedog.com` and matches the sitemap.
- Robots meta: `index, follow` on all 103; 404 pages carry `noindex`. `max-image-preview:large` set.
- Titles, descriptions: 0 duplicates, 0 missing. H1: exactly 1 on every page. All images have alt text (0 `<img>` without alt).
- Trailing slash: `/tokyo/`, `/cuisine/ramen/`, `/terms/` give a single 308 to the slashless URL (no chains, no loops). HTTP gives a single 308 to https.
- JS rendering: pages are SSR or SSG. Full content, links, JSON-LD and H1 are in the raw HTML (curl, no JS), so no rendering dependency. The app route `/` for a crawler (no cookie, no session) renders `<Landing />` (`app/page.tsx:18-20`); logged-in users get `<AppLoader>` and guests (cookie `GUEST_COOKIE=1`) get the guest app. Googlebot always sees the landing page.
- robots.txt is valid, with `Sitemap:` declared and the sitemap itself returning 200 with 103 `<url>` entries. Admin paths (`/api/`, `/auth/`) are disallowed.
- Redirect chains: none found longer than 1 hop.
- Dynamic params: `dynamicParams = false` returns clean 404s for invalid slugs, so there are no soft 404s on `/tokyo/foo` and `/cuisine/foo`.

## Full crawl table (curl, 5 concurrent)
| URL | Status | Words | H1 | Title len | Desc len | Canonical OK |
|---|---|---|---|---|---|---|
| /tokyo | 200 | 1276 | 1 | 63 | 161 | yes |
| /osaka | 200 | 1130 | 1 | 63 | 195 | yes |
| /kyoto | 200 | 1186 | 1 | 63 | 200 | yes |
| / | 200 | 2244 | 1 | 73 | 326 | yes |
| /fukuoka | 200 | 1122 | 1 | 65 | 172 | yes |
| /sapporo | 200 | 1078 | 1 | 65 | 194 | yes |
| /yokohama | 200 | 1007 | 1 | 66 | 191 | yes |
| /kobe | 200 | 1003 | 1 | 62 | 191 | yes |
| /nagoya | 200 | 1084 | 1 | 64 | 181 | yes |
| /hiroshima | 200 | 996 | 1 | 67 | 191 | yes |
| /okinawa | 200 | 1072 | 1 | 65 | 194 | yes |
| /cuisine/ramen | 200 | 1396 | 1 | 67 | 211 | yes |
| /cuisine/sushi | 200 | 1439 | 1 | 67 | 217 | yes |
| /kanazawa | 200 | 1023 | 1 | 66 | 190 | yes |
| /nara | 200 | 976 | 1 | 62 | 178 | yes |
| /cuisine/yakiniku | 200 | 1130 | 1 | 70 | 224 | yes |
| /cuisine/izakaya | 200 | 1490 | 1 | 69 | 228 | yes |
| /cuisine/yakitori | 200 | 1034 | 1 | 70 | 226 | yes |
| /cuisine/tempura | 200 | 1003 | 1 | 69 | 214 | yes |
| /cuisine/tonkatsu | 200 | 946 | 1 | 70 | 188 | yes |
| /cuisine/soba | 200 | 975 | 1 | 66 | 202 | yes |
| /cuisine/udon | 200 | 993 | 1 | 66 | 210 | yes |
| /cuisine/unagi | 200 | 1077 | 1 | 67 | 212 | yes |
| /cuisine/kaiseki | 200 | 1160 | 1 | 69 | 229 | yes |
| /cuisine/okonomiyaki | 200 | 1020 | 1 | 73 | 233 | yes |
| /cuisine/kushikatsu | 200 | 882 | 1 | 72 | 197 | yes |
| /cuisine/seafood | 200 | 1074 | 1 | 69 | 224 | yes |
| /cuisine/curry | 200 | 980 | 1 | 76 | 224 | yes |
| /cuisine/kissaten | 200 | 1079 | 1 | 78 | 239 | yes |
| /cuisine/chinese | 200 | 948 | 1 | 69 | 227 | yes |
| /cuisine/steak | 200 | 1030 | 1 | 80 | 221 | yes |
| /cuisine/nabe | 200 | 978 | 1 | 81 | 211 | yes |
| /tokyo/ramen | 200 | 1084 | 1 | 63 | 238 | yes |
| /cuisine/okinawan | 200 | 937 | 1 | 70 | 211 | yes |
| /tokyo/sushi | 200 | 1045 | 1 | 63 | 209 | yes |
| /tokyo/yakiniku | 200 | 1019 | 1 | 66 | 249 | yes |
| /tokyo/izakaya | 200 | 1073 | 1 | 65 | 221 | yes |
| /tokyo/tempura | 200 | 990 | 1 | 65 | 310 | yes |
| /tokyo/tonkatsu | 200 | 920 | 1 | 66 | 195 | yes |
| /tokyo/soba | 200 | 948 | 1 | 62 | 223 | yes |
| /osaka/okonomiyaki | 200 | 1018 | 1 | 69 | 213 | yes |
| /tokyo/unagi | 200 | 934 | 1 | 63 | 311 | yes |
| /tokyo/kaiseki | 200 | 963 | 1 | 65 | 295 | yes |
| /tokyo/kissaten | 200 | 1024 | 1 | 74 | 246 | yes |
| /tokyo/yakitori | 200 | 1027 | 1 | 66 | 283 | yes |
| /osaka/sushi | 200 | 974 | 1 | 63 | 275 | yes |
| /osaka/yakiniku | 200 | 1015 | 1 | 66 | 308 | yes |
| /osaka/kushikatsu | 200 | 980 | 1 | 68 | 237 | yes |
| /osaka/ramen | 200 | 1015 | 1 | 63 | 249 | yes |
| /osaka/udon | 200 | 925 | 1 | 62 | 227 | yes |
| /kyoto/kaiseki | 200 | 1031 | 1 | 65 | 282 | yes |
| /osaka/izakaya | 200 | 1071 | 1 | 65 | 285 | yes |
| /osaka/curry | 200 | 943 | 1 | 72 | 257 | yes |
| /kyoto/ramen | 200 | 1086 | 1 | 63 | 311 | yes |
| /kyoto/kissaten | 200 | 1064 | 1 | 74 | 272 | yes |
| /kyoto/soba | 200 | 968 | 1 | 62 | 212 | yes |
| /kyoto/sushi | 200 | 1006 | 1 | 63 | 240 | yes |
| /fukuoka/ramen | 200 | 1070 | 1 | 65 | 255 | yes |
| /kyoto/tempura | 200 | 942 | 1 | 65 | 237 | yes |
| /kyoto/izakaya | 200 | 1065 | 1 | 65 | 255 | yes |
| /fukuoka/nabe | 200 | 1088 | 1 | 79 | 277 | yes |
| /fukuoka/yakitori | 200 | 1028 | 1 | 68 | 277 | yes |
| /sapporo/ramen | 200 | 1033 | 1 | 65 | 288 | yes |
| /fukuoka/udon | 200 | 940 | 1 | 64 | 266 | yes |
| /fukuoka/sushi | 200 | 1001 | 1 | 65 | 272 | yes |
| /fukuoka/izakaya | 200 | 1048 | 1 | 67 | 262 | yes |
| /sapporo/seafood | 200 | 977 | 1 | 67 | 267 | yes |
| /sapporo/curry | 200 | 940 | 1 | 74 | 245 | yes |
| /nagoya/unagi | 200 | 950 | 1 | 64 | 296 | yes |
| /sapporo/sushi | 200 | 955 | 1 | 65 | 239 | yes |
| /sapporo/izakaya | 200 | 1026 | 1 | 67 | 256 | yes |
| /sapporo/yakiniku | 200 | 997 | 1 | 68 | 292 | yes |
| /nagoya/tonkatsu | 200 | 930 | 1 | 67 | 273 | yes |
| /nagoya/yakitori | 200 | 996 | 1 | 67 | 240 | yes |
| /nagoya/udon | 200 | 949 | 1 | 63 | 296 | yes |
| /nagoya/ramen | 200 | 1002 | 1 | 64 | 232 | yes |
| /nagoya/kissaten | 200 | 1015 | 1 | 75 | 266 | yes |
| /yokohama/chinese | 200 | 961 | 1 | 68 | 202 | yes |
| /kobe/steak | 200 | 995 | 1 | 75 | 285 | yes |
| /yokohama/izakaya | 200 | 1031 | 1 | 68 | 312 | yes |
| /yokohama/ramen | 200 | 1018 | 1 | 66 | 283 | yes |
| /yokohama/sushi | 200 | 942 | 1 | 66 | 249 | yes |
| /hiroshima/okonomiyaki | 200 | 1028 | 1 | 73 | 302 | yes |
| /kobe/sushi | 200 | 938 | 1 | 62 | 298 | yes |
| /kobe/chinese | 200 | 939 | 1 | 64 | 241 | yes |
| /kobe/yakiniku | 200 | 965 | 1 | 65 | 260 | yes |
| /kobe/izakaya | 200 | 998 | 1 | 64 | 245 | yes |
| /hiroshima/seafood | 200 | 959 | 1 | 69 | 290 | yes |
| /okinawa/okinawan | 200 | 1026 | 1 | 68 | 330 | yes |
| /hiroshima/unagi | 200 | 896 | 1 | 67 | 275 | yes |
| /hiroshima/izakaya | 200 | 1000 | 1 | 69 | 272 | yes |
| /hiroshima/ramen | 200 | 1014 | 1 | 67 | 280 | yes |
| /okinawa/steak | 200 | 984 | 1 | 78 | 270 | yes |
| /okinawa/izakaya | 200 | 1031 | 1 | 67 | 236 | yes |
| /kanazawa/sushi | 200 | 986 | 1 | 66 | 334 | yes |
| /kanazawa/seafood | 200 | 944 | 1 | 68 | 254 | yes |
| /kanazawa/kaiseki | 200 | 914 | 1 | 68 | 311 | yes |
| /okinawa/seafood | 200 | 947 | 1 | 67 | 262 | yes |
| /kanazawa/izakaya | 200 | 997 | 1 | 68 | 287 | yes |
| /nara/sushi | 200 | 965 | 1 | 62 | 306 | yes |
| /nara/kissaten | 200 | 964 | 1 | 73 | 275 | yes |
| /nara/izakaya | 200 | 1006 | 1 | 64 | 308 | yes |
| /nara/kaiseki | 200 | 913 | 1 | 64 | 268 | yes |

