// The AI step: reads a published guide and writes several distinct pins for it, each with Pinterest
// copy (title, description, alt text) and an image design. One structured-output call, no tools: the
// facts all come from the post itself, which was already researched and reviewed.
import "server-only";
import { anthropic } from "@ai-sdk/anthropic";
import { generateText, Output } from "ai";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { AGENT_MODELS, type AgentModel } from "../blog-agent/agent";
import { headings, plainText, topicName, type Post } from "../blog";
import { SITE } from "../seo";
import { ACCENTS, LIMITS, TEMPLATES, pinLink, postPhotos, type Board, type PinDesign, type Template } from "./design";

const clip = (s: string, n: number) => (s.length <= n ? s : `${s.slice(0, n - 1).trimEnd()}…`);

const variantSchema = z.object({
  angle: z.string().describe("The hook this pin uses, in a few words, e.g. 'budget', 'top 5 list', 'late night'"),
  title: z.string().describe(`Pin title, max ${LIMITS.title} chars, the search phrase people type on Pinterest first`),
  description: z.string().describe(`Pin description, 250-${LIMITS.description} chars: what the guide gives them, with the key search phrases worked in naturally, ending with a reason to tap through. No hashtags, no emoji.`),
  altText: z.string().describe("What the pin image shows, for screen readers, max 300 chars"),
  template: z.enum(Object.keys(TEMPLATES) as [Template, ...Template[]]),
  kicker: z.string().describe("Small uppercase line over the headline, max 26 chars, e.g. 'Tokyo food guide'"),
  headline: z.string().describe("The big text on the image, max 48 chars. Concrete and specific: a number, a place, a dish."),
  subhead: z.string().describe("One supporting line on the image, max 64 chars, or empty"),
  items: z.array(z.string()).max(5).describe("For the list template: 3-5 short entries (restaurant or dish names from the post), each max 28 chars. Empty otherwise."),
  photoIndex: z.number().int().describe("Index into the photos list, or -1 for none (type template)"),
  boardId: z.string().describe("The board id that fits best, or empty to use the default"),
});

const outputSchema = z.object({ pins: z.array(variantSchema) });

function instructions() {
  return `You make Pinterest pins for the ${SITE.name} blog: English guides to eating in Japan, built on Tabelog ratings.

Pinterest is a visual search engine. People search phrases like "tokyo ramen guide", "where to eat in kyoto", "japan food bucket list" and save pins to plan trips. A pin wins when:
- the image text is short, big and specific (a number, a place, a dish), readable at phone-thumbnail size
- the title leads with the phrase people actually search
- the description reads like a helpful human wrote it, keyword-rich but natural, no hashtags, no emoji, no clickbait
- the promise matches what the guide delivers

Rules:
- Every fact (names, numbers, prices, places) must come from the post. Never invent restaurants, scores or prices.
- Each pin takes a genuinely different angle (e.g. the list, the budget, one standout spot, the neighborhood, a how-to), and different templates and photos when there are enough.
- Don't repeat a headline or title already used for this post (listed below if any).
- Templates: ${Object.entries(TEMPLATES).map(([k, v]) => `${k} (${v})`).join("; ")}. "list" needs items. Use "type" when there's no fitting photo.
- Pick photos by what they show (their alt text); only use indexes from the list.
- Write in plain American English.`;
}

export type GeneratedPin = { title: string; description: string; alt_text: string; board_id: string | null; board_name: string; link: string; design: PinDesign };

type PostForPins = Pick<Post, "id" | "slug" | "title" | "excerpt" | "content" | "topic" | "tags" | "focus_keyword" | "cover_url" | "cover_alt">;

