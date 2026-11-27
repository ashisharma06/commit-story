import { describe, expect, it } from "vitest";
import {
  activeYears,
  asciiBar,
  formatCount,
  repoStatsDescription,
  topLanguageLabel,
  yearsLabel,
} from "@/lib/stats";
import type { RepoInsights } from "@/lib/analyze";

function insights(overrides: Partial<RepoInsights> = {}): RepoInsights {
  return {
    totalCommits: 1204,
    totalContributors: 8,
    totalPullRequests: 42,
    firstCommitAt: "2019-04-01T00:00:00.000Z",
    lastCommitAt: "2024-08-01T00:00:00.000Z",
    commitsPerWeek: [],
    busiestDayOfWeek: null,
    busiestHour: null,
    contributorLeaderboard: [],
    longestCommitStreakDays: null,
    biggestCommits: [],
    milestones: [],
    activityByDay: [],
    eras: [],
    ...overrides,
  };
}

describe("stats formatting", () => {
  it("formats counts with grouping and clamps invalid values", () => {
    expect(formatCount(1204)).toBe("1,204");
    expect(formatCount(-4)).toBe("0");
    expect(formatCount(Number.NaN)).toBe("0");
  });

  it("draws bounded ASCII bars", () => {
    expect(asciiBar(0.5, 8)).toBe("████░░░░");
    expect(asciiBar(2, 8)).toBe("████████");
    expect(asciiBar(-1, 8)).toBe("░░░░░░░░");
  });

  it("counts active years inclusively", () => {
    expect(activeYears("2019-01-01T00:00:00Z", "2021-01-01T00:00:00Z")).toBe(3);
    expect(yearsLabel(1)).toBe("1 year");
    expect(yearsLabel(null)).toBe("unknown");
  });

  it("builds a real-stats description", () => {
    expect(repoStatsDescription(insights())).toBe(
      "1,204 commits by 8 contributors since 2019.",
    );
  });

  it("labels the top language with a bar", () => {
    expect(topLanguageLabel([{ name: "TypeScript", bytes: 80, share: 0.8 }])).toBe(
      "TypeScript ██████████░░ 80%",
    );
    expect(topLanguageLabel([])).toBe("unknown ░░░░░░░░░░░░ 0%");
  });
});
