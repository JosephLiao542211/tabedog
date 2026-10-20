// Turns Tabelog's business-hours text into a structured schedule, e.g.
//   "Mon, Tue, Wed, Thu, Fri, Sat 11:00 AM - 3:00 PM L.O. Food 2:30 PM 6:00 PM - 10:00 PM L.O. Food 9:00 PM Sun Closed
//    ■Business hours[Lunch] Last entry by 14:30 … ■Closed onNot fixed"
// into rows (days → time slots with last-order times, or Closed) plus labelled free-text notes.
// Pure and client-safe: used by the detail panel for display and by the server for "open now".

export type DayKey = 0 | 1 | 2 | 3 | 4 | 5 | 6 | "hol" | "pre" | "post"; // 0 = Sunday; hol = public holiday, pre/post = day before/after
export type LastOrder = { all?: number; food?: number; drinks?: number }; // minutes from midnight, may exceed 1440 (past midnight)
export type Slot = { start: number; end: number; lastOrder?: LastOrder };
export type Row = { days: DayKey[] | null; closed: boolean; slots: Slot[] }; // days null = every day (older dayless format)
export type Note = { label: string; text: string };
export type Schedule = { rows: Row[]; notes: Note[] };

const DAY_WORD = String.raw`(?:mon(?:day)?|tue(?:s(?:day)?)?|wed(?:nesday)?|thu(?:rs(?:day)?)?|fri(?:day)?|sat(?:urday)?|sun(?:day)?)s?\b`;
const SPECIAL_DAY = String.raw`day before (?:a )?(?:public )?holidays?|day after (?:a )?(?:public )?holidays?|(?:public )?holidays?`;
const DAY_TOKEN = `(?:${SPECIAL_DAY}|${DAY_WORD})`;
const DAY_LIST = new RegExp(`^${DAY_TOKEN}(?:\\s*(?:,|&|and|[-–~])\\s*${DAY_TOKEN})*`, "i");
const TIME = String.raw`(\d{1,2}):(\d{2})\s*(am|pm|a\.m\.|p\.m\.)?`;
const SLOT = new RegExp(`^(?:(open 24 hours)|${TIME}\\s*[-–~〜]\\s*${TIME})`, "i");
const LO_HEAD = /^\s*\(?\s*(?:l\.?\s*o\.?|last orders?)\s*:?\s*/i;
const LO_ITEM = new RegExp(`^\\s*(?:(food|drinks?|drink)\\s*:?\\s*)?${TIME}\\s*,?`, "i");
const NOTE_LABEL = /^\s*(business hours|closed on|regular holidays?|holidays?|notice|remarks?)\s*:?\s*/i;
const DAY_INDEX: Record<string, DayKey> = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };
const ORDER: DayKey[] = [1, 2, 3, 4, 5, 6, 0]; // Monday first
const SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const toMin = (h: string, m: string, ap?: string) => {
  let hh = +h;
  if (ap) { const pm = ap.toLowerCase().startsWith("p"); hh = (hh % 12) + (pm ? 12 : 0); }
  return hh * 60 + +m;
};
function dayKey(word: string): DayKey | null {
  const w = word.toLowerCase();
  if (w.startsWith("day before")) return "pre";
  if (w.startsWith("day after")) return "post";
  if (w.includes("holiday")) return "hol";
  return DAY_INDEX[w.slice(0, 3)] ?? null;
}

function parseDayList(s: string): { days: DayKey[]; length: number } | null {
  const m = s.match(DAY_LIST);
  if (!m) return null;
  const days: DayKey[] = [];
  for (const part of m[0].split(/\s*(?:,|&|\band\b)\s*/i)) {
    const range = part.split(/\s*[-–~]\s*/);
    const a = dayKey(range[0]), b = range[1] ? dayKey(range[1]) : null;
    if (a == null) continue;
    if (typeof a === "number" && typeof b === "number") { // "Mon - Sat"
      let i = ORDER.indexOf(a);
      for (;;) { days.push(ORDER[i]); if (ORDER[i] === b) break; i = (i + 1) % 7; if (i === ORDER.indexOf(a)) break; }
    } else { days.push(a); if (b != null) days.push(b); }
  }
  return days.length ? { days: [...new Set(days)], length: m[0].length } : null;
}

