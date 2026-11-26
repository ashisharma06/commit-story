import { Octokit } from "@octokit/rest";
import { z } from "zod";
import { parseRepoInput } from "@/lib/repo";

const MAX_COMMITS = 1000;
const MAX_PULL_REQUESTS = 500;
const MAX_CONTRIBUTORS = 100;
const MAX_COMMIT_DETAILS = 100;
const DETAIL_CONCURRENCY = 10;
const PER_PAGE = 100;

export class RepoNotFoundError extends Error {
  constructor(
    readonly owner: string,
    readonly repo: string,
  ) {
    super(
      `Repository ${owner}/${repo} was not found. Check the name or try another repo.`,
    );
    this.name = "RepoNotFoundError";
  }
}

export class RateLimitError extends Error {
  constructor(
    readonly resetAt: Date | null,
    readonly remaining: number,
  ) {
    const when = resetAt
      ? `It resets at ${resetAt.toLocaleTimeString()}.`
      : "GitHub did not report a reset time.";
    super(
      `GitHub API rate limit reached. ${when} Add GITHUB_TOKEN to raise the limit.`,
    );
    this.name = "RateLimitError";
  }
}

type ErrorInfo = {
  status?: number;
  message?: string;
  headers?: Record<string, unknown>;
};

function readErrorInfo(error: unknown): ErrorInfo | null {
  if (typeof error !== "object" || error === null) return null;
  const source = error as Record<string, unknown>;
  const response =
    typeof source.response === "object" && source.response !== null
      ? (source.response as Record<string, unknown>)
      : {};
  const headers =
    typeof response.headers === "object" && response.headers !== null
      ? (response.headers as Record<string, unknown>)
      : undefined;

  return {
    status: typeof source.status === "number" ? source.status : undefined,
    message: typeof source.message === "string" ? source.message : undefined,
    headers,
  };
}

function readHeader(headers: Record<string, unknown> | undefined, name: string) {
  if (!headers) return undefined;
  for (const key of [name, name.toLowerCase()]) {
    const value = headers[key];
    if (typeof value === "string") return value;
  }
  return undefined;
}

function toError(
  error: unknown,
  owner: string,
  repo: string,
): Error {
  const info = readErrorInfo(error);
  if (!info) {
    return error instanceof Error
      ? error
      : new Error("Unexpected GitHub API error.");
  }

  if (info.status === 404) return new RepoNotFoundError(owner, repo);

  const remainingHeader = readHeader(info.headers, "x-ratelimit-remaining");
  const remaining = remainingHeader === undefined ? NaN : Number(remainingHeader);
  const resetHeader = readHeader(info.headers, "x-ratelimit-reset");
  const resetSeconds = resetHeader === undefined ? NaN : Number(resetHeader);
  const resetAt = Number.isFinite(resetSeconds)
    ? new Date(resetSeconds * 1000)
    : null;

  const looksRateLimited =
    (info.status === 403 || info.status === 429) &&
    (remaining === 0 || /rate limit/i.test(info.message ?? ""));
  if (looksRateLimited) return new RateLimitError(resetAt, remaining);

  return error instanceof Error ? error : new Error(info.message ?? "GitHub API error.");
}

const EXPECTED_ERROR_LOG = / - (?:403|404|429) with /;

const githubLogger = {
  debug: () => undefined,
  info: () => undefined,
  warn: (message: string) => console.warn(message),
  error: (message: string) => {
    if (EXPECTED_ERROR_LOG.test(message)) return;
    console.error(message);
  },
};

let cachedClient: { token: string | undefined; client: Octokit } | undefined;

function getClient(): Octokit {
  const token = process.env.GITHUB_TOKEN?.trim() || undefined;
  if (!cachedClient || cachedClient.token !== token) {
    cachedClient = {
      token,
      client: new Octokit({
        auth: token,
        userAgent: "commit-story",
        log: githubLogger,
      }),
    };
  }
  return cachedClient.client;
}

function assertRepo(owner: string, repo: string): void {
  const parsed = parseRepoInput(`${owner}/${repo}`);
  if (!parsed.success || parsed.repo.owner !== owner || parsed.repo.repo !== repo) {
    throw new RepoNotFoundError(owner, repo);
  }
}

async function request<T>(
  operation: () => Promise<T>,
  owner: string,
  repo: string,
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    throw toError(error, owner, repo);
  }
}

