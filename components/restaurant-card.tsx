import type { Restaurant } from "@/lib/types";
import { fmtDist, priceOf } from "@/lib/format";

export const StatusDot = ({ open }: { open: boolean | null }) =>
  open === true ? <><span className="dot ok" />Open</> : open === false ? <><span className="dot no" />Closed</> : null;

export function RestaurantCard({ r, index, active, meal, onClick }: {
  r: Restaurant; index: number; active: boolean; meal: "dinner" | "lunch"; onClick: () => void;
}) {
  const price = priceOf(r, meal);
  return (
    <article className={"card" + (active ? " active" : "")} data-id={r.id} onClick={onClick}>
      {r.image ? <img src={r.image} alt="" loading="lazy" /> : <div className="noimg" />}
      <div>
        <h2><span className="n">{index + 1}</span><span>{r.name}</span></h2>
        <p className="p1">
          <span className="star">★ {r.rating ?? "–"}</span> · {r.reviews.toLocaleString()} reviews{r.distM != null ? ` · ${fmtDist(r.distM)}` : ""}
        </p>
        <p className="p2">
          <StatusDot open={r.open} />{r.open != null ? " · " : ""}{r.genre}{price ? " · " + price : ""}
        </p>
      </div>
    </article>
  );
}
