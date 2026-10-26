// One drafting run. GET: the whole row, messages included. PATCH: photo swaps and the saved post.
// POST: { action: "send", text } asks for a revision, "continue" resumes a stopped or interrupted
// run, "stop" asks the runner to abort, and "resume" is the runner handing itself to a fresh
// invocation at the time limit (CRON_SECRET, not a session). DELETE removes it.
import { after } from "next/server";
import { blogAdmin } from "@/lib/blog-server";
import { cronAuthorized } from "@/lib/cron";
import { createAdminClient } from "@/lib/supabase/admin";
import { executeRun, pickModel, reapStale, restartRun } from "@/lib/blog-agent/runs";

export const maxDuration = 300; // = MAX_DURATION in lib/blog-agent/runs.ts

const notFound = () => new Response("Not found", { status: 404 });

export async function GET(_req: Request, ctx: RouteContext<"/api/admin/blog-agent/runs/[id]">) {
  const auth = await blogAdmin();
  if (!auth) return notFound();
  await reapStale(auth.admin);
  const { data } = await auth.admin.from("blog_agent_runs").select("*").eq("id", (await ctx.params).id).maybeSingle();
  return data ? Response.json({ run: data }) : notFound();
}

export async function PATCH(req: Request, ctx: RouteContext<"/api/admin/blog-agent/runs/[id]">) {
  const auth = await blogAdmin();
  if (!auth) return notFound();
  const body = await req.json();
  const patch: Record<string, unknown> = {};
  if (body.photo_overrides && typeof body.photo_overrides === "object") patch.photo_overrides = body.photo_overrides;
  if ("post_id" in body) patch.post_id = body.post_id;
  const res = await auth.admin.from("blog_agent_runs").update(patch).eq("id", (await ctx.params).id);
  return res.error ? Response.json({ error: res.error.message }, { status: 500 }) : Response.json({ ok: true });
}

export async function DELETE(_req: Request, ctx: RouteContext<"/api/admin/blog-agent/runs/[id]">) {
  const auth = await blogAdmin();
  if (!auth) return notFound();
  // a running run notices the row is gone on its next save and aborts
  const res = await auth.admin.from("blog_agent_runs").delete().eq("id", (await ctx.params).id);
  return res.error ? Response.json({ error: res.error.message }, { status: 500 }) : Response.json({ ok: true });
}

export async function POST(req: Request, ctx: RouteContext<"/api/admin/blog-agent/runs/[id]">) {
  const startedAt = Date.now();
  const { id } = await ctx.params;
  const body = await req.json();
  const origin = new URL(req.url).origin;

  if (body.action === "resume") {
    if (!cronAuthorized(req)) return notFound();
    after(() => executeRun(id, { origin, startedAt }));
    return Response.json({ ok: true });
  }

  const auth = await blogAdmin();
  if (!auth) return notFound();
  const admin = createAdminClient();
  if (body.action === "stop") {
    await admin.from("blog_agent_runs").update({ status: "stopping" }).eq("id", id).eq("status", "running");
    return Response.json({ ok: true });
  }
  if (body.action === "send" || body.action === "continue") {
    const text = body.action === "send" && typeof body.text === "string" ? body.text.trim() : undefined;
    if (body.action === "send" && !text) return Response.json({ error: "Empty message" }, { status: 400 });
    await reapStale(admin);
    if (!(await restartRun(admin, id, { text, model: body.model ? pickModel(body.model) : undefined })))
      return Response.json({ error: "This run is still working, or has nothing to continue." }, { status: 409 });
    after(() => executeRun(id, { origin, startedAt }));
    return Response.json({ ok: true });
  }
  return Response.json({ error: "Unknown action" }, { status: 400 });
}
