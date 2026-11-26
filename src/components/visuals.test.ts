import { describe, expect, it } from "vitest";
import { buildHeatmap, heatLevel } from "@/components/ActivityHeatmap";
import { asciiBar } from "@/components/AsciiBar";
import type { Era } from "@/lib/analyze";
import { chapterCommand } from "@/lib/chapter";

describe("asciiBar", () => {
  it("renders proportional block characters", () => {
    expect(asciiBar(8, 10, 10)).toBe("████████░░");
    expect(asciiBar(1, 4, 8)).toBe("██░░░░░░");
  });

  it("returns an empty bar for missing or zero data", () => {
    expect(asciiBar(1, 0, 6)).toBe("░░░░░░");
    expect(asciiBar(Number.NaN, 10, 6)).toBe("░░░░░░");
  });
});

describe("heatmap helpers", () => {
  it("maps commit counts to green shades without NaN", () => {
    expect(heatLevel(0)).toBe(0);
    expect(heatLevel(1)).toBe(1);
    expect(heatLevel(4)).toBe(3);
    expect(heatLevel(12)).toBe(4);
    expect(heatLevel(Number.NaN)).toBe(0);
  });

  it("builds Sunday-to-Saturday columns around the last commit", () => {
    const grid = buildHeatmap(
      [{ date: "2024-01-02", commits: 3 }],
      "2024-01-02T12:00:00Z",
      4,
    );

    expect(grid).toHaveLength(4);
    expect(grid.every((column) => column.length === 7)).toBe(true);
    expect(grid.flat().find((cell) => cell.date === "2024-01-02")?.level).toBe(
      2,
    );
    expect(grid.flat().filter((cell) => cell.future)).toHaveLength(4);
  });
});

describe("chapterCommand", () => {
  it("formats the era range as a git log command", () => {
    const era: Era = {
      index: 1,
      start: "2019-03-04T10:00:00Z",
      end: "2020-01-20T10:00:00Z",
      commitCount: 12,
      contributorCount: 2,
      topContributors: ["alice", "bob"],
    };

    expect(chapterCommand(era)).toBe(
      '$ git log --since="2019-03" --until="2020-01" --oneline | wc -l',
    );
  });
});
