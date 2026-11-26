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
  ])("accepts %s", (input, owner, repo) => {
    expect(parseRepoInput(input)).toEqual({
      success: true,
      repo: { owner, repo, slug: `${owner}/${repo}` },
    });
  });

  it.each([
    [""],
    ["   "],
    ["vercel"],
    ["vercel/"],
    ["/next.js"],
    ["-vercel/next.js"],
    ["vercel-/next.js"],
    ["vercel--labs/next.js"],
    ["vercel/bad name"],
    ["vercel/next.js!/"],
    ["https://gitlab.com/vercel/next.js"],
    ["javascript:alert(1)"],
    ["https://github.com/vercel"],
    [123],
    [null],
  ])("rejects %s", (input) => {
    const result = parseRepoInput(input);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain("GitHub repo");
  });
});
