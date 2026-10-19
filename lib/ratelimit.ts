/**
 * Small in-memory sliding-window rate limiter. Per serverless instance; the Supabase RPCs add a
 * second, per-agent limit on writes so direct RPC callers are bounded too.
 */
type Bucket = number[];
const g = globalThis as unknown as { __ac_rl?: Map<string, Bucket> };
const buckets = (g.__ac_rl ??= new Map());

export interface Limit { max: number; windowMs: number }

export const LIMITS = {
  register: { max: 10, windowMs: 60 * 60 * 1000 }, // per IP
  read: { max: 240, windowMs: 60 * 1000 }, // per IP
  write: { max: 60, windowMs: 60 * 1000 }, // per agent (heartbeat/visit/leave)
  action: { max: 20, windowMs: 60 * 1000 }, // per agent (pray/read/...)
  letter: { max: 10, windowMs: 10 * 60 * 1000 },
  challenge: { max: 30, windowMs: 60 * 1000 },
} satisfies Record<string, Limit>;

export function hit(key: string, limit: Limit, now = Date.now()): { ok: boolean; retryAfterMs: number; remaining: number } {
  let b = buckets.get(key);
  if (!b) {
    b = [];
    buckets.set(key, b);
  }
  const cutoff = now - limit.windowMs;
  while (b.length && b[0] <= cutoff) b.shift();
  if (b.length >= limit.max) {
    return { ok: false, retryAfterMs: b[0] + limit.windowMs - now, remaining: 0 };
  }
  b.push(now);
  if (buckets.size > 20000) {
    // crude eviction
    for (const [k, v] of buckets) {
      if (!v.length || v[v.length - 1] < cutoff) buckets.delete(k);
      if (buckets.size < 10000) break;
    }
  }
  return { ok: true, retryAfterMs: 0, remaining: limit.max - b.length };
}
