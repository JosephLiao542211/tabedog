import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { CITY_SLUGS } from "@/lib/seo";

const PUBLIC_PATHS = [
  /^\/$/, /^\/login$/, /^\/auth\//,
  /^\/api\/billing\/webhook$/, // Stripe calls the webhook without a session
  /^\/sitemap\.xml$/, /^\/robots\.txt$/, /^\/opengraph-image/, /^\/twitter-image/,
  /^\/cuisine\/[a-z-]+$/, new RegExp(`^/(${CITY_SLUGS.join("|")})(/[a-z-]+)?$`), // public SEO hub pages
];

/** Refresh the Supabase session cookie on every request and gate everything but the public pages behind sign-in. */
export async function updateSession(request: NextRequest) {
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
  const { pathname, search } = request.nextUrl;
  const isPublic = PUBLIC_PATHS.some((re) => re.test(pathname));

  if (!user && !isPublic) {
    if (pathname.startsWith("/api/")) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("next", pathname + search);
    return NextResponse.redirect(url);
  }
  if (user && pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return response;
}
