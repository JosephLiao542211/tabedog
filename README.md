# TabeDog

A personal map front end for [Tabelog](https://tabelog.com/en/) (which has no public API). A map, a floating list, and one search bar at the bottom. Everything else is worked out for you.

Design: Urbanist, light only, white `#fdfffc` with tomato `#ff6347` as the single accent. All floating surfaces (list, search bar, area pill, zoom and recenter controls, popups) share the same card style.

## Run

```sh
npm install
npm start            # http://localhost:3456
```

Optional: a Redis on `localhost:6379` (or `REDIS_URL`) is used for caching; otherwise a local `cache.sqlite` file is used automatically.

## How it works

- **Where you are** is fixed automatically: the saved `tabelog_loc` cookie (full precision, 1 year) → browser GPS (high accuracy, refined for a few seconds) → your IP (`geoip-lite`, with a public-IP lookup when the request comes from localhost). Results from a coarse IP fix show up immediately and are replaced once GPS lands. Right-click (long-press on touch) the map to set your location by hand. The person icon is grey while the fix is only IP-based.
- **Search bar** takes what you feel like eating ("ramen", "boba", "pork cutlet"…). The server maps it to one of Tabelog's genre codes; unknown words fall back to all restaurants and the list says so.
- **Search this area** appears as soon as the map centre moves a quarter of the searched radius (or you zoom out past it). The radius is picked from the viewport. The pill shows a progress bar while Tabelog is fetched.
- **Filters** (sliders icon): payment (card / QR / e-money, Tabelog-native), price per person for dinner or lunch (Tabelog-native), minimum rating, open now. **Sort** (arrows icon): nearest, highest rated, most reviewed.
- **Open now** is computed on the server in JST from each restaurant's business-hours table on its detail page. Minimum rating uses Tabelog's rating sort so the cut-off needs few pages.
- The list loads more as you scroll; there are no page buttons.

## API

| Route | What it does |
| --- | --- |
| `GET /api/search?lat&lon&range&q&sort&pay&pmin&pmax&meal&minRating&open&page` | The one search endpoint. Two Tabelog pages per call (40 results), filtered and sorted server-side. Falls back to the `tabelog_loc` cookie when `lat`/`lon` are missing. |
| `GET /api/locate` | Coarse location from the caller's IP. |
| `GET /api/genres` | Genre codes and labels for the search suggestions. |
| `GET /api/health` | Cache backend and key count. |

`range` is a Tabelog code: F 300 m, G 500 m, A 800 m, B 1 km, C 3 km, D 5 km, E 10 km. `pmin`/`pmax` are Tabelog price codes 0–16 (0, ¥1k, ¥2k … ¥100k).

## Caching

| What | TTL |
| --- | --- |
| Listing page (per Tabelog URL) | 15 min |
| Restaurant coordinates, address, hours | 90 days |
| IP location of this machine | 1 h |

Cold searches take 2–4 s (one detail page per restaurant, 6 in parallel); warm ones ~20 ms.
