import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { GUEST_COOKIE } from "@/lib/guest";

// API routes anyone may call without a session. Every page is public: the app at "/" decides between the
// landing page, guest mode and the signed-in app itself, and unknown paths fall through to Next's real 404.
const PUBLIC_API = [
  /^\/api\/billing\/webhook$/, // Stripe calls the webhook without a session
  /^\/api\/landing-spots$/, // the pins behind the public landing page: one cached search, no user input
];

// what a guest (no account, "Continue as guest") may also call: the map's read-only APIs
const GUEST_API = [/^\/api\/(search|genres|reviews|locate)$/];

/** Refresh the Supabase session cookie on every request and gate the private APIs behind sign-in. */
export async function updateSession(request: NextRequest) {
  const { pathname } = request.nextUrl;
  // one canonical, lowercase URL per page: /Tokyo -> /tokyo (API and auth paths are left alone)
  if (/[A-Z]/.test(pathname) && !pathname.startsWith("/api/") && !pathname.startsWith("/auth/")) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.toLowerCase();
    return NextResponse.redirect(url, 308);
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() { return request.cookies.getAll(); },
      setAll(toSet) {
        for (const { name, value } of toSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of toSet) response.cookies.set(name, value, options);
      },
    },
  });

  // getUser() validates the token with Supabase Auth; do not swap it for getSession() here.
  const { data: { user } } = await supabase.auth.getUser();
  const isGuest = request.cookies.get(GUEST_COOKIE)?.value === "1";
  const isOpenApi = PUBLIC_API.some((re) => re.test(pathname)) || (isGuest && GUEST_API.some((re) => re.test(pathname)));

  if (!user && pathname.startsWith("/api/") && !isOpenApi) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }
  if (user && pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return response;
}
