import { describe, expect, it } from "vitest";
import { createRateLimiter } from "@/lib/rateLimit";

describe("createRateLimiter", () => {
  it("allows up to the limit then returns a retry delay", () => {
    let now = 0;
    const limiter = createRateLimiter({ limit: 2, windowMs: 1000, now: () => now });

    expect(limiter.check("127.0.0.1")).toMatchObject({
      allowed: true,
      remaining: 1,
    });
    expect(limiter.check("127.0.0.1")).toMatchObject({
      allowed: true,
      remaining: 0,
    });
    expect(limiter.check("127.0.0.1")).toMatchObject({
      allowed: false,
      remaining: 0,
      retryAfterSeconds: 1,
    });

    now = 1000;
    expect(limiter.check("127.0.0.1")).toMatchObject({
      allowed: true,
      remaining: 1,
    });
  });

  it("tracks keys independently", () => {
    const limiter = createRateLimiter({
      limit: 1,
      windowMs: 1000,
      now: () => 0,
    });

    expect(limiter.check("a").allowed).toBe(true);
    expect(limiter.check("b").allowed).toBe(true);
    expect(limiter.check("a").allowed).toBe(false);
  });
});
