// Coarse location from an IP address, for the first search before GPS lands.
// On Vercel the platform already puts the caller's location in request headers (free, no lookup).
// Elsewhere ipapi.co is asked, once per IP per hour. From a private/loopback address the
// public IP of this machine is looked up instead.
import { cached } from "./cache";
import type { LocateResponse } from "./types";

const IPLOC_TTL = 60 * 60; // seconds

const isPrivateIp = (ip: string) =>
  !ip || /^(::1|::ffff:127\.|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|fe80:|fc|fd|::ffff:10\.|::ffff:192\.168\.)/.test(ip);

export function clientIp(headers: Headers): string {
  const fwd = headers.get("x-forwarded-for")?.split(",")[0].trim();
  return (fwd || headers.get("x-real-ip") || "").replace(/^::ffff:/, "");
}

export function locationFromHeaders(headers: Headers): LocateResponse | null {
  const lat = parseFloat(headers.get("x-vercel-ip-latitude") ?? ""), lng = parseFloat(headers.get("x-vercel-ip-longitude") ?? "");
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  let city = headers.get("x-vercel-ip-city") ?? "";
  try { city = decodeURIComponent(city); } catch { /* keep raw */ }
  return { lat, lng, acc: 5000, src: "ip", city, country: headers.get("x-vercel-ip-country") ?? "" };
}

type IpApi = { latitude?: number; longitude?: number; city?: string; country_code?: string; error?: boolean; reason?: string };

export async function locateIp(ip: string): Promise<LocateResponse> {
  const self = isPrivateIp(ip);
  const key = self ? "iploc:self" : `iploc:${ip}`;
  const hit = await cached(key, IPLOC_TTL, async () => {
    const r = await fetch(`https://ipapi.co/${self ? "" : ip + "/"}json/`, { headers: { "user-agent": "tabelog-map/2.0" }, cache: "no-store" });
    if (!r.ok) throw new Error(`ipapi ${r.status}`);
    const j = (await r.json()) as IpApi;
    if (j.error) throw new Error(j.reason || "ipapi error");
    if (!Number.isFinite(j.latitude) || !Number.isFinite(j.longitude)) throw new Error("no coordinates from ipapi");
    return { lat: j.latitude as number, lng: j.longitude as number, city: j.city || "", country: j.country_code || "" };
  });
  return { ...hit, acc: 5000, src: self ? "ip (public)" : "ip" };
}
