export type RateLimitDecision = {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

export type RateLimiter = {
  check(key: string): RateLimitDecision;
};

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
        return {
          allowed: false,
          remaining: 0,
          retryAfterSeconds: Math.max(
            1,
            Math.ceil((oldest + safeWindow - timestamp) / 1000),
          ),
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
      };
    },
  };
}

/** Per-process guard only; serverless instances each get their own counter. */
export const storyRateLimiter = createRateLimiter({
  limit: 5,
  windowMs: 60_000,
});
