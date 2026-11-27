import {
  EMPTY_HEAD_SHA,
  HEAD_CACHE_TTL_SECONDS,
  NARRATIVE_CACHE_TTL_SECONDS,
  REPO_CACHE_TTL_SECONDS,
  USER_REPOS_CACHE_TTL_SECONDS,
  deleteCachedKeys,
  getCached,
  narrativeKey,
  repoDataKey,
  repoHeadKey,
  setCached,
  userReposKey,
} from "@/lib/cache";
import {
  fetchLatestCommitSha,
  fetchRepoStoryData,
  getUserRepos,
  RateLimitError,
  RepoNotFoundError,
  type RepoStoryData,
  type UserReposData,
} from "@/lib/github";

export type RepoStorySnapshot = RepoStoryData & {
  headSha: string;
  cachedAt: string;
};

export type UserReposSnapshot = UserReposData & {
  cachedAt: string;
};

export type StoryLoadError = { message: string; hint?: string };

/** Short-lived pointer so full repo data only refetches when HEAD changes. */
export async function resolveHeadSha(
  owner: string,
  repo: string,
): Promise<string> {
  const key = repoHeadKey(owner, repo);
  const cached = await getCached<string>(key);
  if (cached) return cached.value;

  const sha = await fetchLatestCommitSha(owner, repo);
  const resolved = sha ?? EMPTY_HEAD_SHA;
  await setCached(key, resolved, HEAD_CACHE_TTL_SECONDS);
  return resolved;
}

export async function loadRepoStoryData(
  owner: string,
  repo: string,
): Promise<RepoStorySnapshot> {
  const headSha = await resolveHeadSha(owner, repo);
  const key = repoDataKey(owner, repo, headSha);
  const cached = await getCached<RepoStoryData>(key);
  if (cached) {
    return { ...cached.value, headSha, cachedAt: cached.cachedAt };
  }

  const data = await fetchRepoStoryData(owner, repo);
  const actualHeadSha = data.commits[0]?.sha ?? headSha;
  const writeKey =
    actualHeadSha === headSha ? key : repoDataKey(owner, repo, actualHeadSha);
  const cachedAt = await setCached(writeKey, data, REPO_CACHE_TTL_SECONDS);

  if (actualHeadSha !== headSha) {
    await Promise.all([
      setCached(
        repoHeadKey(owner, repo),
        actualHeadSha,
        HEAD_CACHE_TTL_SECONDS,
      ),
      deleteCachedKeys([key]),
    ]);
  }

  return { ...data, headSha: actualHeadSha, cachedAt };
}

/** Bypasses cached repo data and drops stale keys for the previous HEAD. */
export async function refreshRepoStoryData(
  owner: string,
  repo: string,
): Promise<RepoStorySnapshot> {
  const [previousHead, latestSha] = await Promise.all([
    getCached<string>(repoHeadKey(owner, repo)),
    fetchLatestCommitSha(owner, repo),
  ]);
  const resolved = latestSha ?? EMPTY_HEAD_SHA;

  const data = await fetchRepoStoryData(owner, repo);
  const actualHeadSha = data.commits[0]?.sha ?? resolved;

  const staleKeys = [previousHead?.value, resolved]
    .filter((sha): sha is string => Boolean(sha) && sha !== actualHeadSha)
    .flatMap((sha) => [
      repoDataKey(owner, repo, sha),
      narrativeKey(owner, repo, sha),
    ]);

  const cachedAt = await setCached(
    repoDataKey(owner, repo, actualHeadSha),
    data,
    REPO_CACHE_TTL_SECONDS,
  );
  await Promise.all([
    setCached(
      repoHeadKey(owner, repo),
      actualHeadSha,
      HEAD_CACHE_TTL_SECONDS,
    ),
    deleteCachedKeys(staleKeys),
  ]);

  return { ...data, headSha: actualHeadSha, cachedAt };
}

export async function loadNarrativeCachedAt(
  owner: string,
  repo: string,
  headSha: string,
): Promise<string | null> {
  const cached = await getCached<string>(
    narrativeKey(owner, repo, headSha),
  );
  return cached?.cachedAt ?? null;
}

export { NARRATIVE_CACHE_TTL_SECONDS };

export async function loadCachedUserRepos(
  username: string,
): Promise<UserReposSnapshot> {
  const key = userReposKey(username);
  const cached = await getCached<UserReposData>(key);
  if (cached) {
    return { ...cached.value, cachedAt: cached.cachedAt };
  }

  const data = await getUserRepos(username);
  const cachedAt = await setCached(key, data, USER_REPOS_CACHE_TTL_SECONDS);
  return { ...data, cachedAt };
}

export function describeStoryError(error: unknown): StoryLoadError {
  if (error instanceof RepoNotFoundError) {
    return { message: error.message };
  }
  if (error instanceof RateLimitError) {
    return {
      message: error.message,
      hint: `reset: ${error.resetAt?.toISOString() ?? "unknown"} · remaining: ${error.remaining}`,
    };
  }
  if (error instanceof Error) {
    return { message: `Unexpected error: ${error.message}` };
  }
  return { message: "Unexpected GitHub error." };
}
