import { z } from "zod";
import { analyzeRepo } from "@/lib/analyze";
import { getCached, narrativeKey } from "@/lib/cache";
import { RateLimitError, RepoNotFoundError } from "@/lib/github";
import {
  buildStoryInput,
  cachedStoryResponse,
  streamStoryResponse,
} from "@/lib/llm";
import {
  getRefreshLimiter,
  getStoryDailyLimiter,
  getStoryMinuteLimiter,
  type RateLimitDecision,
} from "@/lib/rateLimit";
import { repoSchema } from "@/lib/repo";
import { loadRepoStoryData, refreshRepoStoryData } from "@/lib/story";

export const maxDuration = 60;

const MAX_BODY_CHARS = 2048;
const storyRequestSchema = repoSchema.strict().extend({
  refresh: z.boolean().optional(),
});

function jsonError(
  message: string,
  status: number,
  extraHeaders: Record<string, string> = {},
  extraBody: Record<string, unknown> = {},
): Response {
  return Response.json(
    { error: message, ...extraBody },
    { status, headers: { "Cache-Control": "no-store", ...extraHeaders } },
  );
}

function rateLimitError(decision: RateLimitDecision, scope: string): Response {
  const retryAfterSeconds = Math.max(1, decision.retryAfterSeconds);
  const resetAt = new Date(decision.resetAt);
  const resetLabel = Number.isFinite(resetAt.getTime())
    ? resetAt.toLocaleTimeString()
    : "unknown";

  return jsonError(
    `rate limit reached (${scope}) · reset in ${retryAfterSeconds}s at ${resetLabel}`,
    429,
    {
      "Retry-After": String(retryAfterSeconds),
      "X-Rate-Limit-Reset": String(decision.resetAt),
      "X-Rate-Limit-Scope": scope,
    },
    {
      retryAfterSeconds,
      resetAt: Number.isFinite(resetAt.getTime())
        ? resetAt.toISOString()
        : null,
    },
  );
}

function clientKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const candidate =
    forwarded?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    "unknown";
  return candidate.slice(0, 64);
}

export async function POST(request: Request): Promise<Response> {
  const declaredLength = request.headers.get("content-length");
  if (declaredLength && Number(declaredLength) > MAX_BODY_CHARS) {
    return jsonError("Request body is too large.", 413);
  }

  const raw = await request.text();
  if (raw.length > MAX_BODY_CHARS) {
    return jsonError("Request body is too large.", 413);
  }

  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    return jsonError("Expected a valid JSON body.", 400);
  }

  const parsed = storyRequestSchema.safeParse(payload);
  if (!parsed.success) {
    return jsonError("Provide a valid GitHub owner and repo.", 400);
  }

  const { owner, repo, refresh } = parsed.data;
  const ip = clientKey(request);

  if (refresh) {
    const decision = await getRefreshLimiter().check(
      `${ip}:${owner}/${repo}`,
    );
    if (!decision.allowed) return rateLimitError(decision, "refresh");
  }

  try {
    const snapshot = refresh
      ? await refreshRepoStoryData(owner, repo)
      : await loadRepoStoryData(owner, repo);

    const key = narrativeKey(owner, repo, snapshot.headSha);
    if (!refresh) {
      const cached = await getCached<string>(key);
      if (cached && typeof cached.value === "string" && cached.value.length > 0) {
        return cachedStoryResponse(cached.value, cached.cachedAt);
      }
    }

    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim()) {
      return jsonError(
        "Story generation is not configured. Add GOOGLE_GENERATIVE_AI_API_KEY.",
        503,
      );
    }

    const minuteDecision = await getStoryMinuteLimiter().check(ip);
    if (!minuteDecision.allowed) return rateLimitError(minuteDecision, "minute");

    const dailyDecision = await getStoryDailyLimiter().check(ip);
    if (!dailyDecision.allowed) return rateLimitError(dailyDecision, "daily");

    const insights = analyzeRepo(snapshot.commits, snapshot.pullRequests);
    const prompt = buildStoryInput(
      insights,
      snapshot.commits,
      snapshot.pullRequests,
    );

    return streamStoryResponse({
      prompt,
      signal: request.signal,
      cacheKey: key,
      cacheStatus: refresh ? "BYPASS" : "MISS",
    });
  } catch (error) {
    if (error instanceof RepoNotFoundError) {
      return jsonError(error.message, 404);
    }
    if (error instanceof RateLimitError) {
      const retryAfter = error.resetAt
        ? Math.max(1, Math.ceil((error.resetAt.getTime() - Date.now()) / 1000))
        : 60;
      return jsonError(error.message, 429, {
        "Retry-After": String(retryAfter),
      });
    }
    return jsonError("Could not load history for narration.", 500);
  }
}