export async function generatePins(
  post: PostForPins,
  { count = 3, model, boards = [], defaultBoardId = null, previous = [], notes = "" }:
  { count?: number; model: string; boards?: Board[]; defaultBoardId?: string | null; previous?: { title: string; headline: string }[]; notes?: string },
): Promise<GeneratedPin[]> {
  const photos = postPhotos(post).slice(0, 12);
  const toc = headings(post.content).map((h) => `${"  ".repeat(Math.max(0, h.depth - 2))}- ${h.text}`).join("\n");
  const prompt = [
    `Make ${count} pins for this post.`,
    ``,
    `Title: ${post.title}`,
    `Summary: ${post.excerpt}`,
    `Topic: ${topicName(post.topic)}`,
    post.focus_keyword && `Focus keyword: ${post.focus_keyword}`,
    post.tags.length && `Tags: ${post.tags.join(", ")}`,
    ``,
    `Outline:\n${toc || "(none)"}`,
    ``,
    `Photos:\n${photos.length ? photos.map((p, i) => `${i}. ${p.alt || "(no description)"}`).join("\n") : "(none: use the type template)"}`,
    ``,
    boards.length ? `Boards:\n${boards.map((b) => `${b.id}: ${b.name}`).join("\n")}` : `Boards: (leave boardId empty)`,
    previous.length && `\nAlready pinned for this post (don't repeat):\n${previous.map((p) => `- ${p.title} / ${p.headline}`).join("\n")}`,
    notes.trim() && `\nEditor's notes: ${notes.trim()}`,
    ``,
    `Post body:\n${clip(plainText(post.content), 12000)}`,
  ].filter((l): l is string => typeof l === "string").join("\n");

  const { output } = await generateText({
    model: anthropic((model in AGENT_MODELS ? model : "claude-sonnet-5-5") as AgentModel),
    system: instructions(),
    prompt,
    output: Output.object({ schema: outputSchema }),
    maxOutputTokens: 8000,
  });

  const link = pinLink(SITE.url, post.slug);
  return output.pins.slice(0, count).map((v, i) => {
    const photo = photos[v.photoIndex] ?? null;
    const template: Template = !photo ? "type" : v.template === "list" && !v.items.length ? "photo-top" : v.template;
    const board = boards.find((b) => b.id === v.boardId) ?? boards.find((b) => b.id === defaultBoardId) ?? null;
    return {
      title: clip(v.title.trim(), LIMITS.title),
      description: clip(v.description.trim(), LIMITS.description),
      alt_text: clip(v.altText.trim(), LIMITS.alt),
      board_id: board?.id ?? null,
      board_name: board?.name ?? "",
      link,
      design: {
        template, kicker: clip(v.kicker.trim(), 32), headline: clip(v.headline.trim(), 70), subhead: clip(v.subhead.trim(), 90),
        items: v.items.map((s) => clip(s.trim(), 34)).filter(Boolean).slice(0, 5),
        photo: template === "type" ? null : photo!.url, credit: template === "type" ? "" : clip(photo!.credit, 70),
        accent: ACCENTS[(i + post.slug.length) % ACCENTS.length],
      },
    };
  });
}

/** Generates pins for a post and saves them: as drafts, or straight into the queue. Returns the new ids. */
export async function generateAndSave(
  admin: SupabaseClient,
  postId: string,
  opts: { count: number; model: string; boards: Board[]; defaultBoardId: string | null; notes?: string; queue?: boolean; source?: "manual" | "autopilot" },
) {
  const { data: post, error } = await admin.from("posts").select("id, slug, title, excerpt, content, topic, tags, focus_keyword, cover_url, cover_alt, status").eq("id", postId).single();
  if (error || !post) throw new Error(error?.message ?? "Post not found");
  if (post.status !== "published") throw new Error("Publish the post first: pins link to it.");
  const { data: prev } = await admin.from("pins").select("title, design").eq("post_id", postId);
  const pins = await generatePins(post as PostForPins, {
    ...opts, previous: (prev ?? []).map((p) => ({ title: p.title, headline: (p.design as PinDesign).headline ?? "" })),
  });
  const { data: last } = await admin.from("pins").select("position").order("position", { ascending: false }).limit(1).maybeSingle();
  const start = (last?.position ?? 0) + 1;
  const res = await admin.from("pins").insert(pins.map((p, i) => ({
    ...p, post_id: postId, position: start + i, status: opts.queue ? "queued" : "draft", source: opts.source ?? "manual",
  }))).select("id");
  if (res.error) throw new Error(res.error.message);
  return res.data.map((r) => r.id as string);
}
