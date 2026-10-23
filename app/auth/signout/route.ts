import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { GUEST_COOKIE } from "@/lib/guest";

export async function POST(request: Request) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  const res = NextResponse.redirect(new URL("/login", request.url), { status: 303 });
  res.cookies.delete(GUEST_COOKIE); // leaving guest mode goes through here too
  return res;
}
