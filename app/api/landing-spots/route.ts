import { NextResponse } from "next/server";
import { landingSpots } from "@/lib/landing";

// GET /api/landing-spots: the pins behind the public landing page
export async function GET() {
  try {
    const spots = await landingSpots();
    return NextResponse.json({ spots }, { headers: { "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=86400" } });
  } catch (e) {
    return NextResponse.json({ spots: [], error: (e as Error).message }, { status: 502 });
  }
}
