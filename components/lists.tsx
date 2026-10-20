"use client";

// Playlist UI: the lists popover by the search bar, the inline list editor, and the "add to list" menu in the detail panel.
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { colorHex, LIST_COLORS, MAX_NAME, nextColor, type ListColor, type SavedList } from "@/lib/lists";
import { CheckIcon, HeartIcon, PencilIcon, PlusIcon, TrashIcon } from "./icons";

export type ListDraft = { name: string; color: ListColor };

const plural = (n: number) => `${n} ${n === 1 ? "place" : "places"}`;

export function ColorGrid({ value, onChange }: { value: ListColor; onChange: (c: ListColor) => void }) {
  return (
    <div className="colors" role="radiogroup" aria-label="List colour">
      {LIST_COLORS.map((c) => (
        <button key={c.key} type="button" role="radio" aria-checked={value === c.key} aria-label={c.label} title={c.label}
          className={"swatch" + (value === c.key ? " on" : "")} style={{ "--c": c.hex } as React.CSSProperties} onClick={() => onChange(c.key)}>
          {value === c.key && <CheckIcon size={12} />}
        </button>
      ))}
    </div>
  );
}

/** Name + colour form used for both new lists and edits. Enter saves, Escape cancels. */
export function ListEditor({ initial, canDelete, saveLabel = "Save", onSave, onDelete, onCancel }: {
  initial: ListDraft; canDelete?: boolean; saveLabel?: string;
  onSave: (d: ListDraft) => void; onDelete?: () => void; onCancel: () => void;
}) {
  const [name, setName] = useState(initial.name);
  const [color, setColor] = useState<ListColor>(initial.color);
  const [confirm, setConfirm] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => { input.current?.focus(); input.current?.select(); }, []);
  const ok = name.trim().length > 0;
  const save = () => { if (ok) onSave({ name: name.trim(), color }); };
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") { e.preventDefault(); save(); }
    if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); onCancel(); }
  };
  return (
    <div className="ledit" onClick={(e) => e.stopPropagation()}>
      <div className="ledit-name">
        <i className="swatch-dot" style={{ background: colorHex(color) }} />
        <input ref={input} type="text" value={name} maxLength={MAX_NAME} placeholder="List name" aria-label="List name"
          onChange={(e) => setName(e.target.value)} onKeyDown={onKey} />
      </div>
      <ColorGrid value={color} onChange={setColor} />
      <div className="ledit-foot">
        {canDelete && onDelete ? (
          confirm
            ? <button type="button" className="link danger" onClick={onDelete}>Really delete?</button>
            : <button type="button" className="link danger" onClick={() => setConfirm(true)}><TrashIcon />Delete</button>
        ) : <span />}
        <span className="ledit-actions">
          <button type="button" className="chip" onClick={onCancel}>Cancel</button>
          <button type="button" className="chip on" disabled={!ok} onClick={save}>{saveLabel}</button>
        </span>
      </div>
    </div>
  );
}

/** The popover next to the search bar: open a list on the map and in the sidebar, rename / recolour / delete, make new ones. */
export function ListsPanel({ lists, viewing, onOpen, onCreate, onUpdate, onDelete }: {
  lists: SavedList[]; viewing: string | null; onOpen: (l: SavedList) => void;
  onCreate: (d: ListDraft) => void; onUpdate: (l: SavedList, d: ListDraft) => void; onDelete: (l: SavedList) => void;
}) {
  const [editing, setEditing] = useState<string | "new" | null>(null);
  return (
    <div id="listsPanel" className="float" role="dialog" aria-label="Your lists">
      <div className="lhead">
        <p className="h2">Your lists</p>
        {viewing && <span className="sub">showing on map</span>}
      </div>
      <div className="lrows">
        {lists.map((l) => editing === l.id ? (
          <ListEditor key={l.id} initial={{ name: l.name, color: l.color }} canDelete={!l.isMain}
            onSave={(d) => { onUpdate(l, d); setEditing(null); }} onDelete={() => { onDelete(l); setEditing(null); }} onCancel={() => setEditing(null)} />
        ) : (
          <div key={l.id} className={"lrow" + (viewing === l.id ? " viewing" : "")}>
            <button type="button" className="lname" aria-pressed={viewing === l.id} title={viewing === l.id ? "Back to search results" : `Show ${l.name} on the map`} onClick={() => onOpen(l)}>
              <i className="swatch-dot big" style={{ background: colorHex(l.color) }} />
              <span className="p1">{l.isMain && <HeartIcon size={12} filled />}{l.name}</span>
              <span className="sub">{plural(l.items.length)}</span>
            </button>
            <button type="button" className="lmore" aria-label={`Edit ${l.name}`} title="Edit" onClick={() => setEditing(l.id)}><PencilIcon /></button>
          </div>
        ))}
        {editing === "new" ? (
          <ListEditor initial={{ name: "", color: nextColor(lists) }} saveLabel="Create"
            onSave={(d) => { onCreate(d); setEditing(null); }} onCancel={() => setEditing(null)} />
        ) : (
          <button type="button" className="lnew" onClick={() => setEditing("new")}><span className="plus"><PlusIcon size={14} /></span><span className="p1">New list</span></button>
        )}
      </div>
    </div>
  );
}

/** Spotify-style "add to playlist": tick the lists this place belongs to, or make a new list containing it. */
export function AddToListMenu({ lists, restaurantId, onToggle, onCreate, onClose }: {
  lists: SavedList[]; restaurantId: string;
  onToggle: (l: SavedList) => void; onCreate: (d: ListDraft) => void; onClose: () => void;
}) {
  const [making, setMaking] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onDoc = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) onClose(); };
    const onKey = (e: globalThis.KeyboardEvent) => { if (e.key === "Escape") { e.stopPropagation(); onClose(); } };
    document.addEventListener("click", onDoc, true);
    document.addEventListener("keydown", onKey, true);
    return () => { document.removeEventListener("click", onDoc, true); document.removeEventListener("keydown", onKey, true); };
  }, [onClose]);
  return (
    <div id="addTo" className="float" ref={box} role="dialog" aria-label="Add to list">
      <p className="sub">Add to list</p>
      {lists.map((l) => {
        const on = l.items.some((r) => r.id === restaurantId);
        return (
          <button key={l.id} type="button" className={"lpick" + (on ? " on" : "")} role="menuitemcheckbox" aria-checked={on} onClick={() => onToggle(l)}>
            <i className="swatch-dot" style={{ background: colorHex(l.color) }} />
            <span className="p1">{l.name}</span>
            <span className="tick">{on && <CheckIcon size={14} />}</span>
          </button>
        );
      })}
      {making ? (
        <ListEditor initial={{ name: "", color: nextColor(lists) }} saveLabel="Create & add"
          onSave={(d) => { onCreate(d); setMaking(false); }} onCancel={() => setMaking(false)} />
      ) : (
        <button type="button" className="lnew" onClick={() => setMaking(true)}><span className="plus"><PlusIcon size={14} /></span><span className="p1">New list</span></button>
      )}
    </div>
  );
}
