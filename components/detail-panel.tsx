"use client";

import { useState, type ReactNode } from "react";
import type { Restaurant } from "@/lib/types";
import { fmtDist, fmtPrice } from "@/lib/format";
import { StatusDot } from "./restaurant-card";
import { ArrowOut, CardIcon, CashIcon, ChevronLeft, ChevronRight, ClockIcon, ForkIcon, HeartIcon, PinIcon, QrIcon, TrainIcon, XIcon, YenIcon } from "./icons";

const FactLine = ({ icon, main, sub }: { icon: ReactNode; main: ReactNode; sub?: ReactNode }) =>
  main ? <div className="line">{icon}<div><p className="p2">{main}</p>{sub ? <span className="sub">{sub}</span> : null}</div></div> : null;

const PAY: Array<[key: "card" | "cash" | "qr", label: string, Icon: () => ReactNode]> = [["card", "Card", CardIcon], ["cash", "Cash", CashIcon], ["qr", "QR code", QrIcon]];

// Remount with key={r.id} so the gallery index and scroll position reset per restaurant.
export function DetailPanel({ r, saved, onToggleSave, onClose }: { r: Restaurant; saved: boolean; onToggleSave: () => void; onClose: () => void }) {
  const photos = r.photos?.length ? r.photos : r.image ? [r.image] : [];
  const [i, setI] = useState(0);
  const show = (n: number) => setI((n + photos.length) % photos.length);
  const dinner = fmtPrice(r.dinner), lunch = fmtPrice(r.lunch);
  const hours = String(r.hours || "").replace(/^■Business hours\s*/i, "").replace(/\s*■/g, " · ").trim();
  const access = String(r.access || r.station || "").split(/(?<=\.)\s+/)[0];

  return (
    <section id="detail" className="float">
      <div id="gallery">
        {photos.length ? <img src={photos[i]} alt="" /> : null}
        {photos.length > 1 && (
          <>
            <button className="nav prev" aria-label="Previous photo" onClick={() => show(i - 1)}><ChevronLeft /></button>
            <button className="nav next" aria-label="Next photo" onClick={() => show(i + 1)}><ChevronRight /></button>
          </>
        )}
        <div className="dots">{photos.map((_, k) => <i key={k} className={k === i ? "on" : ""} />)}</div>
        <button id="saveBtn" className={"gallery-btn" + (saved ? " on" : "")} aria-label={saved ? "Remove from saved" : "Save this place"} aria-pressed={saved} title={saved ? "Saved" : "Save"} onClick={onToggleSave}>
          <HeartIcon filled={saved} />
        </button>
        <button id="closeDetail" className="gallery-btn" aria-label="Close" onClick={onClose}><XIcon /></button>
      </div>
      <div id="facts">
        <h2>{r.name}</h2>
        <p className="p1"><span className="star">★ {r.rating ?? "–"}</span> · {r.reviews.toLocaleString()} reviews{r.distM != null ? ` · ${fmtDist(r.distM)} away` : ""}</p>
        <a className="btn" href={r.url} target="_blank" rel="noopener">Reserve<ArrowOut /></a>
        <FactLine icon={<ForkIcon />} main={r.genreFull || r.genre} />
        <FactLine
          icon={<ClockIcon />}
          main={r.open == null ? hours : <><StatusDot open={r.open} /> now</>}
          sub={r.open == null ? "" : hours + (r.closed ? ` · Closed ${r.closed}` : "")}
        />
        <FactLine icon={<YenIcon />} main={[dinner && `${dinner} dinner`, lunch && `${lunch} lunch`].filter(Boolean).join(" · ")} />
        <FactLine icon={<PinIcon />} main={r.address} />
        <FactLine icon={<TrainIcon />} main={access} />
        {PAY.map(([k, label, Icon]) => {
          const on = !!(r.pay && r.pay[k]);
          return <div key={k} className={`pay k-${k}${on ? "" : " off"}`}><Icon /><p className="p2">{label}{on ? "" : " · not accepted"}</p></div>;
        })}
      </div>
    </section>
  );
}
