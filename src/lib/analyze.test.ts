import { describe, expect, it } from "vitest";
import type { CommitSummary, MergedPullRequest } from "@/lib/github";
import {
  analyzeRepo,
  biggestCommits,
  busiestDayOfWeek,
  busiestHour,
  commitsPerWeek,
  contributorLeaderboard,
  formatInsights,
  longestCommitStreak,
  splitEras,
} from "@/lib/analyze";

type CommitOptions = {
  sha: string;
  date: string;
  author?: string;
  filesChanged?: number;
  message?: string;
};

function commit(options: CommitOptions): CommitSummary {
  const author = options.author ?? options.sha;
  return {
    sha: options.sha,
    url: `https://github.com/octocat/Hello-World/commit/${options.sha}`,
    message: options.message ?? `commit ${options.sha}`,
    date: options.date,
    authorName: author,
    authorLogin: author,
    isMerge: false,
    filesChanged: options.filesChanged,
  };
}

function pullRequest(number: number): MergedPullRequest {
  return {
    number,
    title: `PR ${number}`,
    createdAt: "2024-01-01T00:00:00Z",
    mergedAt: "2024-01-02T00:00:00Z",
    url: `https://github.com/octocat/Hello-World/pull/${number}`,
    authorLogin: "alice",
  };
}

