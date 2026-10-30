import { NextResponse, type NextRequest } from "next/server";
import { locationFrom, suggestPlaces } from "@/lib/tabelog";
import { clientIp } from "@/lib/geoip";
import { GUEST_COOKIE, GUEST_SUGGEST_LIMIT } from "@/lib/guest";
import { takeGuestSearch } from "@/lib/guest-limit";

// GET /api/suggest?q&lat&lon — restaurants whose names match what's being typed in the search box.
// Guests draw on their own hourly allowance (a few requests per search typed), separate from searches.
export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const q = (sp.get("q") ?? "").slice(0, 80);
  if (q.trim().length < 2) return NextResponse.json({ places: [] });
  if (request.cookies.get(GUEST_COOKIE)?.value === "1" && !(await takeGuestSearch(clientIp(request.headers), "guestsuggest", GUEST_SUGGEST_LIMIT)).ok) {
    return NextResponse.json({ places: [] });
  }
  const places = await suggestPlaces(q, locationFrom(sp, request.cookies.get("tabelog_loc")?.value));
  return NextResponse.json({ places });
}
