// The Pinterest pipeline's tick (lib/pinterest/pipeline.ts). pg_cron pings it every 15 minutes while a
// pin is due; the dashboard's "Post next now" calls it with ?force=1, signed in instead of with the secret.
import { after } from "next/server";
import { blogAdmin } from "@/lib/blog-server";
import { cronAuthorized } from "@/lib/cron";
import { tick } from "@/lib/pinterest/pipeline";

export const maxDuration = 300;

async function handle(req: Request) {
  const force = new URL(req.url).searchParams.get("force") === "1";
  if (!cronAuthorized(req) && !(force && (await blogAdmin()))) return new Response("Not found", { status: 404 });
  // forced from the dashboard: wait, so it can show what happened. From pg_cron (15s timeout): run in the background.
  if (force) return Response.json(await tick({ force }).catch((e: Error) => ({ generated: [], posted: null, error: e.message })));
  after(() => tick().catch((e) => console.error("[pinterest] tick", e)));
  return Response.json({ started: true });
}

export const GET = handle;
export const POST = handle;
