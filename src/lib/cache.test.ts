import { afterEach, describe, expect, it, vi } from "vitest";
import {
  EMPTY_HEAD_SHA,
  NARRATIVE_CACHE_TTL_SECONDS,
  REPO_CACHE_TTL_SECONDS,
  USER_REPOS_CACHE_TTL_SECONDS,
  cacheKey,
  getRedis,
  narrativeKey,
  repoDataKey,
  repoHeadKey,
  userReposKey,
} from "@/lib/cache";

describe("cache keys", () => {
  it("builds namespaced keys", () => {
    expect(cacheKey("repo", "octocat/hello-world", "abc123")).toBe(
      "cs:repo:octocat/hello-world:abc123",
    );
  });

  it("keys repo data by owner, repo, and latest commit SHA", () => {
    expect(repoDataKey("octocat", "hello-world", "abc123")).toBe(
      "cs:repo:octocat/hello-world:abc123",
    );
    expect(repoDataKey("vercel", "next.js", "def456")).toBe(
      "cs:repo:vercel/next.js:def456",
    );
  });

  it("keys narratives by owner, repo, and latest commit SHA", () => {
    expect(narrativeKey("octocat", "hello-world", "abc123")).toBe(
      "cs:narrative:octocat/hello-world:abc123",
    );
  });

  it("uses separate namespaces for HEAD pointers and user repo lists", () => {
    expect(repoHeadKey("octocat", "hello-world")).toBe(
      "cs:head:octocat/hello-world",
    );
    expect(userReposKey("octocat")).toBe("cs:user:octocat:repos");
    expect(EMPTY_HEAD_SHA).toBe("no-commits");
  });
});

describe("cache TTLs", () => {
  it("matches the requested freshness windows", () => {
    expect(REPO_CACHE_TTL_SECONDS).toBe(6 * 60 * 60);
    expect(NARRATIVE_CACHE_TTL_SECONDS).toBe(24 * 60 * 60);
    expect(USER_REPOS_CACHE_TTL_SECONDS).toBe(15 * 60);
  });
});

describe("local fallback", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("disables caching and warns when Upstash credentials are missing", () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");
    vi.stubEnv("UPSTASH_REDIS_URL", "");
    vi.stubEnv("UPSTASH_REDIS_TOKEN", "");
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    expect(getRedis()).toBeNull();
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining("caching disabled"),
    );

    warn.mockRestore();
  });
});
