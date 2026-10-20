"use client";

import { useState } from "react";
import type { Restaurant } from "@/lib/types";
import { fmtDist, priceOf } from "@/lib/format";
import { CardIcon, CashIcon, QrIcon } from "./icons";

export const StatusDot = ({ open }: { open: boolean | null }) =>
  open === true ? <><span className="dot ok" />Open</> : open === false ? <><span className="dot no" />Closed</> : null;

export function RestaurantCard({ r, index, active, meal, tags = [], onClick }: {
  r: Restaurant; index: number; active: boolean; meal: "dinner" | "lunch"; tags?: string[]; onClick: () => void;
}) {
  const price = priceOf(r, meal);
  const [broken, setBroken] = useState(false);
  return (
    <article className={"card" + (active ? " active" : "")} data-id={r.id} onClick={onClick}>
      {r.image && !broken ? <img src={r.image} alt="" loading="lazy" onError={() => setBroken(true)} /> : <div className="noimg" />}
      <div>
        <h2>
          <span className="n">{index + 1}</span>
          <span>{r.name}</span>
          {tags.length > 0 && <span className="tags">{tags.map((c) => <i key={c} style={{ background: c }} />)}</span>}
        </h2>
        <p className="p1">
          <span className="star">★ {r.rating ?? "–"}</span> · {r.reviews.toLocaleString()} reviews{r.distM != null ? ` · ${fmtDist(r.distM)}` : ""}
        </p>
        <p className="p2">
          <StatusDot open={r.open} />{r.open != null ? " · " : ""}{r.genre}{price ? " · " + price : ""}
        </p>
        {r.pay && (
          <p className="pays" aria-label="Payment">
            <span className={"k-card" + (r.pay.card ? "" : " off")} title={r.pay.card ? "Cards accepted" : "No cards"}><CardIcon /></span>
            <span className={"k-cash" + (r.pay.cash ? "" : " off")} title={r.pay.cash ? "Cash accepted" : "Cashless only"}><CashIcon /></span>
            <span className={"k-qr" + (r.pay.qr ? "" : " off")} title={r.pay.qr ? "QR code payment accepted" : "No QR code payment"}><QrIcon /></span>
          </p>
        )}
      </div>
    </article>
  );
}