async function collect<T>(
  pages: AsyncIterable<{ data: readonly unknown[] }>,
  cap: number,
  parse: (item: unknown) => T,
): Promise<T[]> {
  const results: T[] = [];
  for await (const page of pages) {
    for (const item of page.data) {
      results.push(parse(item));
      if (results.length >= cap) return results;
    }
  }
  return results;
}

const metadataSchema = z
  .object({
    name: z.string(),
    full_name: z.string(),
    description: z.string().nullable(),
    html_url: z.string().url(),
    default_branch: z.string(),
    created_at: z.string(),
    updated_at: z.string(),
    pushed_at: z.string().nullable(),
    stargazers_count: z.number().int().nonnegative(),
    forks_count: z.number().int().nonnegative(),
    open_issues_count: z.number().int().nonnegative(),
    archived: z.boolean(),
    private: z.boolean(),
    language: z.string().nullable(),
  })
  .transform((data) => ({
    name: data.name,
    fullName: data.full_name,
    description: data.description,
    url: data.html_url,
    defaultBranch: data.default_branch,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    pushedAt: data.pushed_at,
    stars: data.stargazers_count,
    forks: data.forks_count,
    openIssues: data.open_issues_count,
    archived: data.archived,
    private: data.private,
    language: data.language,
  }));

const commitSchema = z
  .object({
    sha: z.string(),
    html_url: z.string().url(),
    commit: z.object({
      message: z.string(),
      author: z
        .object({ name: z.string(), date: z.string() })
        .nullable(),
    }),
    author: z.object({ login: z.string() }).nullable(),
    parents: z.array(z.object({ sha: z.string() })),
    stats: z
      .object({ total: z.number().int().nonnegative() })
      .nullable()
      .optional(),
    files: z
      .array(z.object({ changes: z.number().int().nonnegative() }))
      .optional(),
  })
  .transform((data) => ({
    sha: data.sha,
    url: data.html_url,
    message: data.commit.message,
    date: data.commit.author?.date ?? "",
    authorName: data.commit.author?.name ?? "unknown",
    authorLogin: data.author?.login ?? null,
    isMerge: data.parents.length > 1,
    filesChanged:
      data.stats?.total ??
      data.files?.reduce((sum, file) => sum + file.changes, 0),
  }));

const commitDetailSchema = z
  .object({
    stats: z
      .object({ total: z.number().int().nonnegative() })
      .nullable()
      .optional(),
  })
  .transform((data) => data.stats?.total);

const pullRequestSchema = z
  .object({
    number: z.number().int(),
    title: z.string(),
    created_at: z.string(),
    merged_at: z.string().nullable(),
    html_url: z.string().url(),
    user: z.object({ login: z.string() }).nullable(),
  })
  .transform((data) => ({
    number: data.number,
    title: data.title,
    createdAt: data.created_at,
    mergedAt: data.merged_at,
    url: data.html_url,
    authorLogin: data.user?.login ?? null,
  }));

const contributorSchema = z
  .object({
    login: z.string().nullable(),
    avatar_url: z.string().url().nullable(),
    html_url: z.string().url().nullable(),
    contributions: z.number().int().nonnegative(),
    type: z.string().optional(),
  })
  .transform((data) => ({
    login: data.login ?? "unknown",
    avatarUrl: data.avatar_url,
    url: data.html_url,
    contributions: data.contributions,
    type: data.type ?? "User",
  }));

const languagesSchema = z.record(z.string(), z.number().int().nonnegative());

export type RepoMetadata = z.infer<typeof metadataSchema>;
export type CommitSummary = z.infer<typeof commitSchema>;
export type PullRequestSummary = z.infer<typeof pullRequestSchema>;
export type MergedPullRequest = Omit<PullRequestSummary, "mergedAt"> & {
  mergedAt: string;
};
export type ContributorSummary = z.infer<typeof contributorSchema>;
export type LanguageSummary = {
  name: string;
  bytes: number;
  share: number;
};
export type RepoStoryData = {
  metadata: RepoMetadata;
  commits: CommitSummary[];
  pullRequests: MergedPullRequest[];
  contributors: ContributorSummary[];
  languages: LanguageSummary[];
};

function perPage(cap: number): number {
  return Math.min(Math.max(Math.floor(cap), 1), PER_PAGE);
}

