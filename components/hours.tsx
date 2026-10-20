"use client";

import { useState } from "react";
import { dayLabel, parseSchedule, slotLabel, type DayKey } from "@/lib/hours";

/** Business hours as a day → times grid, today's row emphasised, with any free-text notes underneath. */
export function Hours({ hours, closed }: { hours: string; closed?: string }) {
  const [more, setMore] = useState(false);
  const sch = parseSchedule(hours);
  const today = new Date(Date.now() + 9 * 3600e3).getUTCDay() as DayKey; // JST
  const notes = [...sch.notes];
  // the listing's "closed" day is only worth repeating when the schedule has no Closed row of its own
  if (closed && !sch.rows.some((r) => r.closed) && !notes.some((n) => /closed/i.test(n.label))) notes.push({ label: "Closed on", text: closed });
  if (!sch.rows.length && !notes.length) return null;
  const long = notes.reduce((n, x) => n + x.text.length, 0) > 140;
  return (
    <div className="hours">
      {sch.rows.length > 0 && (
        <dl className="hours-grid">
          {sch.rows.map((r, i) => {
            const cls = r.days ? (r.days.includes(today) ? "today" : "") : "today";
            return [
              <dt key={`d${i}`} className={cls}>{dayLabel(r.days)}</dt>,
              <dd key={`t${i}`} className={cls}>
                {r.closed ? <span className="hours-closed">Closed</span> : r.slots.map((s, k) => {
                  const { time, lastOrder } = slotLabel(s);
                  return (
                    <div key={k} className="hours-slot">
                      <span className="hours-time">{time}</span>
                      {lastOrder && <span className="hours-lo">{lastOrder}</span>}
                    </div>
                  );
                })}
              </dd>,
            ];
          })}
        </dl>
      )}
      {notes.length > 0 && (
        <div className={"hours-notes" + (long && !more ? " clamp" : "")}>
          {notes.map((n, i) => <p key={i} className="sub">{n.label && <b>{n.label} · </b>}{n.text}</p>)}
          {long && <button type="button" className="link sub" onClick={() => setMore((v) => !v)}>{more ? "Less" : "More"}</button>}
        </div>
      )}
    </div>
  );
}
