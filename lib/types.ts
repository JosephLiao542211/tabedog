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

export type Genre = { code: string; label: string; matched: boolean };

export type SortKey = "distance" | "rating" | "reviews";

export type SearchResponse = {
  fetchedAt: string;
  source: string;
  page: number;
  hasMore: boolean;
  origin: { lat: number; lng: number };
  radiusM: number;
  genre: Genre;
  sort: SortKey;
  widened: boolean;
  items: Restaurant[];
};

export type LocateResponse = { lat: number; lng: number; acc: number; src: string; city: string; country: string };
