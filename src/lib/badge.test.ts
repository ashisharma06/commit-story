import { describe, expect, it } from "vitest";
import {
  badgeSvg,
  commitBadgeSvg,
  escapeXml,
  neutralBadgeSvg,
} from "@/lib/badge";

describe("badge svg", () => {
  it("escapes XML text", () => {
    expect(escapeXml(`<a & "b">`)).toBe("&lt;a &amp; &quot;b&quot;&gt;");
  });

  it("uses terminal colors and includes the commit count", () => {
    const svg = commitBadgeSvg(1204);
    expect(svg).toContain("#12161b");
    expect(svg).toContain("#7CFFB2");
    expect(svg).toContain("1,204 commits");
  });

  it("returns a neutral badge on errors", () => {
    expect(neutralBadgeSvg()).toContain("stats unavailable");
  });

  it("stays well under 2KB", () => {
    expect(badgeSvg("commit story | 999,999,999 commits").length).toBeLessThan(
      2048,
    );
  });
});
