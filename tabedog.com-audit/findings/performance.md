# Performance, CWV and image SEO: tabedog.com (audited 2026-10-22)

Method: curl x3 per URL, live HTML script/CSS inspection, br-compressed chunk sizes, source review. PSI API returned HTTP 429 (shared no-key daily quota exhausted), so there is NO lab score and NO CrUX field data in this report. Run PSI with an API key to confirm. LCP/INP/CLS below are inferred from code and payloads, not measured.

## Evidence
| URL | TTFB (3 runs) | HTML | cache-control | x-vercel-cache |
|---|---|---|---|---|
| / | 0.42 / 0.45 / 0.48 s | 148 KB | private, no-cache, no-store | MISS |
| /tokyo | 0.41 (cold) / 0.20 / 0.22 s | 65 KB | public, max-age=0, must-revalidate | HIT |
| /cuisine/ramen, sushi, yakiniku | 0.19-0.50 s (first hit slower) | 57-62 KB | same | HIT |
| /tokyo/ramen (city x cuisine) | 200, static | - | same | HIT |

JS/CSS (brotli, transferred): homepage 430 KB (10 JS + 2 CSS, 214 KB of it is one chunk containing maplibre-gl); /tokyo 201 KB, no maplibre.

## Findings

### HIGH 1. Homepage is dynamic and uncacheable; maplibre ships in its initial JS
- app/page.tsx calls createClient()+auth.getUser() and cookies() for every visitor, so the whole landing page (148 KB HTML, 14 imgs) becomes no-store, MISS, TTFB ~0.45 s (vs ~0.2 s CDN HIT on hub pages). Anonymous crawlers and most first-time visitors pay this.
- Chunk 25j_89agm4cjp.js (214 KB br) contains maplibre-gl; it is loaded on / via async script tags because components/landing.tsx statically imports components/landing-map.tsx ("use client", `import maplibregl`). Hub pages do not load it. Plus maplibre-gl.css in the CSS.
- Fix: (a) make `/` fully static and move auth/guest routing to the proxy (lib/supabase/proxy.ts redirect or rewrite signed-in/guest users to an /app route) or to a client-side check; keep the anonymous landing prerendered/ISR. (b) In landing-map.tsx lazy-load maplibre: `const maplibregl = (await import("maplibre-gl")).default` inside the effect, started via IntersectionObserver/requestIdleCallback; render the static SpotCard/placeholder first. Expected: -214 KB br initial JS (about -50%), lower TBT/INP risk, LCP improved on mobile. Also import maplibre CSS only in the lazy path.
- Also `app/page.tsx` 'guest' path renders AppLoader (ssr:false dynamic) = blank "Loading the map..." shell; fine for app, but should not share the SEO route.

### HIGH 2. Hub pages lack an og:image / Twitter image (image SEO)
- Only app/opengraph-image.tsx exists (root, static text card, 1200x630 PNG, alt set). Home has og:image. /tokyo and /cuisine/ramen have 0 og:image tags: city/cuisine/city-cuisine generateMetadata defines `openGraph` without images, and Next replaces (does not merge) the parent openGraph object, so the file-based root image is dropped. Twitter title/description on /tokyo are also the homepage's (inherited), not page-specific.
- Fix: add app/[city]/opengraph-image.tsx, app/cuisine/[cuisine]/opengraph-image.tsx, app/[city]/[cuisine]/opengraph-image.tsx (ImageResponse with city/cuisine name and a photo from /img), export `alt`, and add generateStaticParams so they are prerendered; or set `openGraph.images` and `twitter.images` explicitly in each generateMetadata. Set twitter title/description per page.
- OG image response has cache-control public, max-age=0, must-revalidate; fine if prerendered, otherwise add long cache.

