"use client";

// A draggable bottom sheet for narrow screens. The sheet's height is a CSS variable on <html> so the
// sheet, the dock above it and anything else that stacks on it can all follow one number without
// re-rendering React on every pointer move. Three stops: peek (just the header), half, full.
import { useCallback, useEffect, useRef, useState, type RefObject } from "react";

export type SheetStop = "peek" | "half" | "full";
export type SheetStops = Record<SheetStop, number>;

const ORDER: SheetStop[] = ["peek", "half", "full"];
const SLOP = 6; // px of movement before a touch on the header counts as a drag rather than a tap
const DISMISS = 70; // px below "peek" that dismisses a sheet that can be dismissed

export function useMobile(query = "(max-width: 800px)") {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const sync = () => setOn(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, [query]);
  return on;
}

/** The tallest a sheet can go: leaves room for the search bar (and the notch) above it. */
export function fullHeight() {
  const sat = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--sat")) || 0;
  return window.innerHeight - 84 - sat;
}

/** Read a sheet's current height in px (0 when that sheet isn't mounted). */
export function sheetPx(cssVar: string) {
  const v = parseFloat(document.documentElement.style.getPropertyValue(cssVar));
  return Number.isFinite(v) ? v : 0;
}

export function useSheet({ active, cssVar, stops, initial = "half", handle, body, onDismiss }: {
  active: boolean; // false on wide screens: the hook does nothing and clears its variable
  cssVar: string; // e.g. "--sheet"
  stops: () => SheetStops; // measured when needed, so rotation and the dynamic toolbar are fine
  initial?: SheetStop;
  handle: RefObject<HTMLElement | null>; // the header: drag anywhere on it
  body?: RefObject<HTMLElement | null>; // the scrolling content: drags the sheet until it's full, scrolls after
  onDismiss?: () => void; // pulled well below "peek": close the sheet
}) {
  const [stop, setStopState] = useState<SheetStop>(initial);
  const [dragging, setDragging] = useState(false);
  const S = useRef({ h: 0, stop: initial, on: false, y0: 0, h0: 0, lastY: 0, lastT: 0, v: 0, moved: false, endedAt: 0 }).current;
  const stopsRef = useRef(stops); stopsRef.current = stops;
  const dismissRef = useRef(onDismiss); dismissRef.current = onDismiss;
  const root = () => document.documentElement;

  const apply = useCallback((h: number) => { S.h = h; root().style.setProperty(cssVar, `${Math.round(h)}px`); }, [S, cssVar]);
  const snapTo = useCallback((s: SheetStop) => {
    S.stop = s; setStopState(s);
    root().classList.remove("sheet-drag");
    apply(stopsRef.current()[s]);
  }, [S, apply]);

  // mount / unmount / resize: keep the variable in step with the current stop
  useEffect(() => {
    if (!active) { root().style.removeProperty(cssVar); return; }
    snapTo(S.stop);
    const onResize = () => { if (!S.on) apply(stopsRef.current()[S.stop]); };
    window.addEventListener("resize", onResize);
    return () => { window.removeEventListener("resize", onResize); root().style.removeProperty(cssVar); root().classList.remove("sheet-drag"); };
  }, [active, cssVar, snapTo, apply, S]);

  // ---- the drag itself, shared by the header (pointer events) and the body (touch events) ----
  const begin = useCallback((y: number) => {
    S.on = true; S.moved = false; S.y0 = y; S.h0 = S.h; S.lastY = y; S.lastT = performance.now(); S.v = 0;
    root().classList.add("sheet-drag"); setDragging(true);
  }, [S]);
  const move = useCallback((y: number) => {
    const { full, peek } = stopsRef.current();
    const raw = S.h0 + (S.y0 - y);
    const min = dismissRef.current ? peek - DISMISS - 20 : peek;
    // rubber-band past the ends instead of stopping dead
    const h = raw > full ? full + (raw - full) * 0.25 : raw < min ? min - (min - raw) * 0.25 : raw;
    const t = performance.now();
    if (t > S.lastT) S.v = (S.lastY - y) / (t - S.lastT); // px per ms, positive = upwards
    S.lastY = y; S.lastT = t; S.moved = true;
    apply(Math.max(0, h));
  }, [S, apply]);
  const end = useCallback(() => {
    if (!S.on) return;
    S.on = false; setDragging(false);
    const st = stopsRef.current();
    if (dismissRef.current && S.h < st.peek - DISMISS && S.v <= 0.05) { root().classList.remove("sheet-drag"); dismissRef.current(); return; }
    // fling: a quick swipe moves one stop in that direction; otherwise settle on the nearest stop
    let target: SheetStop;
    if (Math.abs(S.v) > 0.5) {
      const i = ORDER.indexOf(S.stop), dir = S.v > 0 ? 1 : -1;
      const projected = S.h + S.v * 120;
      const nearest = ORDER.reduce((a, b) => (Math.abs(st[b] - projected) < Math.abs(st[a] - projected) ? b : a));
      const ni = ORDER.indexOf(nearest);
      target = dir > 0 ? ORDER[Math.max(i + 1, ni)] ?? "full" : ORDER[Math.min(i - 1, ni)] ?? "peek";
      if (dir < 0 && dismissRef.current && S.stop === "peek" && S.v < -0.8) { root().classList.remove("sheet-drag"); dismissRef.current(); return; }
    } else {
      target = ORDER.reduce((a, b) => (Math.abs(st[b] - S.h) < Math.abs(st[a] - S.h) ? b : a));
    }
    snapTo(target);
  }, [S, snapTo]);

  // header: pointer events, with a small slop so taps on the buttons inside it still click
  useEffect(() => {
    const el = handle.current; if (!el || !active) return;
    let armed = false, id = -1, y0 = 0;
    const down = (e: PointerEvent) => { if (e.button !== 0) return; armed = true; id = e.pointerId; y0 = e.clientY; };
    const mv = (e: PointerEvent) => {
      if (!armed || e.pointerId !== id) return;
      if (!S.on) { if (Math.abs(e.clientY - y0) < SLOP) return; begin(y0); el.setPointerCapture(id); }
      e.preventDefault(); move(e.clientY);
    };
    const up = (e: PointerEvent) => {
      if (!armed || e.pointerId !== id) return;
      armed = false;
      if (S.on) { S.endedAt = performance.now(); if (el.hasPointerCapture(id)) el.releasePointerCapture(id); end(); }
    };
    // the click that can follow a drag would land on whatever was under the finger: eat it
    const click = (e: MouseEvent) => { if (performance.now() - S.endedAt < 350) { S.endedAt = 0; e.stopPropagation(); e.preventDefault(); } };
    el.addEventListener("pointerdown", down); el.addEventListener("pointermove", mv);
    el.addEventListener("pointerup", up); el.addEventListener("pointercancel", up);
    el.addEventListener("click", click, true);
    return () => {
      el.removeEventListener("pointerdown", down); el.removeEventListener("pointermove", mv);
      el.removeEventListener("pointerup", up); el.removeEventListener("pointercancel", up);
      el.removeEventListener("click", click, true);
    };
  }, [active, handle, S, begin, move, end]);

  // body: a swipe up grows the sheet until it's full, then scrolls; a swipe down at the top of the list shrinks it
  useEffect(() => {
    const el = body?.current; if (!el || !active) return;
    let y0 = 0, taking = false, decided = false;
    const ts = (e: TouchEvent) => { if (e.touches.length !== 1) return; y0 = e.touches[0].clientY; taking = false; decided = false; };
    const tm = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      const y = e.touches[0].clientY;
      if (!decided) {
        const dy = y - y0; if (Math.abs(dy) < SLOP) return;
        decided = true;
        const canGrow = S.h < stopsRef.current().full - 1;
        taking = (dy > 0 && el.scrollTop <= 0) || (dy < 0 && canGrow);
        if (taking) begin(y0);
      }
      if (taking) { e.preventDefault(); move(y); }
    };
    const te = () => { if (taking) end(); taking = false; decided = false; };
    el.addEventListener("touchstart", ts, { passive: true });
    el.addEventListener("touchmove", tm, { passive: false });
    el.addEventListener("touchend", te); el.addEventListener("touchcancel", te);
    return () => {
      el.removeEventListener("touchstart", ts); el.removeEventListener("touchmove", tm);
      el.removeEventListener("touchend", te); el.removeEventListener("touchcancel", te);
    };
  }, [active, body, S, begin, move, end]);

  return { stop, dragging, snapTo };
}
