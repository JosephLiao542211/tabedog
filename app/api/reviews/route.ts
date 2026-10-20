import { NextResponse, type NextRequest } from "next/server";
import { getReviews, isRestaurantUrl, TabelogError } from "@/lib/tabelog";

// GET /api/reviews?url=https://tabelog.com/en/.../<id>/  — the newest reviews for one restaurant
export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url") || "";
  if (!isRestaurantUrl(url)) return NextResponse.json({ error: "url must be a Tabelog restaurant page" }, { status: 400 });
  try {
    return NextResponse.json(await getReviews(url));
  } catch (e) {
    const err = e as TabelogError;
    return NextResponse.json({ error: err.message, source: err.source }, { status: 502 });
  }
}