### HIGH 3. Oversized originals in public/ (13.5 MB, 9.0 MB, 14.8 MB JPEGs)
- public/aerial-view-tokyo-...jpg, autumn-season-mountain-fuji-...jpg, cherry-blossoms-sensoji-...jpg are committed and publicly served (HTTP 200, 14,841,064 bytes confirmed at /cherry-blossoms-sensoji-temple-asakusa-tokyo-japan.jpg). Not referenced by pages (the pages use resized /img/*.jpg) but they bloat the repo/deploy and are crawlable, and could be hit by image bots. Remove from public/ (keep sources outside the repo; if image-search ranking of the descriptive filenames is wanted, serve the optimized copies under keyword filenames instead).
- public/img sources: sensoji.jpg 1.09 MB, kawaguchiko.jpg 0.99 MB, tokyo-aerial.jpg 0.66 MB, yakitori 0.56 MB; recompress to <=300 KB at 2000 px max width.

### MEDIUM 4. next/image config: srcset too wide, all images lazy, no priority
- Every tile `sizes="(max-width: 720px) 50vw, 25vw"` is fine, but default `src` is w=3840 (the browser-fallback src) and srcset runs to 3840w; the 25vw tiles are generated up to 3840 wide (w=3840 returns 209 KB webp vs 58 KB at w=384). Set `images: { deviceSizes: [640, 828, 1080, 1280, 1600], imageSizes: [256, 384], formats: ["image/avif","image/webp"], qualities: [60,75] }` in next.config.ts (currently has no images block, so only WebP, no AVIF; output is image/webp today). Expected: ~20-30% smaller image bytes, smaller Vercel transformation cache.
- All 14 homepage <img> are loading="lazy" (correct for below-the-fold). The hero is a map plus text, so LCP is likely the h1 text or the hero card; keep it that way (do not add a hero photo without `priority`). Not verifiable without PSI/CrUX.
- The same /img/yakitori.jpg and /img/takoyaki.jpg appear twice on the homepage (dedupe in markup is cheap but they hit the same URL, so no extra bytes).

### MEDIUM 5. Alt text
- 4 informative images have good descriptive alt. 10 cuisine tiles (sushi, ramen, yakiniku, izakaya, washoku, tempura, tonkatsu, soba, udon, unagi, takoyaki) and the CTA band image use alt="" (decorative, acceptable only because adjacent link text names the cuisine; confirm the tile's link text includes the cuisine name). The CTA image (components/site.tsx:84) is a pure background; fine. Spot photos in landing-map.tsx:169 use alt="" with raw <img loading="lazy"> without width/height (see CLS below). Hub pages (/tokyo) render 0 <img>: consider one photo per city hub with descriptive alt for image-search and engagement.
- Wikimedia photos are credited in the footer with licence links (good: CC BY attribution satisfied).

### MEDIUM 6. Fonts
- Urbanist via next/font/google, display: "swap", self-hosted (two woff2 preloaded via Link header, good, no Google Fonts request). Loads normal+italic across latin; verify italic is actually used, otherwise drop `style: ["normal","italic"]` (saves one preload, ~20-30 KB). Variable font keeps weights in one file. next/font adjusts fallback metrics, so swap CLS is minimal.

### LOW 7. CLS
- Hero map has fixed height (clamp(380px,46vw,560px)); photo tiles use fill inside aspect-ratio boxes; #gallery has aspect-ratio. No obvious shift source in the SSR HTML. Risks: raw <img class="ld-spot-img"> uses aspect-ratio 3/2 CSS (OK), and map pins/SpotCard injected client-side after maplibre loads inside an absolutely sized container (OK). Verify with PSI/CrUX.

### LOW 8. Third parties
- Only @vercel/analytics (first-party-proxied script, small). Map tiles from openfreemap.org at runtime (add `<link rel="preconnect" href="https://tiles.openfreemap.org">` only on pages with the map, ideally when map is in view). No ads/embeds/tag managers.

### LOW 9. Caching headers on hub pages
- HTML is `public, max-age=0, must-revalidate` (Vercel default for static), served from edge HIT with ~0.2 s TTFB from kix (Osaka edge) to origin iad1 only on miss. First request after deploy shows 0.4-0.5 s. Consider region closer to Japan users for dynamic routes (functions currently iad1; Supabase auth calls are cross-region from there): set `preferredRegion`/vercel.json `regions: ["hnd1"]` if Supabase project region is Asia-Pacific. Hub-page TTFB is good.

## Core Web Vitals status (inferred, unmeasured)
- LCP: / at risk (TTFB 0.45 s + 430 KB JS + maplibre CSS); hub pages likely pass (TTFB ~0.2 s, 201 KB JS, text LCP).
- INP: / at risk from maplibre init (several maps: hero + strip + premium MiniMaps, each a WebGL context) on main thread; check long tasks.
- CLS: likely pass.

## Priority order
1. Lazy-load maplibre on landing + make `/` static (biggest win).
2. Add per-page OG/Twitter images for city, cuisine, city x cuisine.
3. Delete 38 MB of unused originals from public/; recompress /img sources.
4. next.config images: AVIF, smaller deviceSizes.
5. Re-run PSI with an API key and pull CrUX for field validation.
6. Multiple MiniMap instances on one page: share one map or use static map images for below-the-fold ones.