function parseSlots(s: string): { slots: Slot[]; length: number } {
  const slots: Slot[] = [];
  let i = 0;
  for (;;) {
    const rest = s.slice(i).replace(/^\s+/, "");
    const m = rest.match(SLOT);
    if (!m) break;
    i = s.length - rest.length + m[0].length;
    const slot: Slot = m[1] ? { start: 0, end: 1440 } : { start: toMin(m[2], m[3], m[4]), end: toMin(m[5], m[6], m[7]) };
    if (slot.end <= slot.start) slot.end += 1440;
    const lo = s.slice(i).match(LO_HEAD);
    if (lo) {
      let j = i + lo[0].length;
      const last: LastOrder = {};
      for (let n = 0; n < 3; n++) {
        const it = s.slice(j).match(LO_ITEM);
        if (!it) break;
        const key: keyof LastOrder = !it[1] ? "all" : it[1].toLowerCase().startsWith("f") ? "food" : "drinks";
        // a bare time that starts a range ("L.O. 3:00 PM 5:00 PM - 10:00 PM") belongs to the next slot
        if (last[key] != null || (key === "all" && /^\s*[-–~〜]\s*\d/.test(s.slice(j + it[0].length)))) break;
        j += it[0].length;
        last[key] = toMin(it[2], it[3], it[4]);
      }
      if (Object.keys(last).length) {
        for (const k of Object.keys(last) as (keyof LastOrder)[]) if (last[k]! < slot.start && slot.end > 1440) last[k]! += 1440; // "L.O. 1:00 AM" after midnight
        slot.lastOrder = last;
        i = j + (s.slice(j).match(/^\s*\)/)?.[0].length ?? 0);
      }
    }
    slots.push(slot);
  }
  return { slots, length: i };
}

function parseRows(s: string, allowDayless = false): { rows: Row[]; rest: string } {
  const rows: Row[] = [];
  let i = 0;
  for (;;) {
    const lead = s.slice(i).match(/^[\s,.;:·]*/)![0].length;
    let j = i + lead;
    const d = parseDayList(s.slice(j));
    if (!d && !allowDayless) break;
    if (d) j += d.length;
    const afterDays = s.slice(j).match(/^\s*:?\s*/)![0].length;
    j += afterDays;
    let row: Row | null = null;
    if (d && /^closed\b/i.test(s.slice(j))) { row = { days: d.days, closed: true, slots: [] }; j += "closed".length; }
    else {
      const { slots, length } = parseSlots(s.slice(j));
      if (slots.length) { row = { days: d ? d.days : null, closed: false, slots }; j += length; }
    }
    if (!row) break;
    rows.push(row);
    i = j;
  }
  return { rows, rest: s.slice(i) };
}

/** Free text: strip bullets, put a space after sentence punctuation that runs into the next word. */
export function tidyNote(t: string): string {
  return t.replace(/[◆※■]/g, " ").replace(/([.!?)])(?=[A-Z(])/g, "$1 ").replace(/([a-z])(?=[A-Z])/g, "$1 ").replace(/\s+/g, " ").replace(/^[\s·,.;:*]+/, "").trim();
}
function labelCase(l: string) { const s = l.toLowerCase(); return s[0].toUpperCase() + s.slice(1); }

