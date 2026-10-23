import { NextResponse, type NextRequest } from "next/server";
import { safeNext } from "@/lib/auth-utils";
import { GUEST_COOKIE, GUEST_MAX_AGE } from "@/lib/guest";
import { createClient } from "@/lib/supabase/server";

async function enterGuest(request: NextRequest, next: string | null) {
  const res = NextResponse.redirect(new URL(safeNext(next), request.url), { status: 303 });
  // signed-in users go straight to the app; only remember guest mode for people without a session.
  // Validate the session like "/" does: a stale sb-*-auth-token cookie alone would skip the guest cookie and land them back on the landing page.
  const { data: { user } } = await (await createClient()).auth.getUser();
  if (!user) res.cookies.set(GUEST_COOKIE, "1", { path: "/", maxAge: GUEST_MAX_AGE, sameSite: "lax", httpOnly: true, secure: request.nextUrl.protocol === "https:" });
  return res;
}

// GET /auth/guest?next=… — the "Open the map" links on the public pages: no sign-up, straight to the map.
export async function GET(request: NextRequest) {
  return enterGuest(request, request.nextUrl.searchParams.get("next"));
}

// POST /auth/guest — "Continue as guest" on the login page: remember the choice and open the map.
export async function POST(request: NextRequest) {
  const form = await request.formData();
  return enterGuest(request, form.get("next") as string | null);
}
