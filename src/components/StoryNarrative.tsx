import { ActivityHeatmap } from "@/components/ActivityHeatmap";
import { AsciiBar } from "@/components/AsciiBar";
import { Chapter } from "@/components/Chapter";
import { CommitsOverTime } from "@/components/CommitsOverTime";
import { GitGraph } from "@/components/GitGraph";
import { StoryKeyboard } from "@/components/StoryKeyboard";
import type { Era, MilestoneCommit, RepoInsights } from "@/lib/analyze";

function inEra(date: string, era: Era): boolean {
  const time = Date.parse(date);
  if (!Number.isFinite(time)) return false;
  const start = era.start ? Date.parse(era.start) : Number.NaN;
  const end = era.end ? Date.parse(era.end) : Number.NaN;
  if (Number.isFinite(start) && time < start) return false;
  if (Number.isFinite(end) && time > end) return false;
  return true;
}

function ChapterOutput({
  milestones,
}: {
  milestones: readonly MilestoneCommit[];
}) {
  if (milestones.length === 0) {
    return <p className="text-xs text-muted">no commits recorded</p>;
  }

  return (
    <ul className="space-y-1 text-xs leading-6">
      {milestones.map((commit) => (
        <li key={commit.sha} className="flex gap-3">
          <span className="shrink-0 text-warning">
            {commit.sha.slice(0, 7)}
          </span>
          <span className="min-w-0 flex-1 truncate text-text">
            {commit.message}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function StoryNarrative({ insights }: { insights: RepoInsights }) {
  const leaderboard = insights.contributorLeaderboard.slice(0, 5);
  const maxCommits = leaderboard[0]?.commits ?? 0;

  return (
    <StoryKeyboard chapterCount={insights.eras.length}>
      <div className="space-y-10">
        <div className="space-y-8">
          <ActivityHeatmap
            days={insights.activityByDay}
            lastActivityAt={insights.lastCommitAt}
          />
          <CommitsOverTime weeks={insights.commitsPerWeek} />

          <div>
            <p className="mb-4 text-xs tracking-[0.18em] text-muted uppercase">
              {"// contributor leaderboard"}
            </p>
            {leaderboard.length === 0 ? (
              <p className="text-sm text-muted">no contributors recorded</p>
            ) : (
              <div className="space-y-2">
                {leaderboard.map((entry) => (
                  <AsciiBar
                    key={entry.login}
                    label={entry.login}
                    value={entry.commits}
                    max={maxCommits}
                    width={10}
                    detail={`${entry.commits} · ${Math.round(entry.share * 100)}%`}
                    percent={Math.round(entry.share * 100)}
                  />
                ))}
              </div>
            )}
          </div>

          <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm sm:grid-cols-4">
            <div>
              <dt className="text-xs text-muted">busiest day</dt>
              <dd className="mt-1 text-accent">
                {insights.busiestDayOfWeek?.label ?? "n/a"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted">busiest hour</dt>
              <dd className="mt-1 text-accent">
                {insights.busiestHour?.label ?? "n/a"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted">longest streak</dt>
              <dd className="mt-1 text-accent">
                {insights.longestCommitStreakDays === null
                  ? "n/a"
                  : `${insights.longestCommitStreakDays} days`}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted">milestones</dt>
              <dd className="mt-1 text-accent">{insights.milestones.length}</dd>
            </div>
          </dl>
        </div>

        <GitGraph commits={insights.milestones} />

        <div className="space-y-8">
          <p className="text-xs tracking-[0.18em] text-muted uppercase">
            {"// chapters"}
          </p>
          {insights.eras.map((era, index) => (
            <Chapter key={era.index} era={era} index={index + 1}>
              <ChapterOutput
                milestones={insights.milestones.filter((commit) =>
                  inEra(commit.date, era),
                )}
              />
            </Chapter>
          ))}
        </div>
      </div>
    </StoryKeyboard>
  );
}
