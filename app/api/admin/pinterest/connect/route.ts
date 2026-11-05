// Starts Pinterest OAuth: a random state in a short-lived cookie, then off to Pinterest.
import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { blogAdmin } from "@/lib/blog-server";
import { authorizeUrl, pinterestConfigured } from "@/lib/pinterest/api";

export async function GET(req: Request) {
  if (!(await blogAdmin())) return new Response("Not found", { status: 404 });
  const origin = new URL(req.url).origin;
  if (!pinterestConfigured()) return NextResponse.redirect(`${origin}/admin/pinterest?error=${encodeURIComponent("Set PINTEREST_APP_ID and PINTEREST_APP_SECRET first.")}`);
  const state = randomBytes(16).toString("hex");
  const res = NextResponse.redirect(authorizeUrl(origin, state));
  res.cookies.set("pinterest_oauth_state", state, { httpOnly: true, secure: origin.startsWith("https"), sameSite: "lax", maxAge: 600, path: "/api/admin/pinterest" });
  return res;
}
