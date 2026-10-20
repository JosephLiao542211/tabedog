import type { SortKey } from "@/lib/types";

export type Filters = {
  q: string;
  sort: SortKey;
  pay: string[];            // card, qr, emoney
  price: string;            // "" or "pmin-pmax" price codes
  meal: "dinner" | "lunch";
  minRating: string;        // "", "3", "3.5", "4"
  open: boolean;
  range: string;            // Tabelog radius code F..E
};

export const DEFAULT_FILTERS: Filters = { q: "", sort: "distance", pay: [], price: "", meal: "dinner", minRating: "", open: false, range: "A" };

export const activeFilterCount = (f: Filters) => f.pay.length + (f.price ? 1 : 0) + (f.minRating ? 1 : 0) + (f.open ? 1 : 0);

const PRICES: Array<[string, string]> = [["", "Any"], ["0-1", "Under ¥1k"], ["1-3", "¥1–3k"], ["3-6", "¥3–6k"], ["6-8", "¥6–10k"], ["8-0", "¥10k+"]];
const RATINGS: Array<[string, string]> = [["", "Any"], ["3", "3.0+"], ["3.5", "3.5+"], ["4", "4.0+"]];
const PAYS: Array<[string, string]> = [["card", "Card"], ["qr", "QR code"], ["emoney", "E-money"]];

export function FilterPanel({ f, onChange, onReset }: { f: Filters; onChange: (patch: Partial<Filters>) => void; onReset: () => void }) {
  const chip = (on: boolean, label: React.ReactNode, onClick: () => void, key: string) =>
    <button key={key} type="button" className={"chip" + (on ? " on" : "")} onClick={onClick}>{label}</button>;
  return (
    <div className="panel" id="filterPanel">
      <p className="sub">Payment</p>
      <div className="row">
        {PAYS.map(([v, l]) => chip(f.pay.includes(v), l, () => onChange({ pay: f.pay.includes(v) ? f.pay.filter((x) => x !== v) : [...f.pay, v] }), v))}
      </div>
      <p className="sub">Price per person</p>
      <div className="row">
        {PRICES.map(([v, l]) => chip(f.price === v, l, () => onChange({ price: v }), v || "any"))}
        <div className="seg">
          <button type="button" className={f.meal === "dinner" ? "on" : ""} onClick={() => onChange({ meal: "dinner" })}>Dinner</button>
          <button type="button" className={f.meal === "lunch" ? "on" : ""} onClick={() => onChange({ meal: "lunch" })}>Lunch</button>
        </div>
      </div>
      <p className="sub">Minimum rating</p>
      <div className="row">{RATINGS.map(([v, l]) => chip(f.minRating === v, l, () => onChange({ minRating: v }), v || "any"))}</div>
      <p className="sub">Hours</p>
      <div className="row">{chip(f.open, <><span className="dot ok" />Open now</>, () => onChange({ open: !f.open }), "open")}</div>
      <div className="foot"><button type="button" className="link" onClick={onReset}>Reset filters</button></div>
    </div>
  );
}

const SORTS: Array<[SortKey, string]> = [["distance", "Nearest first"], ["rating", "Highest rated"], ["reviews", "Most reviewed"], ["price_asc", "Cheapest first"], ["price_desc", "Priciest first"]];

export function SortPanel({ value, onChange }: { value: SortKey; onChange: (s: SortKey) => void }) {
  return (
    <div className="panel" id="sortPanel">
      {SORTS.map(([v, l]) => <button key={v} type="button" className={"opt" + (value === v ? " on" : "")} onClick={() => onChange(v)}><i />{l}</button>)}
    </div>
  );
}
