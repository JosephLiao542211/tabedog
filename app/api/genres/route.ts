import { NextResponse } from "next/server";
import { GENRES } from "@/lib/genres";

// GET /api/genres — codes and labels for the search suggestions
export function GET() {
  return NextResponse.json(GENRES.map(([code, label]) => ({ code, label })));
}
