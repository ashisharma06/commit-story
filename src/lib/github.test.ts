import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  fetchCommits,
  fetchLanguages,
  fetchMergedPullRequests,
  fetchRepoMetadata,
  RateLimitError,
  RepoNotFoundError,
} from "@/lib/github";

const mocks = vi.hoisted(() => ({
  reposGet: vi.fn(),
  listCommits: vi.fn(),
  pullsList: vi.fn(),
  listContributors: vi.fn(),
  listLanguages: vi.fn(),
  paginateIterator: vi.fn(),
  octokitOptions: [] as unknown[],
}));

vi.mock("@octokit/rest", () => ({
  Octokit: class {
    constructor(options: unknown) {
      mocks.octokitOptions.push(options);
    }

    rest = {
      repos: {
        get: mocks.reposGet,
        listCommits: mocks.listCommits,
        listContributors: mocks.listContributors,
        listLanguages: mocks.listLanguages,
      },
      pulls: { list: mocks.pullsList },
    };
    paginate = { iterator: mocks.paginateIterator };
  },
}));

function pageOf<T>(items: readonly T[]) {
  return {
    async *[Symbol.asyncIterator]() {
      yield { data: items };
    },
  };
}

const metadata = {
  name: "Hello-World",
  full_name: "octocat/Hello-World",
  description: null,
  html_url: "https://github.com/octocat/Hello-World",
  default_branch: "master",
  created_at: "2011-01-26T19:01:12Z",
  updated_at: "2011-01-26T19:14:43Z",
  pushed_at: null,
  stargazers_count: 4053,
  forks_count: 7746,
  open_issues_count: 0,
  archived: false,
  private: false,
  language: null,
};

function commit(sha: string) {
  return {
    sha,
    html_url: `https://github.com/octocat/Hello-World/commit/${sha}`,
    commit: {
      message: `commit ${sha}`,
      author: { name: "The Octocat", date: "2011-01-26T19:06:43Z" },
    },
    author: { login: "octocat" },
    parents: [],
  };
}

function pullRequest(number: number, mergedAt: string | null) {
  return {
    number,
    title: `PR ${number}`,
    created_at: "2011-01-26T19:01:12Z",
    merged_at: mergedAt,
    html_url: `https://github.com/octocat/Hello-World/pull/${number}`,
    user: { login: "octocat" },
  };
}

beforeEach(() => {
  vi.resetAllMocks();
});

describe("GitHub data layer", () => {
  it("validates owner/repo before calling the API", async () => {
    await expect(fetchRepoMetadata("not a user", "Hello-World")).rejects.toBeInstanceOf(
      RepoNotFoundError,
    );
    expect(mocks.reposGet).not.toHaveBeenCalled();
  });

  it("maps metadata to the fields we need", async () => {
    mocks.reposGet.mockResolvedValue({ data: metadata });

    await expect(fetchRepoMetadata("octocat", "Hello-World")).resolves.toMatchObject({
      fullName: "octocat/Hello-World",
      url: "https://github.com/octocat/Hello-World",
      defaultBranch: "master",
      stars: 4053,
    });
  });

  it("maps 404 responses to RepoNotFoundError", async () => {
    mocks.reposGet.mockRejectedValue({
      status: 404,
      message: "Not Found",
      response: { headers: {} },
    });

    await expect(fetchRepoMetadata("octocat", "missing")).rejects.toBeInstanceOf(
      RepoNotFoundError,
    );
  });

  it("maps rate-limit responses to RateLimitError with reset time", async () => {
    mocks.reposGet.mockRejectedValue({
      status: 403,
      message: "API rate limit exceeded",
      response: {
        headers: {
          "x-ratelimit-remaining": "0",
          "x-ratelimit-reset": "1700000000",
        },
      },
    });

    const error = await fetchRepoMetadata("octocat", "Hello-World").catch(
      (cause: unknown) => cause,
    );

    expect(error).toBeInstanceOf(RateLimitError);
    if (error instanceof RateLimitError) {
      expect(error.remaining).toBe(0);
      expect(error.resetAt?.toISOString()).toBe(
        new Date(1700000000 * 1000).toISOString(),
      );
    }
  });

  it("paginates commits but stops at the requested cap", async () => {
    mocks.paginateIterator.mockReturnValue(
      pageOf([commit("aaa1111"), commit("bbb2222"), commit("ccc3333")]),
    );

    const commits = await fetchCommits("octocat", "Hello-World", 2);

    expect(commits.map((entry) => entry.sha)).toEqual(["aaa1111", "bbb2222"]);
    expect(mocks.paginateIterator).toHaveBeenCalledWith(mocks.listCommits, {
      owner: "octocat",
      repo: "Hello-World",
      per_page: 2,
    });
  });

  it("keeps only merged pull requests", async () => {
    mocks.paginateIterator.mockReturnValue(
      pageOf([
        pullRequest(1, "2011-01-27T00:00:00Z"),
        pullRequest(2, null),
      ]),
    );

    const pullRequests = await fetchMergedPullRequests("octocat", "Hello-World");

    expect(pullRequests.map((entry) => entry.number)).toEqual([1]);
    expect(pullRequests[0]?.mergedAt).toBe("2011-01-27T00:00:00Z");
  });

  it("sorts languages by bytes and computes shares", async () => {
    mocks.listLanguages.mockResolvedValue({
      data: { TypeScript: 60, JavaScript: 40 },
    });

    await expect(fetchLanguages("octocat", "Hello-World")).resolves.toEqual([
      { name: "TypeScript", bytes: 60, share: 0.6 },
      { name: "JavaScript", bytes: 40, share: 0.4 },
    ]);
  });

  it("rejects malformed API responses with Zod errors", async () => {
    mocks.listLanguages.mockResolvedValue({ data: { TypeScript: -1 } });

    await expect(fetchLanguages("octocat", "Hello-World")).rejects.toThrow();
  });

  it("silences expected GitHub error logs but keeps unexpected ones", () => {
    type OptionsWithLog = { log?: { error: (message: string) => unknown } };
    const options = mocks.octokitOptions.at(-1) as OptionsWithLog | undefined;
    const log = options?.log;
    if (!log) throw new Error("Octokit logger was not configured");

    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    try {
      log.error("GET /repos/octocat/missing - 404 with id ABC in 1ms");
      log.error("GET /repos/octocat/limited - 403 with id ABC in 1ms");
      expect(consoleError).not.toHaveBeenCalled();

      log.error("GET /repos/octocat/boom - 500 with id ABC in 1ms");
      expect(consoleError).toHaveBeenCalledOnce();
    } finally {
      consoleError.mockRestore();
    }
  });
});
