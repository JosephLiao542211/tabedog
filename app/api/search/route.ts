import { NextResponse, type NextRequest } from "next/server";
import { locationFrom, parseSearchParams, search, TabelogError } from "@/lib/tabelog";

// GET /api/search?lat&lon&range&q&sort&pay&pmin&pmax&meal&minRating&open&page
// Falls back to the tabelog_loc cookie when lat/lon are missing.
export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const loc = locationFrom(sp, request.cookies.get("tabelog_loc")?.value);
  if (!loc) return NextResponse.json({ error: "No location. Pass lat & lon or set the tabelog_loc cookie." }, { status: 400 });
  try {
    return NextResponse.json(await search(parseSearchParams(sp, loc)));
  } catch (e) {
    const err = e as TabelogError;
    return NextResponse.json({ error: err.message, source: err.source }, { status: 502 });
  }
}
