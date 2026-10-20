"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import type { Restaurant, Review, ReviewsResponse } from "@/lib/types";
import { colorHex, type SavedList } from "@/lib/lists";
import { AddToListMenu, type ListDraft } from "./lists";
import { UpgradePrompt } from "./upgrade";
import { bigPhoto, fmtDist, fmtPrice } from "@/lib/format";
import { StatusDot } from "./restaurant-card";
import { Hours } from "./hours";
import { ArrowOut, CardIcon, CashIcon, ChevronLeft, ChevronRight, ClockIcon, ForkIcon, HeartIcon, ListPlusIcon, PinIcon, QrIcon, TrainIcon, XIcon, YenIcon } from "./icons";

const FactLine = ({ icon, main, sub }: { icon: ReactNode; main: ReactNode; sub?: ReactNode }) =>
  main ? <div className="line">{icon}<div><p className="p2">{main}</p>{sub ? <span className="sub">{sub}</span> : null}</div></div> : null;

const PAY: Array<[key: "card" | "cash" | "qr", label: string, Icon: () => ReactNode]> = [["card", "Card", CardIcon], ["cash", "Cash", CashIcon], ["qr", "QR code", QrIcon]];

function ReviewItem({ v }: { v: Review }) {
  const [more, setMore] = useState(false);
  const long = v.text.length > 220;
  return (
    <article className="rvw">
      <header>
        {v.avatar ? <img src={v.avatar} alt="" loading="lazy" /> : <i className="noavatar" />}
        <div>
          <p className="p2"><b>{v.reviewer || "Tabelog user"}</b></p>
          <p className="sub">
            {v.rating != null && <span className="star">★ {v.rating.toFixed(1)}</span>}
            {v.rating != null && (v.meal || v.visited) ? " · " : ""}{v.meal ? v.meal[0].toUpperCase() + v.meal.slice(1) : ""}{v.meal && v.visited ? " · " : ""}{v.visited}
          </p>
        </div>
        {v.amount && <span className="sub amt">{v.amount.replace(/JPY\s?/g, "¥").replace("～", "–")}</span>}
      </header>
      {v.title && <p className="p1 rvw-title">{v.title}</p>}
      <p className={"p2 rvw-text" + (long && !more ? " clamp" : "")}>{v.text}</p>
      {v.full && long && <button type="button" className="link" onClick={() => setMore((m) => !m)}>{more ? "Show less" : "Read more"}</button>}
      {!v.full && <a className="link" href={v.url} target="_blank" rel="noopener">Read the full review<ArrowOut /></a>}
      {v.photos.length > 0 && <div className="rvw-photos">{v.photos.map((p) => <a key={p} href={v.url} target="_blank" rel="noopener"><img src={p} alt="" loading="lazy" /></a>)}</div>}
    </article>
  );
}

function Reviews({ r }: { r: Restaurant }) {
  const [state, setState] = useState<{ items: Review[] | null; error: string | null }>({ items: null, error: null });
  useEffect(() => {
    const ctl = new AbortController();
    fetch("/api/reviews?url=" + encodeURIComponent(r.url), { signal: ctl.signal })
      .then(async (res) => {
        const data = (await res.json()) as ReviewsResponse & { error?: string };
        if (data.error) throw new Error(data.error);
        setState({ items: data.items, error: null });
      })
      .catch((e: Error) => { if (e.name !== "AbortError") setState({ items: [], error: e.message }); });
    return () => ctl.abort();
  }, [r.url]);
  return (
    <section className="reviews">
      <div className="reviews-head">
        <h3>Reviews</h3>
        <a className="link" href={r.url + "dtlrvwlst/"} target="_blank" rel="noopener">All {r.reviews.toLocaleString()} on Tabelog<ArrowOut /></a>
      </div>
      {state.items === null && <div className="rvw-loading"><i /><i /><i /></div>}
      {state.error && <p className="sub">Couldn’t load reviews: {state.error}</p>}
      {state.items?.length === 0 && !state.error && <p className="sub">No reviews yet.</p>}
      {state.items?.map((v) => <ReviewItem key={v.id} v={v} />)}
    </section>
  );
}

