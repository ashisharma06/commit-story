import { afterEach, describe, expect, it } from "vitest";
import { analyzeRepo } from "@/lib/analyze";
import type { CommitSummary, MergedPullRequest } from "@/lib/github";
import {
  MAX_STORY_INPUT_CHARS,
  MAX_STORY_SIGNALS,
  buildStoryInput,
  capStoryInput,
  resolveStoryModelName,
  selectStorySignals,
} from "@/lib/llm";

function commit(overrides: Partial<CommitSummary> = {}): CommitSummary {
  return {
    sha: "1234567",
    url: "https://github.com/octocat/hello-world/commit/1234567",
    message: "first commit",
    date: "2024-01-01T00:00:00Z",
    authorName: "octocat",
    authorLogin: "octocat",
    isMerge: false,
    filesChanged: 1,
    ...overrides,
  };
}

function pullRequest(overrides: Partial<MergedPullRequest> = {}): MergedPullRequest {
  return {
    number: 1,
    title: "Add a feature",
    createdAt: "2024-01-01T00:00:00Z",
    mergedAt: "2024-01-02T00:00:00Z",
    url: "https://github.com/octocat/hello-world/pull/1",
    authorLogin: "octocat",
    ...overrides,
  };
}

const originalModel = process.env.AI_MODEL;
afterEach(() => {
  if (originalModel === undefined) delete process.env.AI_MODEL;
  else process.env.AI_MODEL = originalModel;
});

describe("resolveStoryModelName", () => {
  it("uses a default and accepts an AI_MODEL override", () => {
    delete process.env.AI_MODEL;
    expect(resolveStoryModelName()).toBe("gemini-2.5-flash");

    process.env.AI_MODEL = "google/gemini-test";
    expect(resolveStoryModelName()).toBe("gemini-test");
  });
});

describe("selectStorySignals", () => {
  it("ranks merges above ordinary commits", () => {
    const signals = selectStorySignals(
      [
        commit({ sha: "aaaaaaa", message: "regular work", filesChanged: 2 }),
        commit({
          sha: "bbbbbbb",
          message: "Merge pull request #9",
          filesChanged: 1,
          isMerge: true,
        }),
      ],
      [],
    );

    expect(signals[0]?.text).toContain("Merge pull request #9");
  });
});

describe("buildStoryInput", () => {
  it("keeps at most 40 signals and truncates long titles", () => {
    const commits = Array.from({ length: 60 }, (_, index) =>
      commit({
        sha: String(index).padStart(7, "0"),
        message: `commit ${index} ${"details ".repeat(40)}`,
        filesChanged: index,
      }),
    );
    const pullRequests = Array.from({ length: 10 }, (_, index) =>
      pullRequest({
        number: index + 1,
        title: `PR ${index} ${"details ".repeat(40)}`,
      }),
    );
    const input = buildStoryInput(
      analyzeRepo(commits, pullRequests),
      commits,
      pullRequests,
    );
    const signals = input
      .split("\n")
      .filter((line) => line.startsWith("- [commit]") || line.startsWith("- [pr]"));

    expect(signals).toHaveLength(MAX_STORY_SIGNALS);
    expect(input).toContain("…");
    expect(input).not.toContain("details ".repeat(20));
    expect(input.length).toBeLessThanOrEqual(MAX_STORY_INPUT_CHARS);
  });

  it("marks thin data for the narrator", () => {
    const commits = [commit()];
    const input = buildStoryInput(analyzeRepo(commits, []), commits, []);

    expect(input).toContain("DATA DENSITY: thin");
    expect(input).toContain("1. 2024-01-01 to 2024-01-01 | 1 commits");
  });
});

describe("capStoryInput", () => {
  it("truncates oversized prompts inside the token budget", () => {
    const capped = capStoryInput("line\n".repeat(20_000));

    expect(capped.length).toBeLessThanOrEqual(MAX_STORY_INPUT_CHARS);
    expect(capped).toContain("[input truncated to stay within budget]");
  });
});
