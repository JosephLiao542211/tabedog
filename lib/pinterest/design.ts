// What a pin is made of: the text Pinterest shows (title, description, alt text) and the design the
// image renders from. Client-safe: the dashboard edits these and the server renders and posts them.

export const PIN_SIZE = { width: 1000, height: 1500 } as const; // Pinterest's recommended 2:3

export const TEMPLATES = {
  "photo-top": "Photo on top, headline below",
  overlay: "Full-bleed photo, headline over it",
  list: "Photo, headline and a numbered list",
  type: "Type only, no photo",
} as const;
export type Template = keyof typeof TEMPLATES;

export const ACCENTS = ["#ff6347", "#2f7de1", "#2e9e6b", "#8a5cd6", "#e08a1e", "#d6457a", "#1f8a99"] as const;

export type PinDesign = {
  template: Template;
  kicker: string;      // small caps line above the headline, e.g. "TOKYO FOOD GUIDE"
  headline: string;    // the big text
  subhead: string;     // one supporting line; may be empty
  items: string[];     // the list template's entries (restaurant names, dishes), up to 5
  photo: string | null; // one of the post's photos, or null for type-only
  credit: string;      // photo credit printed small on the image
  accent: string;
};

export type PinStatus = "draft" | "queued" | "posting" | "posted" | "failed";

export type Pin = {
  id: string; post_id: string; status: PinStatus; source: "manual" | "autopilot";
  board_id: string | null; board_name: string; title: string; description: string; alt_text: string; link: string;
  design: PinDesign; position: number; attempts: number; error: string | null; pinterest_id: string | null;
  posted_at: string | null; created_at: string; updated_at: string;
};

export type PinterestSettings = {
  enabled: boolean; pins_per_day: number; autopilot: boolean; auto_approve: boolean;
  default_board_id: string | null; default_board_name: string; model: string;
  last_post_at: string | null; last_generate_at: string | null;
};

export type Board = { id: string; name: string };

/** Pinterest's field limits. */
export const LIMITS = { title: 100, description: 500, alt: 500 } as const;

export const pinUrl = (id: string) => `https://www.pinterest.com/pin/${id}/`;

/** A photo found in a post: the cover, then inline images, with the credit from their caption. */
export type PostPhoto = { url: string; alt: string; credit: string };

/** Photos in a post usable on a pin. Tabelog photos are skipped: those belong to its users, and a pin republishes them. */
export function postPhotos(post: { cover_url: string | null; cover_alt: string; content: string }): PostPhoto[] {
  const out: PostPhoto[] = [];
  const add = (url: string, alt: string, caption: string) => {
    const credit = caption.match(/Photo: [^·]+/)?.[0].trim() ?? "";
    if (!/^https:\/\//.test(url) || /Photo: Tabelog/i.test(caption) || /tabelog\.com|tblg\.k-img\.com/.test(url)) return;
    const seen = out.find((p) => p.url === url);
    if (!seen) out.push({ url, alt, credit });
    else if (!seen.credit) seen.credit = credit; // the cover's credit, when it's repeated inline
  };
  if (post.cover_url) add(post.cover_url, post.cover_alt, "");
  for (const m of post.content.matchAll(/!\[([^\]]*)\]\((\S+?)(?:\s+"([^"]*)")?\)/g)) add(m[2], m[1], m[3] ?? "");
  return out;
}

/** The pin's destination: the post, tagged so analytics can tell Pinterest traffic apart. */
export const pinLink = (siteUrl: string, slug: string) =>
  `${siteUrl}/blog/${slug}?utm_source=pinterest&utm_medium=social&utm_campaign=pins`;
