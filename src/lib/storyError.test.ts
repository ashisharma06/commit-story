import { describe, expect, it } from "vitest";
import {
  EmptyRepoError,
  GithubUnavailableError,
  PrivateRepoError,
  RateLimitError,
  RepoNotFoundError,
  UserNotFoundError,
} from "@/lib/github";
import { describeStoryError, describeUserError } from "@/lib/story";

describe("story error descriptions", () => {
  it("distinguishes missing, private, and empty repositories", () => {
    expect(describeStoryError(new RepoNotFoundError("octocat", "missing")).kind).toBe(
      "repo-not-found",
    );
    expect(describeStoryError(new PrivateRepoError("octocat", "secret")).kind).toBe(
      "private-repo",
    );
    expect(describeStoryError(new EmptyRepoError("octocat", "empty")).kind).toBe(
      "empty-repo",
    );
  });

  it("includes the GitHub reset time for rate limits", () => {
    const result = describeStoryError(
      new RateLimitError(new Date("2026-01-01T00:00:00Z"), 0),
    );

    expect(result.kind).toBe("rate-limited");
    expect(result.hint).toContain("2026-01-01T00:00:00.000Z");
  });

  it("uses a friendly state for outages and unknown errors", () => {
    expect(describeStoryError(new GithubUnavailableError()).title).toBe(
      "GitHub unavailable",
    );
    expect(describeStoryError(new Error("secret stack details")).message).not.toContain(
      "secret stack details",
    );
  });
});

describe("user error descriptions", () => {
  it("distinguishes missing users from outages", () => {
    expect(describeUserError(new UserNotFoundError("ghost")).kind).toBe(
      "user-not-found",
    );
    expect(describeUserError(new GithubUnavailableError()).kind).toBe(
      "unavailable",
    );
  });
});
