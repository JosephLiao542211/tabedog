export type Pay = { card: boolean; emoney: boolean; qr: boolean; cash: boolean };

export type Restaurant = {
  id: string;
  url: string;
  name: string;
  rating: number | null;
  reviews: number;
  station: string;
  tabelogDistanceM: number | null;
  genre: string;
  genreFull: string;
  dinner: string;
  lunch: string;
  closed: string;
  image: string | null;
  // from the detail page
  lat: number | null;
  lng: number | null;
  address: string;
  hours: string;
  pay: Pay | null;
  photos: string[];
  access: string;
  // computed per search
  distM: number | null;
  open: boolean | null;
};

/** A restaurant from a name search: the listing half, without coordinates or hours (see /api/place). */
export type PlaceHit = Pick<Restaurant, "id" | "url" | "name" | "rating" | "reviews" | "station" | "tabelogDistanceM" | "genre" | "genreFull" | "dinner" | "lunch" | "closed" | "image">;

export type Genre = { code: string; label: string; matched: boolean };

export type SortKey = "distance" | "rating" | "reviews" | "price_asc" | "price_desc";

export type SearchResponse = {
  fetchedAt: string;
  source: string;
  page: number;
  hasMore: boolean;
  origin: { lat: number; lng: number };
  radiusM: number;
  view: { s: number; w: number; n: number; e: number } | null; // set when the search was the map view's box, not a circle
  total: number | null;      // how many places Tabelog has in that box
  genre: Genre;
  features: string[];        // Tabelog search conditions read from the search text ("Private room")
  keyword: string;           // what went to Tabelog's keyword search: a restaurant name, usually
  keywordDropped: string;    // a keyword that matched nothing, searched without
  sort: SortKey;
  widened: boolean;
  items: Restaurant[];
};

export type LocateResponse = { lat: number; lng: number; acc: number; src: string; city: string; country: string };

export type Review = {
  id: string;
  url: string;               // the review on Tabelog
  title: string;
  text: string;
  full: boolean;             // false = Tabelog's ~100-char excerpt; the link has the rest
  rating: number | null;
  meal: "dinner" | "lunch" | null;
  amount: string;            // "JPY 6,000～JPY 7,999" per person, or ""
  visited: string;           // "September, 2026"
  visits: string;            // "1 time"
  reviewer: string;
  reviewerUrl: string;
  avatar: string | null;
  photos: string[];
};

export type ReviewsResponse = { url: string; items: Review[] };
