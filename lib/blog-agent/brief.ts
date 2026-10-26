// The brief form's options and the first message built from it. Client-safe: the dashboard imports this,
// while the system prompt itself stays server-only in prompt.ts.

export const POST_TYPES = {
  roundup: "Roundup: the best N places for a dish or in an area",
  deepdive: "Deep dive: one restaurant, in depth",
  neighborhood: "Neighborhood guide: where to eat in one area",
  dish: "Dish explainer: what it is, how to order, where to try it",
  itinerary: "Itinerary: a day or weekend of eating",
  comparison: "Comparison: X vs Y, or several places head to head",
  culture: "Culture / how-to: etiquette, Tabelog, reservations, payments",
} as const;

export type Brief = {
  idea: string;
  type?: keyof typeof POST_TYPES | "";
  city?: string;
  area?: string;
  cuisine?: string;
  count?: string;
  budget?: string;
  mustInclude?: string;
  keyword?: string;
  length?: string;
  notes?: string;
};

/** The first user message, built from the brief form. Only filled fields are included. */
export function briefMessage(b: Brief) {
  const lines = [
    `Write a blog post draft.`,
    ``,
    `Idea: ${b.idea.trim()}`,
    b.type && `Post type: ${POST_TYPES[b.type]}`,
    b.city && `City: ${b.city}`,
    b.area?.trim() && `Area / neighborhood: ${b.area.trim()}`,
    b.cuisine?.trim() && `Cuisine / dish: ${b.cuisine.trim()}`,
    b.count?.trim() && `Number of restaurants: ${b.count.trim()}`,
    b.budget?.trim() && `Budget: ${b.budget.trim()}`,
    b.mustInclude?.trim() && `Must include: ${b.mustInclude.trim()}`,
    b.keyword?.trim() && `Focus keyword: ${b.keyword.trim()}`,
    b.length && `Length: ${b.length}`,
    b.notes?.trim() && `\nMy own notes and experiences (use these, in first person, as mine):\n${b.notes.trim()}`,
  ];
  return lines.filter((l): l is string => typeof l === "string" && l !== "").join("\n");
}

/** The first message for a queued one-line prompt. Nobody is watching, so the agent decides everything itself. */
export function queueMessage(prompt: string) {
  return `${briefMessage({ idea: prompt, length: "Standard, about 1,500 words" })}

This runs unattended from the publishing queue: nobody can answer questions or review the research, so make every choice yourself, check our published posts so you don't repeat one, and finish by calling presentDraft.`;
}
