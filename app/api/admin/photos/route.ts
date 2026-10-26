// Photo candidates for the draft's photo picker: web/CC search, plus a restaurant's Tabelog photos.
import { NextResponse } from "next/server";
import { blogAdmin } from "@/lib/blog-server";
import { searchPhotos, tabelogPhotos, type Photo } from "@/lib/photos";
import { getRestaurant, isRestaurantUrl } from "@/lib/tabelog";

export async function GET(req: Request) {
  if (!(await blogAdmin())) return new Response("Not found", { status: 404 });
  const sp = new URL(req.url).searchParams;
  const q = sp.get("q") ?? "", restaurant = sp.get("restaurant") ?? "";
  const [web, own] = await Promise.all([
    searchPhotos(q, 10),
    isRestaurantUrl(restaurant) ? getRestaurant(restaurant).then((p) => tabelogPhotos(p.photos, p.name, p.url)).catch(() => [] as Photo[]) : Promise.resolve([] as Photo[]),
  ]);
  return NextResponse.json({ photos: [...own, ...web] });
}