async function mergeCommitDetails(
  client: Octokit,
  owner: string,
  repo: string,
  commits: CommitSummary[],
): Promise<CommitSummary[]> {
  const candidates = commits.slice(0, MAX_COMMIT_DETAILS);
  const details = new Map<string, number>();

  for (let index = 0; index < candidates.length; index += DETAIL_CONCURRENCY) {
    const batch = candidates.slice(index, index + DETAIL_CONCURRENCY);
    const results = await Promise.all(
      batch.map(async (commit) => {
        try {
          const { data } = await client.rest.repos.getCommit({
            owner,
            repo,
            ref: commit.sha,
          });
          return { sha: commit.sha, filesChanged: commitDetailSchema.parse(data) };
        } catch {
          return { sha: commit.sha, filesChanged: undefined };
        }
      }),
    );

    for (const result of results) {
      if (result.filesChanged !== undefined) {
        details.set(result.sha, result.filesChanged);
      }
    }
  }

  return commits.map((commit) => ({
    ...commit,
    filesChanged: details.get(commit.sha) ?? commit.filesChanged,
  }));
}

export async function fetchRepoMetadata(
  owner: string,
  repo: string,
): Promise<RepoMetadata> {
  assertRepo(owner, repo);
  const client = getClient();
  const { data } = await request(
    () => client.rest.repos.get({ owner, repo }),
    owner,
    repo,
  );
  return metadataSchema.parse(data);
}

export async function fetchCommits(
  owner: string,
  repo: string,
  cap = MAX_COMMITS,
): Promise<CommitSummary[]> {
  assertRepo(owner, repo);
  const limit = Math.min(Math.max(cap, 1), MAX_COMMITS);
  const client = getClient();
  const pages = client.paginate.iterator(client.rest.repos.listCommits, {
    owner,
    repo,
    per_page: perPage(limit),
  });
  const commits = await request(
    () => collect(pages, limit, (item) => commitSchema.parse(item)),
    owner,
    repo,
  );
  return mergeCommitDetails(client, owner, repo, commits);
}

export async function fetchMergedPullRequests(
  owner: string,
  repo: string,
  cap = MAX_PULL_REQUESTS,
): Promise<MergedPullRequest[]> {
  assertRepo(owner, repo);
  const limit = Math.min(Math.max(cap, 1), MAX_PULL_REQUESTS);
  const client = getClient();
  const pages = client.paginate.iterator(client.rest.pulls.list, {
    owner,
    repo,
    state: "closed",
    sort: "updated",
    direction: "desc",
    per_page: perPage(limit),
  });
  const parsed = await request(
    () => collect(pages, limit, (item) => pullRequestSchema.parse(item)),
    owner,
    repo,
  );
  return parsed.flatMap((pr) =>
    pr.mergedAt ? [{ ...pr, mergedAt: pr.mergedAt }] : [],
  );
}

export async function fetchContributors(
  owner: string,
  repo: string,
  cap = MAX_CONTRIBUTORS,
): Promise<ContributorSummary[]> {
  assertRepo(owner, repo);
  const limit = Math.min(Math.max(cap, 1), MAX_CONTRIBUTORS);
  const client = getClient();
  const pages = client.paginate.iterator(client.rest.repos.listContributors, {
    owner,
    repo,
    per_page: perPage(limit),
  });
  return request(
    () => collect(pages, limit, (item) => contributorSchema.parse(item)),
    owner,
    repo,
  );
}

export async function fetchLanguages(
  owner: string,
  repo: string,
): Promise<LanguageSummary[]> {
  assertRepo(owner, repo);
  const client = getClient();
  const { data } = await request(
    () => client.rest.repos.listLanguages({ owner, repo }),
    owner,
    repo,
  );
  const bytesByLanguage = languagesSchema.parse(data);
  const total = Object.values(bytesByLanguage).reduce((sum, bytes) => sum + bytes, 0);
  return Object.entries(bytesByLanguage)
    .map(([name, bytes]) => ({
      name,
      bytes,
      share: total > 0 ? bytes / total : 0,
    }))
    .sort((a, b) => b.bytes - a.bytes);
}

export async function fetchRepoStoryData(
  owner: string,
  repo: string,
): Promise<RepoStoryData> {
  assertRepo(owner, repo);
  const [metadata, commits, pullRequests, contributors, languages] =
    await Promise.all([
      fetchRepoMetadata(owner, repo),
      fetchCommits(owner, repo),
      fetchMergedPullRequests(owner, repo),
      fetchContributors(owner, repo),
      fetchLanguages(owner, repo),
    ]);

  return { metadata, commits, pullRequests, contributors, languages };
}
