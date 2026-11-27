import type { ActivityDay } from "@/lib/analyze";

const DAY_MS = 86_400_000;
const MONTHS = [
  "JAN",
  "FEB",
  "MAR",
  "APR",
  "MAY",
  "JUN",
  "JUL",
  "AUG",
  "SEP",
  "OCT",
  "NOV",
  "DEC",
] as const;

export type HeatCell = {
  date: string;
  commits: number;
  level: number;
  future: boolean;
};

export function heatLevel(count: number): number {
  if (!Number.isFinite(count) || count <= 0) return 0;
  if (count === 1) return 1;
  if (count <= 3) return 2;
  if (count <= 7) return 3;
  return 4;
}

function utcDay(value: string): number {
  const time = Date.parse(`${value.slice(0, 10)}T00:00:00Z`);
  return Number.isFinite(time) ? time : Number.NaN;
}

export function buildHeatmap(
  days: readonly ActivityDay[],
  lastActivityAt: string | null,
  weeks = 26,
): HeatCell[][] {
  const end = utcDay(lastActivityAt ?? "");
  if (!Number.isFinite(end)) return [];

  const columns = Math.max(1, Math.floor(weeks));
  const endDay = new Date(end).getUTCDay();
  const gridEnd = end + (6 - endDay) * DAY_MS;
  const gridStart = gridEnd - (columns * 7 - 1) * DAY_MS;
  const counts = new Map(days.map((day) => [day.date, day.commits]));

  return Array.from({ length: columns }, (_, column) =>
    Array.from({ length: 7 }, (_, row) => {
      const time = gridStart + (column * 7 + row) * DAY_MS;
      const date = new Date(time).toISOString().slice(0, 10);
      const commits = counts.get(date) ?? 0;
      return {
        date,
        commits,
        level: heatLevel(commits),
        future: time > end,
      };
    }),
  );
}

function cellColor(level: number): string {
  if (level === 0) return "var(--surface)";
  return `color-mix(in srgb, var(--accent) ${level * 20}%, var(--surface))`;
}

function monthLabels(grid: readonly HeatCell[][]): string[] {
  return grid.map((column, index) => {
    const midweek = column[3]?.date;
    if (!midweek) return "";
    const month = MONTHS[new Date(`${midweek}T00:00:00Z`).getUTCMonth()];
    const previous = grid[index - 1]?.[3]?.date;
    const previousMonth = previous
      ? MONTHS[new Date(`${previous}T00:00:00Z`).getUTCMonth()]
      : "";
    return month === previousMonth ? "" : month;
  });
}

export function ActivityHeatmap({
  days,
  lastActivityAt,
}: {
  days: readonly ActivityDay[];
  lastActivityAt: string | null;
}) {
  if (days.length === 0 || !lastActivityAt) {
    return (
      <div className="min-w-0">
        <p className="terminal-label mb-4 text-muted uppercase">{"// activity"}</p>
        <p className="text-sm text-muted">no commits to plot yet</p>
      </div>
    );
  }

  const grid = buildHeatmap(days, lastActivityAt);
  const labels = monthLabels(grid);
  const gridColumns = `repeat(${grid.length}, 12px)`;

  return (
    <div className="min-w-0">
      <p className="terminal-label mb-4 text-muted uppercase">{"// activity"}</p>
      <div className="scroll-fade overflow-x-auto pb-2">
        <div className="w-max min-w-full">
          <div
            className="grid gap-[3px] text-[11px] leading-[1.4] text-muted"
            style={{ gridTemplateColumns: gridColumns }}
            aria-hidden="true"
          >
            {labels.map((label, index) => (
              <span
                key={`${label}-${index}`}
                className="w-max overflow-visible whitespace-nowrap"
              >
                {label}
              </span>
            ))}
          </div>
          <div
            className="mt-1 grid grid-flow-col grid-rows-7 gap-[3px]"
            style={{ gridTemplateColumns: gridColumns }}
            role="img"
            aria-label={`Commit activity across ${grid.length} weeks`}
          >
            {grid.flat().map((cell) => (
              <span
                key={cell.date}
                title={`${cell.date}: ${cell.commits} commit${cell.commits === 1 ? "" : "s"}`}
                className="h-3 w-3 border border-border"
                style={{
                  backgroundColor: cellColor(cell.future ? 0 : cell.level),
                }}
              />
            ))}
          </div>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2 text-[11px] text-muted sm:text-xs">
        <span>less</span>
        {[0, 1, 2, 3, 4].map((level) => (
          <span
            key={level}
            aria-hidden="true"
            className="h-2.5 w-2.5 shrink-0 border border-border"
            style={{ backgroundColor: cellColor(level) }}
          />
        ))}
        <span>more</span>
      </div>
    </div>
  );
}
