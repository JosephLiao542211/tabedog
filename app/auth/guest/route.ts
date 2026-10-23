import { NextResponse, type NextRequest } from "next/server";
import { safeNext } from "@/lib/auth-utils";
import { GUEST_COOKIE, GUEST_MAX_AGE } from "@/lib/guest";

// POST /auth/guest — "Continue as guest" on the login page: remember the choice and open the map.
export async function POST(request: NextRequest) {
  const form = await request.formData();
  const res = NextResponse.redirect(new URL(safeNext(form.get("next") as string | null), request.url), { status: 303 });
  res.cookies.set(GUEST_COOKIE, "1", { path: "/", maxAge: GUEST_MAX_AGE, sameSite: "lax", httpOnly: true, secure: request.nextUrl.protocol === "https:" });
  return res;
}