// Remount with key={r.id} so the gallery index and scroll position reset per restaurant.
// `locked`: the user is on the free plan, so the heart and "add to list" open a Premium prompt instead.
export function DetailPanel({ r, lists, locked = false, billing = false, onToggleList, onCreateList, onClose }: {
  r: Restaurant; lists: SavedList[]; locked?: boolean; billing?: boolean; onToggleList: (l: SavedList) => void; onCreateList: (d: ListDraft) => void; onClose: () => void;
}) {
  const main = lists.find((l) => l.isMain);
  const liked = !!main?.items.some((x) => x.id === r.id);
  const inLists = lists.filter((l) => l.items.some((x) => x.id === r.id));
  const [picking, setPicking] = useState(false);
  const closePick = useCallback(() => setPicking(false), []);
  const [upsell, setUpsell] = useState(false);
  const closeUpsell = useCallback(() => setUpsell(false), []);
  const photos = r.photos?.length ? r.photos : r.image ? [bigPhoto(r.image)!] : [];
  const [i, setI] = useState(0);
  const show = (n: number) => setI((n + photos.length) % photos.length);
  const dinner = fmtPrice(r.dinner), lunch = fmtPrice(r.lunch);
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
        <button id="saveBtn" className={"gallery-btn" + (liked ? " on" : "")} style={liked && main ? { color: colorHex(main.color) } : undefined}
          aria-label={liked ? `Remove from ${main?.name ?? "Liked"}` : `Add to ${main?.name ?? "Liked"}`} aria-pressed={liked} title={locked ? "Like (Premium)" : liked ? "Liked" : "Like"}
          disabled={!locked && !main} onClick={(e) => { if (locked) { e.stopPropagation(); setUpsell((v) => !v); } else if (main) onToggleList(main); }}>
          <HeartIcon filled={liked} />
        </button>
        <button id="addBtn" className={"gallery-btn" + (inLists.length ? " on" : "")} aria-label="Add to a list" aria-expanded={locked ? upsell : picking} title={locked ? "Add to list (Premium)" : "Add to list"}
          onClick={(e) => { e.stopPropagation(); if (locked) setUpsell((v) => !v); else setPicking((v) => !v); }}>
          <ListPlusIcon />
          {inLists.length > 0 && <span className="tags">{inLists.slice(0, 4).map((l) => <i key={l.id} style={{ background: colorHex(l.color) }} />)}</span>}
        </button>
        <button id="closeDetail" className="gallery-btn" aria-label="Close" onClick={onClose}><XIcon /></button>
      </div>
      {picking && !locked && <AddToListMenu lists={lists} restaurantId={r.id} onToggle={onToggleList} onCreate={onCreateList} onClose={closePick} />}
      {upsell && locked && <UpgradePrompt feature="lists" id="detailUpsell" billing={billing} onClose={closeUpsell} />}
      <div id="facts">
        <h2>{r.name}</h2>
        <p className="p1"><span className="star">★ {r.rating ?? "–"}</span> · {r.reviews.toLocaleString()} reviews{r.distM != null ? ` · ${fmtDist(r.distM)} away` : ""}</p>
        <a className="btn" href={r.url} target="_blank" rel="noopener">Reserve<ArrowOut /></a>
        <FactLine icon={<ForkIcon />} main={r.genreFull || r.genre} />
        {(r.hours || r.closed) && (
          <div className="line">
            <ClockIcon />
            <div>
              {r.open != null && <p className="p2"><StatusDot open={r.open} /> now</p>}
              <Hours hours={r.hours} closed={r.closed} />
            </div>
          </div>
        )}
        <FactLine icon={<YenIcon />} main={[dinner && `${dinner} dinner`, lunch && `${lunch} lunch`].filter(Boolean).join(" · ")} />
        <FactLine icon={<PinIcon />} main={r.address} />
        <FactLine icon={<TrainIcon />} main={access} />
        {PAY.map(([k, label, Icon]) => {
          const on = !!(r.pay && r.pay[k]);
          return <div key={k} className={`pay k-${k}${on ? "" : " off"}`}><Icon /><p className="p2">{label}{on ? "" : " · not accepted"}</p></div>;
        })}
        <Reviews r={r} />
      </div>
    </section>
  );
}
