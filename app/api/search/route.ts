import { NextResponse, type NextRequest } from "next/server";
import { locationFrom, parseSearchParams, search, TabelogError } from "@/lib/tabelog";
import { createClient } from "@/lib/supabase/server";
import { clientIp } from "@/lib/geoip";
import { GUEST_COOKIE, GUEST_LEFT_HEADER, GUEST_WARM_LIMIT } from "@/lib/guest";
import { takeGuestSearch } from "@/lib/guest-limit";

// GET /api/search?lat&lon&range&q&sort&pay&pmin&pmax&meal&minRating&open&page
// Falls back to the tabelog_loc cookie when lat/lon are missing.
// Guests (no account) are rate limited; "load more" (page > 1) doesn't count as a new search.
// &warm=1 is the app prefetching: the search runs (filling the server cache) but nothing comes back, so for
// guests it doesn't spend a search; it draws on a separate, looser allowance instead.
export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const warm = sp.get("warm") === "1";
  const loc = locationFrom(sp, request.cookies.get("tabelog_loc")?.value);
  if (!loc) return NextResponse.json({ error: "No location. Pass lat & lon or set the tabelog_loc cookie." }, { status: 400 });

  let guestLeft: number | null = null;
  if (request.cookies.get(GUEST_COOKIE)?.value === "1") {
    // a stale guest cookie on a signed-in user doesn't limit them
    const { data: { user } } = await (await createClient()).auth.getUser();
    if (!user && (parseInt(sp.get("page") ?? "", 10) || 1) === 1) {
      const a = warm ? await takeGuestSearch(clientIp(request.headers), "guestwarm", GUEST_WARM_LIMIT) : await takeGuestSearch(clientIp(request.headers));
      if (!a.ok && warm) return new NextResponse(null, { status: 429 });
      if (!a.ok) return NextResponse.json({ error: "Guest search limit reached", limit: "guest", resetAt: a.resetAt }, { status: 429, headers: { [GUEST_LEFT_HEADER]: "0" } });
      if (!warm) guestLeft = a.left;
    }
  }

  try {
    const data = await search(parseSearchParams(sp, loc));
    if (warm) return new NextResponse(null, { status: 204 });
    const res = NextResponse.json(data);
    if (guestLeft != null) res.headers.set(GUEST_LEFT_HEADER, String(guestLeft));
    return res;
  } catch (e) {
    const err = e as TabelogError;
    return NextResponse.json({ error: err.message, source: err.source }, { status: 502 });
  }
}
