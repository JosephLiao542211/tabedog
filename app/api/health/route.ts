import { NextResponse } from "next/server";
import { cacheStats } from "@/lib/cache";

// GET /api/health — cache backend and key count
export async function GET() {
  return NextResponse.json({ ok: true, ...(await cacheStats()) });
}
