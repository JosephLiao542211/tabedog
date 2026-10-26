// Machine-to-machine auth for scheduled and internal calls: `Authorization: Bearer $CRON_SECRET`.
import "server-only";
import { timingSafeEqual } from "node:crypto";

export function cronAuthorized(req: Request) {
  const secret = process.env.CRON_SECRET;
  const got = req.headers.get("authorization") ?? "";
  if (!secret) return false;
  const a = Buffer.from(got), b = Buffer.from(`Bearer ${secret}`);
  return a.length === b.length && timingSafeEqual(a, b);
}
