import { Redis } from "@upstash/redis";

export const CACHE_PREFIX = "cs";

export const REPO_CACHE_TTL_SECONDS = 6 * 60 * 60;
export const NARRATIVE_CACHE_TTL_SECONDS = 24 * 60 * 60;
export const USER_REPOS_CACHE_TTL_SECONDS = 15 * 60;
export const HEAD_CACHE_TTL_SECONDS = 60;

export const EMPTY_HEAD_SHA = "no-commits";

export type CacheEnvelope<T> = {
  value: T;
  cachedAt: string;
};

let redisClient: Redis | null | undefined;
let missingWarned = false;
let failureWarned = false;

function warnMissing(): void {
  if (missingWarned) return;
  console.warn(
    "[commit-story] UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN missing; caching disabled.",
  );
  missingWarned = true;
}

function warnFailure(error: unknown): void {
  if (failureWarned) return;
  const message = error instanceof Error ? error.message : "unknown Redis error";
  console.warn(`[commit-story] Upstash cache unavailable: ${message}`);
  failureWarned = true;
}

export function getRedis(): Redis | null {
  if (redisClient !== undefined) return redisClient;

  const url =
    process.env.UPSTASH_REDIS_REST_URL?.trim() ||
    process.env.UPSTASH_REDIS_URL?.trim();
  const token =
    process.env.UPSTASH_REDIS_REST_TOKEN?.trim() ||
    process.env.UPSTASH_REDIS_TOKEN?.trim();
  if (!url || !token) {
    warnMissing();
    redisClient = null;
    return redisClient;
  }

  redisClient = new Redis({ url, token });
  return redisClient;
}

export function cacheKey(...parts: readonly string[]): string {
  return [CACHE_PREFIX, ...parts].join(":");
}

export function repoDataKey(owner: string, repo: string, sha: string): string {
  return cacheKey("repo", `${owner}/${repo}`, sha);
}

export function narrativeKey(owner: string, repo: string, sha: string): string {
  return cacheKey("narrative", `${owner}/${repo}`, sha);
}

export function repoHeadKey(owner: string, repo: string): string {
  return cacheKey("head", `${owner}/${repo}`);
}

export function userReposKey(username: string): string {
  return cacheKey("user", username, "repos");
}

function isEnvelope(value: unknown): value is CacheEnvelope<unknown> {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return "value" in record && typeof record.cachedAt === "string";
}

export async function getJson<T>(key: string): Promise<T | null> {
  const redis = getRedis();
  if (!redis) return null;

  try {
    const raw = await redis.get<unknown>(key);
    return (raw ?? null) as T | null;
  } catch (error) {
    warnFailure(error);
    return null;
  }
}

export async function setJson<T>(
  key: string,
  value: T,
  ttlSeconds: number,
): Promise<void> {
  const redis = getRedis();
  if (!redis) return;

  try {
    await redis.set(key, value, {
      ex: Math.max(1, Math.floor(ttlSeconds)),
    });
  } catch (error) {
    warnFailure(error);
  }
}

export async function getCached<T>(
  key: string,
): Promise<CacheEnvelope<T> | null> {
  const raw = await getJson<unknown>(key);
  if (!isEnvelope(raw)) return null;
  return raw as CacheEnvelope<T>;
}

export async function setCached<T>(
  key: string,
  value: T,
  ttlSeconds: number,
): Promise<string> {
  const cachedAt = new Date().toISOString();
  await setJson(key, { value, cachedAt }, ttlSeconds);
  return cachedAt;
}

export async function deleteCachedKeys(keys: readonly string[]): Promise<void> {
  const redis = getRedis();
  if (!redis || keys.length === 0) return;

  try {
    await redis.del(...keys);
  } catch (error) {
    warnFailure(error);
  }
}
