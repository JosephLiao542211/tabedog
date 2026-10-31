# TabeDog

A personal map front end for [Tabelog](https://tabelog.com/en/) (which has no public API). A map, a floating list, and one search bar at the bottom. Everything else is worked out for you. Sign in, and the places you heart are saved to your account.

Built with **Next.js 16** (App Router, route handlers for the backend) and **Supabase** (Auth for sign-in, Postgres for the scrape cache and saved places).

Design: Urbanist, light only, white `#fdfffc`, tomato `#ff6347` accent, green `#4CB944` for open. The basemap is OpenFreeMap Positron with blue water, green parks and warm land put back in, so it stays quiet but not grey. All floating surfaces (list, detail panel, search bar, area pill, zoom and recenter controls) share the same card style. Logo: `public/logo.svg`.

## Run locally

Needs Node 20+ and Docker (for the local Supabase stack).

```sh
npm install
npm run db:start                       # local Supabase (Postgres, Auth, Studio) on ports 5453x
npm run db:status                      # prints API_URL, ANON_KEY, SERVICE_ROLE_KEY
cp .env.example .env.local             # paste the three values in
npm run dev                            # http://localhost:3000
```

`npm run db:start` applies `supabase/migrations/*` automatically. Studio is at http://127.0.0.1:54533. Locally, email confirmation is off, so "Create account" signs you straight in.

### Use a hosted Supabase project instead

1. Create a project at https://supabase.com/dashboard (or `npx supabase projects create tabelog-map`).
2. `npx supabase link --project-ref <ref>` then `npm run db:push` to apply the migrations.
3. Put the project URL, anon (or publishable) key and service_role (or secret) key in `.env.local` (or Vercel env vars).
4. In Authentication → URL Configuration, set the site URL to your deployment and add `https://<your-host>/auth/callback` to the redirect list.

## Project layout

```
proxy.ts                   refreshes the Supabase session and sends signed-out visitors to /login
app/
  page.tsx                 the app (server component: checks the user, then loads the map client-side)
  login/page.tsx           sign in / create account
  auth/callback/route.ts   exchanges email-confirmation links for a session
  auth/signout/route.ts    POST → sign out
  api/search/route.ts      the one search endpoint
  api/locate/route.ts      coarse location from the caller's IP
  api/genres/route.ts      genre codes and labels for the suggestions
  api/health/route.ts      cache backend and key count
components/
  tabedog-app.tsx          map, list, detail, search, filters, saved places
  login-form.tsx, detail-panel.tsx, filter-panel.tsx, restaurant-card.tsx, icons.tsx
lib/
  tabelog.ts               Tabelog scraping, hours parsing, search (server only)
  cache.ts                 scrape cache: Supabase table + in-process memory layer
  geoip.ts                 IP → location (Vercel headers, else ipapi.co)
  genres.ts                genre list and text → genre resolver (shared with the client)
  favorites.ts             saved places, read/written from the browser under RLS
  supabase/                server, browser and proxy clients
supabase/
  config.toml              local stack (ports 54531 API, 54532 DB, 54533 Studio)
  migrations/              scrape_cache, favorites + RLS policies
```

## How it works

- **Sign in** is required everywhere except `/login` and `/auth/*`. `proxy.ts` validates the session on each request; API routes answer 401 when signed out.
- **Where you are** is fixed automatically: the saved `tabelog_loc` cookie (full precision, 1 year) → your IP, then live browser GPS (high accuracy) that keeps tracking you the whole time the app is open. Results from a coarse IP fix show up immediately and are replaced once GPS lands. The locate button just makes the map follow you. The person icon is grey while the fix is only IP-based.
- **Search bar** takes what you feel like eating ("ramen", "boba", "pork cutlet"…). The server maps it to one of Tabelog's genre codes; unknown words fall back to all restaurants and the list says so.
- **Search this area** appears as soon as the map centre moves a quarter of the searched radius (or you zoom out past it). The radius is picked from the viewport.
- **Filters** (sliders icon): payment (card / QR / e-money, Tabelog-native), price per person for dinner or lunch (Tabelog-native), minimum rating, open now. **Sort** (arrows icon): nearest, highest rated, most reviewed.
- **Saved** (heart icon): tap the heart on a detail panel to save a place; the heart in the toolbar lists them. Rows live in `favorites`, scoped to your user by Row Level Security.
- **Open now** is computed on the server in JST from each restaurant's business-hours table on its detail page.
- The list loads more as you scroll; there are no page buttons.
- Tapping a card or pin opens a detail panel on the right: photo carousel on top, then name, rating, a Reserve button (opens the restaurant on Tabelog), cuisine, hours and open state, prices, address, nearest station, and one row per payment method.

## API

All routes require a signed-in session cookie.

| Route | What it does |
| --- | --- |
| `GET /api/search?lat&lon&range&q&sort&pay&pmin&pmax&meal&minRating&open&page` | The one search endpoint. Two Tabelog pages per call (40 results), filtered and sorted server-side. Falls back to the `tabelog_loc` cookie when `lat`/`lon` are missing. |
| `GET /api/locate` | Coarse location from the caller's IP. |
| `GET /api/genres` | Genre codes and labels for the search suggestions. |
| `GET /api/health` | Cache backend and key count. |

`range` is a Tabelog code: F 300 m, G 500 m, A 800 m, B 1 km, C 3 km, D 5 km, E 10 km. `pmin`/`pmax` are Tabelog price codes 0–16 (0, ¥1k, ¥2k … ¥100k).

## Caching

Scraped pages are cached in the `scrape_cache` table (service role only) with a small in-process memory layer in front. Without `SUPABASE_SERVICE_ROLE_KEY` the app still runs, memory-only.

| What | TTL |
| --- | --- |
| Listing page (per Tabelog URL) | 15 min |
| Restaurant coordinates, address, hours, payment methods, photos | 90 days |
| IP location | 1 h |

Cold searches take 2–4 s (one detail page per restaurant, 6 in parallel); warm ones are near-instant.

## Admin dashboard

`/admin` shows user counts: total, new sign-ups, recent sign-ins, Premium and a 30-day sign-up chart. It uses the same `BLOG_ADMIN_EMAILS` gate as the blog tools and only displays aggregates. Guests have no account, so they aren't counted.

## Blog

`/blog` is a Notion-style blog; `/admin/blog` is the dashboard for writing it. Posts are markdown in the `posts` table, images go to the public `blog` Storage bucket (migration `20261023000000_blog.sql`).

- **Who can write:** signed-in users whose confirmed email is in `BLOG_ADMIN_EMAILS` (defaults to `OPERATOR.email`). Everyone else gets a 404. Writes use the service role; RLS only lets the public read published posts.
- **Editor:** [MDXEditor](https://mdxeditor.dev) (WYSIWYG with a raw-markdown toggle). Drag, paste or upload images (signed upload URLs, so no 4.5 MB function limit), or link any image URL. Tables, task lists, code blocks, footnotes all work.
- **Rendering:** `react-markdown` + `remark-gfm`, `rehype-slug`, `rehype-autolink-headings`, `rehype-highlight`. An image-only paragraph becomes a captioned figure (the image title is the caption), several become a gallery, and a bare YouTube link becomes an embed. Raw HTML is not rendered.
- **SEO, automatic:** title/description fallbacks, canonical, Open Graph/Twitter article tags, a generated social card (cover photo + title), `BlogPosting` + breadcrumb JSON-LD, sitemap entries with images, RSS at `/blog/rss.xml`, and a live checklist/score in the editor.
- **Publishing:** pages are static (ISR, 1 h). Saving revalidates the blog, sitemap and feed right away. A future publish date schedules a post; it appears within the hour after that time.
- **Topics:** edit `TOPICS` in `lib/blog.ts`.

## Deploy

Works as a normal Next.js app on Vercel. Set the three env vars from `.env.example`, point them at a hosted Supabase project, and add your deployment URL to Supabase's redirect allow-list. On Vercel `/api/locate` uses the platform's geo headers, so no third-party lookup is needed.