describe("analyzeRepo", () => {
  it("returns safe nulls and one era for zero commits", () => {
    const insights = analyzeRepo([], []);

    expect(insights.totalCommits).toBe(0);
    expect(insights.totalContributors).toBe(0);
    expect(insights.eras).toHaveLength(1);
    expect(insights.eras[0]).toMatchObject({
      start: null,
      end: null,
      commitCount: 0,
      contributorCount: 0,
    });
    expect(insights.busiestDayOfWeek).toBeNull();
    expect(insights.busiestHour).toBeNull();
    expect(insights.longestCommitStreakDays).toBeNull();
    expect(insights.biggestCommits).toEqual([]);
    expect(insights.commitsPerWeek).toEqual([]);
    expect(insights.contributorLeaderboard).toEqual([]);
    expect(formatInsights(insights)).toContain("n/a");
    expect(formatInsights(insights)).not.toContain("NaN");
  });

  it("returns safe nulls and one era for one commit", () => {
    const only = commit({
      sha: "a111111",
      date: "2024-01-01T10:00:00Z",
      author: "alice",
      filesChanged: 5,
    });
    const insights = analyzeRepo([only], [pullRequest(1)]);

    expect(insights.totalCommits).toBe(1);
    expect(insights.totalPullRequests).toBe(1);
    expect(insights.eras).toHaveLength(1);
    expect(insights.eras[0]).toMatchObject({
      start: only.date,
      end: only.date,
      commitCount: 1,
      contributorCount: 1,
    });
    expect(insights.busiestDayOfWeek).toBeNull();
    expect(insights.busiestHour).toBeNull();
    expect(insights.longestCommitStreakDays).toBeNull();
    expect(insights.biggestCommits).toEqual([]);
    expect(insights.contributorLeaderboard).toEqual([
      { login: "alice", commits: 1, share: 1 },
    ]);
  });

  it("handles a single contributor with one era", () => {
    const commits = [
      commit({ sha: "a", date: "2024-01-01T09:00:00Z", author: "alice" }),
      commit({ sha: "b", date: "2024-01-02T09:00:00Z", author: "alice" }),
      commit({ sha: "c", date: "2024-01-03T09:00:00Z", author: "alice" }),
    ];

    expect(contributorLeaderboard(commits)).toEqual([
      { login: "alice", commits: 3, share: 1 },
    ]);
    expect(splitEras(commits)).toHaveLength(1);
    expect(commitsPerWeek(commits)).toEqual([
      { weekStart: "2024-01-01", commits: 3 },
    ]);
  });

  it("splits eras around a big gap in the middle", () => {
    const commits = [
      commit({ sha: "a", date: "2024-01-01T09:00:00Z", author: "alice" }),
      commit({ sha: "b", date: "2024-01-02T09:00:00Z", author: "alice" }),
      commit({ sha: "c", date: "2024-03-01T09:00:00Z", author: "bob" }),
      commit({ sha: "d", date: "2024-03-02T09:00:00Z", author: "bob" }),
    ];

    const eras = splitEras(commits);

    expect(eras).toHaveLength(2);
    expect(eras[0]).toMatchObject({ commitCount: 2, contributorCount: 1 });
    expect(eras[1]).toMatchObject({ commitCount: 2, contributorCount: 1 });
    expect(eras[0]?.topContributors).toEqual(["alice"]);
    expect(eras[1]?.topContributors).toEqual(["bob"]);
  });

  it("computes weekly buckets, busiest day/hour, and streak", () => {
    const commits = [
      commit({ sha: "a", date: "2024-01-01T09:00:00Z", author: "alice" }),
      commit({ sha: "b", date: "2024-01-01T14:00:00Z", author: "bob" }),
      commit({ sha: "c", date: "2024-01-02T09:00:00Z", author: "alice" }),
      commit({ sha: "d", date: "2024-01-04T09:00:00Z", author: "carol" }),
    ];

    expect(busiestDayOfWeek(commits)).toEqual({ label: "Monday", commits: 2 });
    expect(busiestHour(commits)).toEqual({ label: "09:00 UTC", commits: 3 });
    expect(longestCommitStreak(commits)).toBe(2);
    expect(commitsPerWeek(commits)).toEqual([
      { weekStart: "2024-01-01", commits: 4 },
    ]);
  });

  it("ranks biggest commits but ignores a huge first upload commit", () => {
    const commits = [
      commit({
        sha: "upload",
        date: "2023-01-01T09:00:00Z",
        filesChanged: 500,
        message: "Initial upload",
      }),
      commit({ sha: "small", date: "2023-02-01T09:00:00Z", filesChanged: 30 }),
      commit({ sha: "large", date: "2023-03-01T09:00:00Z", filesChanged: 120 }),
      commit({ sha: "medium", date: "2023-04-01T09:00:00Z", filesChanged: 80 }),
    ];

    expect(biggestCommits(commits).map((entry) => entry.sha)).toEqual([
      "large",
      "medium",
      "small",
    ]);
  });

  it("splits on contributor mix changes and caps eras at six", () => {
    const mixChange = [
      commit({ sha: "a", date: "2024-01-01T09:00:00Z", author: "alice" }),
      commit({ sha: "b", date: "2024-01-01T10:00:00Z", author: "alice" }),
      commit({ sha: "c", date: "2024-01-01T11:00:00Z", author: "alice" }),
      commit({ sha: "d", date: "2024-01-01T12:00:00Z", author: "alice" }),
      commit({ sha: "e", date: "2024-01-01T13:00:00Z", author: "bob" }),
      commit({ sha: "f", date: "2024-01-01T14:00:00Z", author: "bob" }),
      commit({ sha: "g", date: "2024-01-01T15:00:00Z", author: "bob" }),
      commit({ sha: "h", date: "2024-01-01T16:00:00Z", author: "bob" }),
    ];

    expect(splitEras(mixChange)).toHaveLength(2);

    const many = Array.from({ length: 300 }, (_, index) =>
      commit({
        sha: `c${index}`,
        date: new Date(Date.UTC(2020, 0, 1 + index)).toISOString(),
        author: index < 100 ? "alice" : index < 200 ? "bob" : "carol",
      }),
    );

    const eras = splitEras(many);
    expect(eras.length).toBeGreaterThanOrEqual(2);
    expect(eras.length).toBeLessThanOrEqual(6);
    expect(eras.reduce((sum, era) => sum + era.commitCount, 0)).toBe(300);
  });

  it("ignores invalid dates without producing NaN", () => {
    const insights = analyzeRepo(
      [
        commit({ sha: "bad", date: "not-a-date", author: "alice" }),
        commit({ sha: "good", date: "2024-01-01T09:00:00Z", author: "bob" }),
        commit({ sha: "also-good", date: "2024-01-02T09:00:00Z", author: "bob" }),
      ],
      [],
    );

    expect(insights.firstCommitAt).toBe("2024-01-01T09:00:00Z");
    expect(insights.lastCommitAt).toBe("2024-01-02T09:00:00Z");
    expect(formatInsights(insights)).not.toContain("NaN");
  });
});
