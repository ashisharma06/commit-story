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
    return <p className="text-sm text-muted">no commits recorded</p>;
  }

  return (
    <ul className="min-w-0 space-y-1 text-sm leading-relaxed">
      {milestones.map((commit) => (
        <li key={commit.sha} className="flex min-w-0 gap-3">
          <span className="shrink-0 text-warning">
            {commit.sha.slice(0, 7)}
          </span>
          <span
            title={commit.message}
            className="min-w-0 flex-1 truncate text-text"
          >
            {commit.message}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function StoryVisuals({ insights }: { insights: RepoInsights }) {
  const leaderboard = insights.contributorLeaderboard.slice(0, 5);
  const maxCommits = leaderboard[0]?.commits ?? 0;

  return (
    <StoryKeyboard chapterCount={insights.eras.length}>
      <div className="min-w-0 space-y-10">
        <div className="min-w-0 space-y-8">
          <ActivityHeatmap
            days={insights.activityByDay}
            lastActivityAt={insights.lastCommitAt}
          />
          <CommitsOverTime weeks={insights.commitsPerWeek} />

          <div className="min-w-0">
            <p className="terminal-label mb-4 text-muted uppercase">
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

          <dl className="grid min-w-0 grid-cols-2 gap-x-6 gap-y-4 text-sm md:grid-cols-4">
            <div className="min-w-0">
              <dt className="terminal-label text-muted uppercase">busiest day</dt>
              <dd className="mt-1 break-words text-accent">
                {insights.busiestDayOfWeek?.label ?? "n/a"}
              </dd>
            </div>
            <div className="min-w-0">
              <dt className="terminal-label text-muted uppercase">busiest hour</dt>
              <dd className="mt-1 break-words text-accent">
                {insights.busiestHour?.label ?? "n/a"}
              </dd>
            </div>
            <div className="min-w-0">
              <dt className="terminal-label text-muted uppercase">
                longest streak
              </dt>
              <dd className="mt-1 break-words text-accent">
                {insights.longestCommitStreakDays === null
                  ? "n/a"
                  : `${insights.longestCommitStreakDays} days`}
              </dd>
            </div>
            <div className="min-w-0">
              <dt className="terminal-label text-muted uppercase">milestones</dt>
              <dd className="mt-1 break-words text-accent">
                {insights.milestones.length}
              </dd>
            </div>
          </dl>
        </div>

        <GitGraph commits={insights.milestones} />

        <div className="min-w-0 space-y-8">
          <p className="terminal-label text-muted uppercase">{"// chapters"}</p>
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
