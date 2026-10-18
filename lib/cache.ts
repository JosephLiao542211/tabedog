// Server-side cache for scraped pages. Backed by the Supabase `scrape_cache` table (service role),
// with a small in-process memory layer in front so warm searches stay fast. Falls back to
// memory only when no service role key is configured. Values are JSON; TTLs are in seconds.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

type Entry = { v: unknown; exp: number };
type Store = { mem: Map<string, Entry>; inflight: Map<string, Promise<unknown>>; sets: number; client?: SupabaseClient | null };

// survives Next.js dev HMR reloads
const g = globalThis as unknown as { __tabedogCache?: Store };
const store: Store = (g.__tabedogCache ??= { mem: new Map(), inflight: new Map(), sets: 0 });

const MEM_MAX = 3000;
const MEM_TTL_CAP = 10 * 60 * 1000; // ms: memory copies refresh from the table at least every 10 min
const TABLE = "scrape_cache";

function db(): SupabaseClient | null {
  if (store.client !== undefined) return store.client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
  store.client = url && key ? createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }) : null;
  if (!store.client) console.warn("[cache] SUPABASE_SERVICE_ROLE_KEY not set: using in-memory cache only");
  return store.client;
}

export const cacheBackend = () => (db() ? "supabase" : "memory");

function memGet(key: string): unknown {
  const e = store.mem.get(key);
  if (!e) return undefined;
  if (e.exp < Date.now()) { store.mem.delete(key); return undefined; }
  return e.v;
}
function memSet(key: string, v: unknown, ttlSec: number) {
  if (store.mem.size >= MEM_MAX) store.mem.delete(store.mem.keys().next().value as string); // drop the oldest
  store.mem.set(key, { v, exp: Date.now() + Math.min(ttlSec * 1000, MEM_TTL_CAP) });
}

async function dbGet(client: SupabaseClient, key: string): Promise<unknown> {
  const { data, error } = await client.from(TABLE).select("value, expires_at").eq("key", key).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data || new Date(data.expires_at as string).getTime() < Date.now()) return undefined;
  return data.value;
}
async function dbSet(client: SupabaseClient, key: string, value: unknown, ttlSec: number) {
  // jsonb rejects \u0000; scraped text occasionally contains it
  const safe = JSON.parse(JSON.stringify(value).replace(/\\u0000/g, ""));
  const { error } = await client.from(TABLE).upsert({ key, value: safe, expires_at: new Date(Date.now() + ttlSec * 1000).toISOString() });
  if (error) throw new Error(error.message);
  if (++store.sets % 50 === 0) client.rpc("purge_scrape_cache").then(({ error: e }) => e && console.error("[cache] purge failed:", e.message));
}

/** Return the cached value for `key`, or compute it with `fn`, store it for `ttlSec`, and dedupe concurrent misses. */
export async function cached<T>(key: string, ttlSec: number, fn: () => Promise<T>, valid: (v: T) => boolean = () => true): Promise<T> {
  const m = memGet(key);
  if (m !== undefined && valid(m as T)) return m as T;
  const client = db();
  if (client) {
    try {
      const hit = await dbGet(client, key);
      if (hit !== undefined && valid(hit as T)) { memSet(key, hit, ttlSec); return hit as T; }
    } catch (e) { console.error("[cache] get failed:", (e as Error).message); }
  }
  if (store.inflight.has(key)) return store.inflight.get(key) as Promise<T>;
  const p = (async () => {
    const v = await fn();
    memSet(key, v, ttlSec);
    if (client) await dbSet(client, key, v, ttlSec).catch((e) => console.error("[cache] set failed:", (e as Error).message));
    return v;
  })().finally(() => store.inflight.delete(key));
  store.inflight.set(key, p);
  return p;
}

export async function cacheStats() {
  const client = db();
  if (!client) return { backend: "memory", keys: store.mem.size };
  const { count, error } = await client.from(TABLE).select("key", { count: "exact", head: true }).gte("expires_at", new Date().toISOString());
  return { backend: "supabase", keys: count ?? 0, memoryKeys: store.mem.size, ...(error ? { error: error.message } : {}) };
}
