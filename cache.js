// Pluggable cache: Redis when REDIS_URL is set (or a local Redis answers), otherwise
// a persistent SQLite file. Values are JSON; TTLs are in seconds.
import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function redisBackend(url) {
  const { createClient } = await import("redis");
  // Probe without auto-reconnect so an unreachable Redis fails fast instead of retrying forever.
  const client = createClient({ url, socket: { connectTimeout: 1500, reconnectStrategy: false } });
  let lastErr = null;
  client.on("error", (e) => { lastErr = e; });
  try { await client.connect(); }
  catch (e) {
    try { client.destroy(); } catch {}
    const err = lastErr || e;
    throw new Error(err.code || err.message || (err.errors && err.errors.map((x) => x.code).join(",")) || "connect failed");
  }
  client.on("error", (e) => console.error("[cache] redis error:", e.message));
  const P = "tabelog:"; // namespace, so a shared Redis is safe
  return {
    name: `redis (${url})`,
    async get(key) { const v = await client.get(P + key); return v == null ? undefined : JSON.parse(v); },
    async set(key, value, ttlSec) { await client.set(P + key, JSON.stringify(value), { EX: ttlSec }); },
    async del(key) { await client.del(P + key); },
    async stats() {
      let n = 0;
      // node-redis v5 yields batches of keys; v4 yields single keys
      for await (const batch of client.scanIterator({ MATCH: P + "*", COUNT: 500 })) n += Array.isArray(batch) ? batch.length : 1;
      return { keys: n };
    },
  };
}

function sqliteBackend(file) {
  const db = new DatabaseSync(file);
  db.exec(`CREATE TABLE IF NOT EXISTS cache (key TEXT PRIMARY KEY, value TEXT NOT NULL, expires_at INTEGER NOT NULL);
           CREATE INDEX IF NOT EXISTS cache_exp ON cache(expires_at)`);
  const getQ = db.prepare("SELECT value, expires_at FROM cache WHERE key = ?");
  const setQ = db.prepare("INSERT OR REPLACE INTO cache (key, value, expires_at) VALUES (?, ?, ?)");
  const delQ = db.prepare("DELETE FROM cache WHERE key = ?");
  const purgeQ = db.prepare("DELETE FROM cache WHERE expires_at < ?");
  const countQ = db.prepare("SELECT COUNT(*) AS n FROM cache WHERE expires_at >= ?");
  setInterval(() => { try { purgeQ.run(Date.now()); } catch {} }, 10 * 60 * 1000).unref();
  return {
    name: `sqlite (${path.basename(file)})`,
    async get(key) {
      const row = getQ.get(key);
      if (!row) return undefined;
      if (row.expires_at < Date.now()) { delQ.run(key); return undefined; }
      return JSON.parse(row.value);
    },
    async set(key, value, ttlSec) { setQ.run(key, JSON.stringify(value), Date.now() + ttlSec * 1000); },
    async del(key) { delQ.run(key); },
    async stats() { return { keys: countQ.get(Date.now()).n }; },
  };
}

export async function createCache() {
  const url = process.env.REDIS_URL || "redis://localhost:6379";
  try {
    const r = await redisBackend(url);
    console.log(`[cache] using ${r.name}`);
    return r;
  } catch (e) {
    if (process.env.REDIS_URL) console.error(`[cache] could not connect to ${url}: ${e.message}`);
    const s = sqliteBackend(path.join(__dirname, "cache.sqlite"));
    console.log(`[cache] redis not available, using ${s.name}`);
    return s;
  }
}
