// Turning the agent's presentDraft call into a post. Client-safe: the dashboard previews with it and
// the queue runner saves with it, so both resolve photo slots the same way.
import type { BlogAgentMessage } from "./agent";
import type { Draft } from "./tools";

export type SlotPhoto = Draft["photos"][number];
export type Choice = Pick<SlotPhoto, "url" | "credit" | "license" | "page" | "source">;

export const credit = (p: Choice) => (p.source === "tabelog" ? "Photo: Tabelog" : `Photo: ${p.credit || "unknown"}${p.license ? `, ${p.license}` : ""}`);
const safeUrl = (u: string) => u.replace(/ /g, "%20").replace(/\(/g, "%28").replace(/\)/g, "%29");

/** The draft's markdown with photo:slot placeholders turned into images captioned with their credit. */
export function resolveDraft(d: Draft, over: Record<string, Choice>) {
  const photo = (slot: string) => { const base = d.photos.find((p) => p.slot === slot); return base ? { ...base, ...over[slot] } : null; };
  const content = d.content.replace(/!\[([^\]]*)\]\(photo:([\w-]+)(?:\s+"[^"]*")?\)/g, (_, alt: string, slot: string) => {
    const p = slot === d.coverSlot ? null : photo(slot); // the cover already sits above the post
    if (!p) return "";
    const caption = [p.caption, credit(p)].filter(Boolean).join(" · ").replace(/"/g, "'");
    return `![${(alt || p.alt).replace(/[[\]]/g, "")}](${safeUrl(p.url)} "${caption}")`;
  });
  return { content, cover: photo(d.coverSlot) };
}

export function latestDraft(messages: BlogAgentMessage[]): Draft | null {
  for (let i = messages.length - 1; i >= 0; i--)
    for (let j = messages[i].parts.length - 1; j >= 0; j--) {
      const p = messages[i].parts[j];
      if (p.type === "tool-presentDraft" && p.state === "output-available") return p.input as Draft;
    }
  return null;
}
