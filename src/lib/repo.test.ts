import { describe, expect, it } from "vitest";
import { parseRepoInput } from "@/lib/repo";

describe("parseRepoInput", () => {
  it.each([
    ["vercel/next.js", "vercel", "next.js"],
    ["facebook/react", "facebook", "react"],
    ["  vercel/ai  ", "vercel", "ai"],
    ["https://github.com/vercel/next.js", "vercel", "next.js"],
    ["http://www.github.com/vercel/next.js/", "vercel", "next.js"],
    ["github.com/vercel/next.js", "vercel", "next.js"],
    ["https://github.com/vercel/next.js.git", "vercel", "next.js"],
    ["git@github.com:vercel/next.js.git", "vercel", "next.js"],
    ["https://github.com/vercel/next.js/tree/canary", "vercel", "next.js"],
    ["https://github.com/vercel/next.js?tab=readme", "vercel", "next.js"],
  ])("accepts repo input %s", (input, owner, repo) => {
    expect(parseRepoInput(input)).toEqual({
      kind: "repo",
      owner,
      repo,
    });
  });

  it.each([
    ["ashisharma06", "ashisharma06"],
    ["@ashisharma06", "ashisharma06"],
    ["  vercel  ", "vercel"],
    ["vercel/", "vercel"],
    ["github.com/octocat", "octocat"],
    ["https://github.com/octocat", "octocat"],
    ["http://www.github.com/octocat/", "octocat"],
    ["https://github.com/octocat?tab=repositories", "octocat"],
    ["git@github.com:octocat", "octocat"],
  ])("accepts user input %s", (input, username) => {
    expect(parseRepoInput(input)).toEqual({
      kind: "user",
      username,
    });
  });

  it.each([
    [""],
    ["   "],
    ["-vercel"],
    ["vercel-"],
    ["vercel--labs"],
    ["a".repeat(40)],
    ["/next.js"],
    ["-vercel/next.js"],
    ["vercel-/next.js"],
    ["vercel--labs/next.js"],
    ["vercel/bad name"],
    ["vercel/next.js!/"],
    ["https://gitlab.com/vercel/next.js"],
    ["javascript:alert(1)"],
    ["https://github.com/vercel/bad name/extra_repo"],
    [123],
    [null],
  ])("rejects %s", (input) => {
    const result = parseRepoInput(input);
    expect(result).toHaveProperty("error");
    if ("error" in result) expect(result.error).toContain("GitHub");
  });
});
