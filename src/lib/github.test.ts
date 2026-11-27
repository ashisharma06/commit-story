import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  EmptyRepoError,
  fetchCommits,
  fetchLanguages,
  fetchMergedPullRequests,
  fetchRepoMetadata,
  fetchRepoStoryData,
  getUserRepos,
  GithubUnavailableError,
  PrivateRepoError,
  RateLimitError,
  RepoNotFoundError,
  UserNotFoundError,
} from "@/lib/github";

const mocks = vi.hoisted(() => ({
  reposGet: vi.fn(),
  getCommit: vi.fn(),
  listCommits: vi.fn(),
  pullsList: vi.fn(),
  listContributors: vi.fn(),
  listLanguages: vi.fn(),
  listForUser: vi.fn(),
  listForOrg: vi.fn(),
  usersGetByUsername: vi.fn(),
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
        getCommit: mocks.getCommit,
        listCommits: mocks.listCommits,
        listContributors: mocks.listContributors,
        listLanguages: mocks.listLanguages,
        listForUser: mocks.listForUser,
        listForOrg: mocks.listForOrg,
      },
      users: { getByUsername: mocks.usersGetByUsername },
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

type RawUserRepo = {
  name: string;
  description: string | null;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  fork: boolean;
  pushed_at: string | null;
  archived: boolean;
  private: boolean;
};

function userProfile(type = "User") {
  return {
    login: "octocat",
    name: "The Octocat",
    avatar_url: "https://avatars.githubusercontent.com/u/583231?v=4",
    public_repos: 8,
    bio: "A mascot",
    type,
  };
}

function userRepo(
  name: string,
  pushedAt: string | null,
  overrides: Partial<RawUserRepo> = {},
): RawUserRepo {
  return {
    name,
    description: `Description for ${name}`,
    language: "TypeScript",
    stargazers_count: 10,
    forks_count: 2,
    fork: false,
    pushed_at: pushedAt,
    archived: false,
    private: false,
    ...overrides,
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

  it("maps network failures to GithubUnavailableError", async () => {
    mocks.reposGet.mockRejectedValue(new TypeError("fetch failed"));

    await expect(
      fetchRepoMetadata("octocat", "Hello-World"),
    ).rejects.toBeInstanceOf(GithubUnavailableError);
  });

  it("rejects private repositories before building a story", async () => {
    mocks.reposGet.mockResolvedValue({
      data: { ...metadata, private: true },
    });

    await expect(
      fetchRepoMetadata("octocat", "Hello-World"),
    ).rejects.toBeInstanceOf(PrivateRepoError);
  });

  it("rejects repositories with no commits before building a story", async () => {
    mocks.reposGet.mockResolvedValue({ data: metadata });
    mocks.paginateIterator
      .mockReturnValueOnce(pageOf([]))
      .mockReturnValueOnce(pageOf([]))
      .mockReturnValueOnce(pageOf([]));
    mocks.listLanguages.mockResolvedValue({ data: {} });

    await expect(
      fetchRepoStoryData("octocat", "Hello-World"),
    ).rejects.toBeInstanceOf(EmptyRepoError);
  });

  it("paginates commits, stops at the cap, and attaches file counts", async () => {
    mocks.paginateIterator.mockReturnValue(
      pageOf([commit("aaa1111"), commit("bbb2222"), commit("ccc3333")]),
    );
    mocks.getCommit.mockImplementation(
      async ({ ref }: { ref: string }) => ({
        data: { stats: { total: ref === "aaa1111" ? 12 : 4 } },
      }),
    );

    const commits = await fetchCommits("octocat", "Hello-World", 2);

    expect(commits.map((entry) => entry.sha)).toEqual(["aaa1111", "bbb2222"]);
    expect(commits[0]?.filesChanged).toBe(12);
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

  it("fetches public repos and sorts them by most recently pushed", async () => {
    mocks.usersGetByUsername.mockResolvedValue({ data: userProfile() });
    mocks.paginateIterator.mockReturnValue(
      pageOf([
        userRepo("older", "2024-01-01T00:00:00Z"),
        userRepo("newer", "2025-01-01T00:00:00Z"),
        userRepo("private", "2026-01-01T00:00:00Z", { private: true }),
        userRepo("never", null),
      ]),
    );

    const result = await getUserRepos("octocat");

    expect(result.profile).toEqual({
      login: "octocat",
      name: "The Octocat",
      avatar_url: "https://avatars.githubusercontent.com/u/583231?v=4",
      public_repos: 8,
      bio: "A mascot",
    });
    expect(result.repos.map((entry) => entry.name)).toEqual([
      "newer",
      "older",
      "never",
    ]);
    expect(result.repos[0]).toEqual({
      name: "newer",
      description: "Description for newer",
      language: "TypeScript",
      stargazers_count: 10,
      forks_count: 2,
      fork: false,
      pushed_at: "2025-01-01T00:00:00Z",
      archived: false,
    });
    expect(mocks.usersGetByUsername).toHaveBeenCalledWith({
      username: "octocat",
    });
    expect(mocks.paginateIterator).toHaveBeenCalledWith(mocks.listForUser, {
      username: "octocat",
      type: "owner",
      sort: "pushed",
      direction: "desc",
      per_page: 100,
    });
  });

  it("uses the organization endpoint for organization accounts", async () => {
    mocks.usersGetByUsername.mockResolvedValue({
      data: userProfile("Organization"),
    });
    mocks.paginateIterator.mockReturnValue(pageOf([userRepo("next.js", null)]));

    const result = await getUserRepos("vercel");

    expect(result.repos.map((entry) => entry.name)).toEqual(["next.js"]);
    expect(mocks.paginateIterator).toHaveBeenCalledWith(mocks.listForOrg, {
      org: "vercel",
      type: "public",
      sort: "pushed",
      direction: "desc",
      per_page: 100,
    });
    expect(mocks.listForUser).not.toHaveBeenCalled();
  });

  it("caps user repositories at 200", async () => {
    mocks.usersGetByUsername.mockResolvedValue({ data: userProfile() });
    const many = Array.from({ length: 201 }, (_, index) =>
      userRepo(
        `repo-${String(index).padStart(3, "0")}`,
        new Date(Date.UTC(2025, 0, 1 + index)).toISOString(),
      ),
    );
    mocks.paginateIterator.mockReturnValue(pageOf(many));

    const result = await getUserRepos("octocat");

    expect(result.repos).toHaveLength(200);
    expect(result.repos[0]?.name).toBe("repo-199");
  });

  it("validates the username before calling GitHub", async () => {
    await expect(getUserRepos("not a user")).rejects.toBeInstanceOf(
      UserNotFoundError,
    );
    expect(mocks.usersGetByUsername).not.toHaveBeenCalled();
  });

  it("maps a missing user to UserNotFoundError", async () => {
    mocks.usersGetByUsername.mockRejectedValue({
      status: 404,
      message: "Not Found",
      response: { headers: {} },
    });

    await expect(getUserRepos("ghost")).rejects.toBeInstanceOf(
      UserNotFoundError,
    );
  });

  it("maps user rate limits to RateLimitError with reset time", async () => {
    mocks.usersGetByUsername.mockRejectedValue({
      status: 403,
      message: "API rate limit exceeded",
      response: {
        headers: {
          "x-ratelimit-remaining": "0",
          "x-ratelimit-reset": "1700000000",
        },
      },
    });

    const error = await getUserRepos("octocat").catch((cause: unknown) => cause);

    expect(error).toBeInstanceOf(RateLimitError);
    if (error instanceof RateLimitError) {
      expect(error.remaining).toBe(0);
      expect(error.resetAt?.toISOString()).toBe(
        new Date(1700000000 * 1000).toISOString(),
      );
    }
  });

  it("rejects malformed user profile responses", async () => {
    mocks.usersGetByUsername.mockResolvedValue({ data: { login: "octocat" } });

    await expect(getUserRepos("octocat")).rejects.toThrow();
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