export function parseSchedule(raw: string | null | undefined): Schedule {
  const text = String(raw || "").replace(/\s+/g, " ").trim();
  const rows: Row[] = [], notes: Note[] = [];
  const chunks = text.split("■");
  const first = parseRows(chunks[0]);
  rows.push(...first.rows);
  if (tidyNote(first.rest)) notes.push({ label: "", text: tidyNote(first.rest) });
  for (const chunk of chunks.slice(1)) {
    const m = chunk.match(NOTE_LABEL);
    const label = m ? labelCase(m[1]) : "";
    let body = chunk.slice(m ? m[0].length : 0);
    if (label === "Business hours" && !rows.length) { // older format: "[Mon - Sat]11:00 - 15:0017:30 - 20:30" or just "19:00 - 3:00"
      const parsed = parseRows(body.replace(/[[\]]/g, " "), true);
      rows.push(...parsed.rows);
      body = parsed.rest;
    }
    const t = tidyNote(body);
    if (t) notes.push({ label, text: t });
  }
  return { rows: mergeRows(rows), notes };
}

/** Tabelog sometimes lists the same hours twice ("Wed, Fri …" then "Thu …"); fold those into one row. */
function mergeRows(rows: Row[]): Row[] {
  // "L.O. 2:30 PM" and "L.O. Food 2:30 PM" mean the same thing when there is no separate drinks time
  const canon = (lo?: LastOrder) => lo && (lo.drinks == null ? { all: lo.all ?? lo.food } : lo);
  const sig = (r: Row) => (r.closed ? "closed" : JSON.stringify(r.slots.map((x) => [x.start, x.end, canon(x.lastOrder)])));
  const out: Row[] = [];
  for (const r of rows) {
    const same = r.days && out.find((o) => o.days && sig(o) === sig(r));
    if (same) same.days = [...new Set([...same.days!, ...r.days!])]; else out.push({ ...r, days: r.days ? [...r.days] : null });
  }
  return out;
}

// ---------- display ----------
export function fmtTime(min: number): string {
  const m = ((min % 1440) + 1440) % 1440, h = Math.floor(m / 60), mm = String(m % 60).padStart(2, "0");
  return `${h % 12 || 12}:${mm} ${h < 12 ? "AM" : "PM"}`;
}

export function dayLabel(days: DayKey[] | null): string {
  if (!days) return "Every day";
  const wk = ORDER.filter((d) => days.includes(d));
  const parts: string[] = [];
  if (wk.length === 7) parts.push("Every day");
  else {
    let run: DayKey[] = [];
    const flush = () => {
      if (!run.length) return;
      parts.push(run.length >= 3 ? `${SHORT[run[0] as number]}–${SHORT[run[run.length - 1] as number]}` : run.map((d) => SHORT[d as number]).join(", "));
      run = [];
    };
    for (const d of ORDER) { if (days.includes(d)) run.push(d); else flush(); }
    flush();
  }
  if (days.includes("hol")) parts.push("Public holidays");
  if (days.includes("pre")) parts.push("Day before holidays");
  if (days.includes("post")) parts.push("Day after holidays");
  return parts.join(", ");
}

export function slotLabel(s: Slot): { time: string; lastOrder: string } {
  const time = s.start === 0 && s.end === 1440 ? "Open 24 hours" : `${fmtTime(s.start)} – ${fmtTime(s.end)}`;
  const lo = s.lastOrder;
  let lastOrder = "";
  if (lo) {
    const only = lo.all ?? (lo.food != null && lo.drinks == null ? lo.food : lo.drinks != null && lo.food == null ? lo.drinks : undefined);
    lastOrder = only != null ? `Last order ${fmtTime(only)}` : `Last order food ${fmtTime(lo.food!)} · drinks ${fmtTime(lo.drinks!)}`;
  }
  return { time, lastOrder };
}

/** One line per row, for logs, tests and screen readers. */
export function formatSchedule(sch: Schedule): string[] {
  const lines = sch.rows.map((r) => `${dayLabel(r.days)}: ${r.closed ? "Closed" : r.slots.map((s) => { const { time, lastOrder } = slotLabel(s); return lastOrder ? `${time} (${lastOrder})` : time; }).join("; ")}`);
  for (const n of sch.notes) lines.push(n.label ? `${n.label}: ${n.text}` : n.text);
  return lines;
}
