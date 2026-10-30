import { NextResponse, type NextRequest } from "next/server";
import { placeInfo, TabelogError } from "@/lib/tabelog";

// GET /api/place?url&closed — coordinates, hours, payment and photos for a restaurant picked from the suggestions
export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  try {
    return NextResponse.json(await placeInfo(sp.get("url") ?? "", sp.get("closed") ?? ""));
  } catch (e) {
    const err = e as TabelogError;
    return NextResponse.json({ error: err.message }, { status: 502 });
  }
}
