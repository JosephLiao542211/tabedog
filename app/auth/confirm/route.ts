import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/auth-utils";
import { GUEST_COOKIE } from "@/lib/guest";

// GET /auth/confirm?token_hash&type — the link in the "Confirm your email" mail (supabase/templates/confirmation.html).
// Unlike /auth/callback's ?code= (PKCE), a token hash verifies in any browser, so opening the mail
// on another device still works. Verifying signs the user in; they land straight on the map.
export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const tokenHash = sp.get("token_hash");
  const type = sp.get("type") as EmailOtpType | null;
  if (tokenHash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) {
      const res = NextResponse.redirect(new URL(safeNext(sp.get("next")), request.url));
      res.cookies.delete(GUEST_COOKIE); // they have an account now
      return res;
    }
  }
  return NextResponse.redirect(new URL("/login?error=link", request.url));
}
