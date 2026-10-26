// The publishing queue's tick. pg_cron pings this every 15 minutes while a run is due (see the
// blog_agent_runs migration); it claims the next prompt and drafts it in the background. The
// dashboard's "Draft next now" posts here too, with ?force=1, signed in instead of with the secret.
import { after } from "next/server";
import { blogAdmin } from "@/lib/blog-server";
import { cronAuthorized } from "@/lib/cron";
import { createAdminClient } from "@/lib/supabase/admin";
import { executeRun, startQueued } from "@/lib/blog-agent/runs";

export const maxDuration = 300; // = MAX_DURATION in lib/blog-agent/runs.ts

async function tick(req: Request) {
  const startedAt = Date.now();
  const force = new URL(req.url).searchParams.get("force") === "1";
  if (!cronAuthorized(req) && !(force && (await blogAdmin()))) return new Response("Not found", { status: 404 });
  const runId = await startQueued(createAdminClient(), force);
  if (runId) {
    const origin = new URL(req.url).origin;
    after(() => executeRun(runId, { origin, startedAt }));
  }
  return Response.json({ started: runId });
}

export const GET = tick; // Vercel Cron and manual curl
export const POST = tick; // pg_net
