// Pinterest OAuth callback: checks the state cookie, trades the code for tokens, back to the dashboard.
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { blogAdmin } from "@/lib/blog-server";
import { connect } from "@/lib/pinterest/api";

export async function GET(req: Request) {
  const who = await blogAdmin();
  if (!who) return new Response("Not found", { status: 404 });
  const url = new URL(req.url);
  const back = (q: string) => {
    const res = NextResponse.redirect(`${url.origin}/admin/pinterest?${q}`);
    res.cookies.delete({ name: "pinterest_oauth_state", path: "/api/admin/pinterest" });
    return res;
  };
  const state = (await cookies()).get("pinterest_oauth_state")?.value;
  const code = url.searchParams.get("code");
  if (url.searchParams.get("error")) return back(`error=${encodeURIComponent(`Pinterest said: ${url.searchParams.get("error_description") || url.searchParams.get("error")}`)}`);
  if (!code || !state || state !== url.searchParams.get("state")) return back(`error=${encodeURIComponent("The sign-in link expired or didn't match. Try connecting again.")}`);
  try {
    await connect(who.admin, code, url.origin);
    return back("connected=1");
  } catch (e) {
    return back(`error=${encodeURIComponent(e instanceof Error ? e.message : String(e))}`);
  }
}
