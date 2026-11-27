import { Ratelimit } from "@upstash/ratelimit";
import { getRedis } from "@/lib/cache";

export type RateLimitDecision = {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
  /** Unix timestamp in milliseconds when the limit resets. */
  resetAt: number;
};

export type RateLimiter = {
  check(key: string): RateLimitDecision;
};

export type AsyncRateLimiter = {
  check(key: string): Promise<RateLimitDecision>;
};

export const STORY_MINUTE_LIMIT = 5;
export const STORY_MINUTE_WINDOW_MS = 60_000;
export const STORY_DAILY_LIMIT = 30;
export const STORY_DAILY_WINDOW_MS = 86_400_000;
export const REFRESH_LIMIT = 1;
export const REFRESH_WINDOW_MS = 300_000;

let rateLimitFailureWarned = false;

function warnRateLimitFailure(error: unknown): void {
  if (rateLimitFailureWarned) return;
  const message = error instanceof Error ? error.message : "unknown Redis error";
  console.warn(`[commit-story] Upstash rate limit unavailable: ${message}`);
  rateLimitFailureWarned = true;
}

export function createRateLimiter({
  limit,
  windowMs,
  now = Date.now,
}: {
  limit: number;
  windowMs: number;
  now?: () => number;
}): RateLimiter {
  const hits = new Map<string, number[]>();
  const safeLimit = Math.max(1, Math.floor(limit));
  const safeWindow = Math.max(1, windowMs);

  return {
    check(key) {
      const timestamp = now();
      const cutoff = timestamp - safeWindow;
      const active = (hits.get(key) ?? []).filter((time) => time > cutoff);

      if (active.length >= safeLimit) {
        const oldest = active[0] ?? timestamp;
        hits.set(key, active);
        const resetAt = oldest + safeWindow;
        return {
          allowed: false,
          remaining: 0,
          retryAfterSeconds: Math.max(
            1,
            Math.ceil((resetAt - timestamp) / 1000),
          ),
          resetAt,
        };
      }

      active.push(timestamp);
      hits.set(key, active);

      for (const [entry, times] of hits) {
        if (times.every((time) => time <= cutoff)) hits.delete(entry);
      }

      return {
        allowed: true,
        remaining: safeLimit - active.length,
        retryAfterSeconds: 0,
        resetAt: timestamp + safeWindow,
      };
    },
  };
}

function createDistributedRateLimiter({
  limit,
  windowMs,
  prefix,
}: {
  limit: number;
  windowMs: number;
  prefix: string;
}): AsyncRateLimiter | null {
  const redis = getRedis();
  if (!redis) return null;

  const seconds = Math.max(1, Math.round(windowMs / 1000));
  const limiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(limit, `${seconds} s`),
    prefix,
    analytics: false,
    enableTelemetry: false,
  });

  return {
    async check(key) {
      const result = await limiter.limit(key);
      return {
        allowed: result.success,
        remaining: result.remaining,
        retryAfterSeconds: Math.max(
          1,
          Math.ceil((result.reset - Date.now()) / 1000),
        ),
        resetAt: result.reset,
      };
    },
  };
}

function withFallback(
  distributed: AsyncRateLimiter | null,
  fallback: RateLimiter,
): AsyncRateLimiter {
  return {
    async check(key) {
      if (distributed) {
        try {
          return await distributed.check(key);
        } catch (error) {
          warnRateLimitFailure(error);
        }
      }
      return fallback.check(key);
    },
  };
}

function createAsyncLimiter({
  limit,
  windowMs,
  prefix,
}: {
  limit: number;
  windowMs: number;
  prefix: string;
}): AsyncRateLimiter {
  return withFallback(
    createDistributedRateLimiter({ limit, windowMs, prefix }),
    createRateLimiter({ limit, windowMs }),
  );
}

let minuteLimiter: AsyncRateLimiter | undefined;
let dailyLimiter: AsyncRateLimiter | undefined;
let refreshLimiter: AsyncRateLimiter | undefined;

export function getStoryMinuteLimiter(): AsyncRateLimiter {
  minuteLimiter ??= createAsyncLimiter({
    limit: STORY_MINUTE_LIMIT,
    windowMs: STORY_MINUTE_WINDOW_MS,
    prefix: "cs:ratelimit:minute",
  });
  return minuteLimiter;
}

export function getStoryDailyLimiter(): AsyncRateLimiter {
  dailyLimiter ??= createAsyncLimiter({
    limit: STORY_DAILY_LIMIT,
    windowMs: STORY_DAILY_WINDOW_MS,
    prefix: "cs:ratelimit:daily",
  });
  return dailyLimiter;
}

export function getRefreshLimiter(): AsyncRateLimiter {
  refreshLimiter ??= createAsyncLimiter({
    limit: REFRESH_LIMIT,
    windowMs: REFRESH_WINDOW_MS,
    prefix: "cs:ratelimit:refresh",
  });
  return refreshLimiter;
}
