import { describe, expect, it } from "vitest";
import { storyMarkdown, type StoryMarkdownData } from "@/lib/storyMarkdown";

const data: StoryMarkdownData = {
  owner: "octocat",
  repo: "Hello-World",
  siteUrl: "https://example.com",
  title: "octocat/Hello-World: the story of a codebase",
  description: "7 commits by 3 contributors since 2011.",
  totalCommits: 7,
  totalContributors: 3,
  totalPullRequests: 2,
  yearsActive: "16 years",
  topLanguage: "JavaScript ████████░░░░ 70%",
  firstCommitAt: "2011-01-26T00:00:00Z",
  lastCommitAt: "2020-01-01T00:00:00Z",
  languages: [{ name: "JavaScript", share: 0.7 }],
};

describe("storyMarkdown", () => {
  it("includes the rendered stats, narrative, and share URL", () => {
    const markdown = storyMarkdown(data, "## Genesis\n\nIt started small.");

    expect(markdown).toContain(`# ${data.title}`);
    expect(markdown).toContain("commits: 7");
    expect(markdown).toContain("contributors: 3");
    expect(markdown).toContain("years active: 16 years");
    expect(markdown).toContain("first commit: 2011-01-26");
    expect(markdown).toContain("- JavaScript: 70%");
    expect(markdown).toContain("## Genesis");
    expect(markdown).toContain("https://example.com/story/octocat/Hello-World");
  });

  it("handles an empty narrative", () => {
    expect(storyMarkdown(data, "  ")).toContain("_No narrative available._");
  });
});
