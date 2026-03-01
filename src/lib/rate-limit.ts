/**
 * Rate limiter for auth and sensitive endpoints.
 * Uses Upstash Redis when UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are set.
 * Falls back to in-memory when Redis is not configured (dev/local).
 */

const windowMs = 60 * 1000; // 1 minute
const maxRequests = 10; // 10 requests per minute per key

// In-memory fallback store
const memoryStore = new Map<string, { count: number; resetAt: number }>();

function pruneMemory() {
  const now = Date.now();
  for (const [key, entry] of memoryStore.entries()) {
    if (entry.resetAt < now) memoryStore.delete(key);
  }
}

function checkRateLimitMemory(key: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  if (memoryStore.size > 1000) pruneMemory();

  let entry = memoryStore.get(key);
  if (!entry) {
    entry = { count: 0, resetAt: now + windowMs };
    memoryStore.set(key, entry);
  }
  if (entry.resetAt < now) {
    entry = { count: 0, resetAt: now + windowMs };
    memoryStore.set(key, entry);
  }

  const allowed = entry.count < maxRequests;
  if (allowed) entry.count += 1;
  const remaining = Math.max(0, maxRequests - entry.count);

  return { allowed, remaining };
}

// Upstash Redis rate limiter (lazy init)
let upstashLimiter: {
  limit: (identifier: string) => Promise<{ success: boolean; remaining: number }>;
} | null = null;

function getUpstashLimiter() {
  if (upstashLimiter) return upstashLimiter;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  try {
    const { Ratelimit } = require("@upstash/ratelimit");
    const { Redis } = require("@upstash/redis");
    const redis = new Redis({ url, token });
    upstashLimiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(maxRequests, "60 s"),
    });
    return upstashLimiter;
  } catch {
    return null;
  }
}

export async function checkRateLimit(key: string): Promise<{ allowed: boolean; remaining: number }> {
  const limiter = getUpstashLimiter();
  if (limiter) {
    try {
      const result = await limiter.limit(key);
      return {
        allowed: result.success,
        remaining: result.remaining,
      };
    } catch {
      // Redis failed - fallback to memory
      return checkRateLimitMemory(key);
    }
  }
  return checkRateLimitMemory(key);
}
