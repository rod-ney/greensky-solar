/**
 * Rate limiter for auth and sensitive endpoints.
 * Uses Upstash Redis when UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are set.
 * Falls back to in-memory when Redis is not configured (dev/local).
 */

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

type RateLimitOptions = {
  maxRequests?: number;
  windowSeconds?: number;
  prefix?: string;
};

const DEFAULT_MAX_REQUESTS = 10;
const DEFAULT_WINDOW_SECONDS = 60;

// In-memory fallback store
const memoryStore = new Map<string, { count: number; resetAt: number }>();

function pruneMemory() {
  const now = Date.now();
  for (const [key, entry] of memoryStore.entries()) {
    if (entry.resetAt < now) memoryStore.delete(key);
  }
}

function checkRateLimitMemory(
  key: string,
  maxRequests: number,
  windowSeconds: number
): { allowed: boolean; remaining: number } {
  const windowMs = windowSeconds * 1000;
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
const upstashLimiters = new Map<string, Ratelimit>();

function getLimiterSignature(maxRequests: number, windowSeconds: number): string {
  return `${maxRequests}:${windowSeconds}`;
}

function getUpstashLimiter(maxRequests: number, windowSeconds: number): Ratelimit | null {
  const signature = getLimiterSignature(maxRequests, windowSeconds);
  const existing = upstashLimiters.get(signature);
  if (existing) return existing;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  try {
    const redis = new Redis({ url, token });
    const limiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(maxRequests, `${windowSeconds} s`),
    });

    upstashLimiters.set(signature, limiter);
    return limiter;
  } catch {
    return null;
  }
}

export async function checkRateLimit(
  key: string,
  options: RateLimitOptions = {}
): Promise<{ allowed: boolean; remaining: number }> {
  const maxRequests = options.maxRequests ?? DEFAULT_MAX_REQUESTS;
  const windowSeconds = options.windowSeconds ?? DEFAULT_WINDOW_SECONDS;
  const namespacedKey = options.prefix ? `${options.prefix}:${key}` : key;

  const limiter = getUpstashLimiter(maxRequests, windowSeconds);
  if (limiter) {
    try {
      const result = await limiter.limit(namespacedKey);
      return {
        allowed: result.success,
        remaining: result.remaining,
      };
    } catch {
      // Redis failed - fallback to memory
      return checkRateLimitMemory(namespacedKey, maxRequests, windowSeconds);
    }
  }
  return checkRateLimitMemory(namespacedKey, maxRequests, windowSeconds);
}
