// Drafting runs: GET lists them, POST starts one. The agent runs on in the background (after()), so the
// response comes straight back and the dashboard polls. Admins only; everyone else gets a 404.
import { after } from "next/server";
import { blogAdmin } from "@/lib/blog-server";
import { RUN_LIST_COLUMNS, createRun, executeRun, pickModel, reapStale } from "@/lib/blog-agent/runs";

export const maxDuration = 300; // = MAX_DURATION in lib/blog-agent/runs.ts; the background run gets the same budget

export async function GET() {
  const auth = await blogAdmin();
  if (!auth) return new Response("Not found", { status: 404 });
  await reapStale(auth.admin);
  const res = await auth.admin.from("blog_agent_runs").select(RUN_LIST_COLUMNS).order("created_at", { ascending: false }).limit(100);
  if (res.error) return Response.json({ error: res.error.message }, { status: 500 });
  return Response.json({ runs: res.data });
}

export async function POST(req: Request) {
  const startedAt = Date.now();
  const auth = await blogAdmin();
  if (!auth) return new Response("Not found", { status: 404 });
  const { text, label, model } = await req.json();
  if (typeof text !== "string" || !text.trim()) return Response.json({ error: "Empty brief" }, { status: 400 });
  const id = await createRun(auth.admin, { text, label: typeof label === "string" ? label : text, model: pickModel(model) });
  const origin = new URL(req.url).origin;
  after(() => executeRun(id, { origin, startedAt }));
  return Response.json({ id });
}
