import { NextResponse, type NextRequest } from "next/server";
import { clientIp, locateIp, locationFromHeaders } from "@/lib/geoip";

// GET /api/locate — coarse location from the caller's IP
export async function GET(request: NextRequest) {
  const fromPlatform = locationFromHeaders(request.headers);
  if (fromPlatform) return NextResponse.json(fromPlatform);
  try {
    return NextResponse.json(await locateIp(clientIp(request.headers)));
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
