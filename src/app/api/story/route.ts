import { analyzeRepo } from "@/lib/analyze";
import { RateLimitError, RepoNotFoundError } from "@/lib/github";
import {
  buildStoryInput,
  streamStoryResponse,
} from "@/lib/llm";
import { storyRateLimiter } from "@/lib/rateLimit";
import { repoSchema } from "@/lib/repo";
import { loadRepoHistory } from "@/lib/story";

export const maxDuration = 60;

const MAX_BODY_CHARS = 2048;
const storyRequestSchema = repoSchema.strict();

function jsonError(
  message: string,
  status: number,
  extraHeaders: Record<string, string> = {},
): Response {
  return Response.json(
    { error: message },
    { status, headers: { "Cache-Control": "no-store", ...extraHeaders } },
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

  const limit = storyRateLimiter.check(clientKey(request));
  if (!limit.allowed) {
    return jsonError(
      `Too many narrations. Try again in ${limit.retryAfterSeconds}s.`,
      429,
      { "Retry-After": String(limit.retryAfterSeconds) },
    );
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

  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim()) {
    return jsonError(
      "Story generation is not configured. Add GOOGLE_GENERATIVE_AI_API_KEY.",
      503,
    );
  }

  try {
    const { commits, pullRequests } = await loadRepoHistory(
      parsed.data.owner,
      parsed.data.repo,
    );
    const insights = analyzeRepo(commits, pullRequests);
    const prompt = buildStoryInput(insights, commits, pullRequests);

    return streamStoryResponse({ prompt, signal: request.signal });
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
