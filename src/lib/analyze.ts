import type { CommitSummary, MergedPullRequest } from "@/lib/github";

const DAY_MS = 86_400_000;
const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;
const UPLOAD_MESSAGE =
  /^(initial|initial commit|first commit|upload|import|create repository|repo import)\b/i;
const UPLOAD_FILE_THRESHOLD = 100;
const MAX_BIGGEST_COMMITS = 5;
const MAX_ERAS = 6;

type DatedCommit = { commit: CommitSummary; time: number };
type EraBoundary = { index: number; score: number; gapDays: number };

export type WeekBucket = { weekStart: string; commits: number };
export type BusiestPeriod = { label: string; commits: number };
export type ContributorStat = { login: string; commits: number; share: number };
export type BiggestCommit = {
  sha: string;
  message: string;
  date: string;
  filesChanged: number;
};
export type ActivityDay = { date: string; commits: number };
export type MilestoneCommit = {
  sha: string;
  message: string;
  date: string;
  isMerge: boolean;
  filesChanged: number;
};
export type Era = {
  index: number;
  start: string | null;
  end: string | null;
  commitCount: number;
  contributorCount: number;
  topContributors: string[];
};
export type RepoInsights = {
  totalCommits: number;
  totalContributors: number;
  totalPullRequests: number;
  firstCommitAt: string | null;
  lastCommitAt: string | null;
  commitsPerWeek: WeekBucket[];
  busiestDayOfWeek: BusiestPeriod | null;
  busiestHour: BusiestPeriod | null;
  contributorLeaderboard: ContributorStat[];
  longestCommitStreakDays: number | null;
  biggestCommits: BiggestCommit[];
  milestones: MilestoneCommit[];
  activityByDay: ActivityDay[];
  eras: Era[];
};

function contributorKey(commit: CommitSummary): string {
  return commit.authorLogin ?? commit.authorName ?? "unknown";
}

function datedCommits(commits: readonly CommitSummary[]): DatedCommit[] {
  return commits
    .map((commit) => ({ commit, time: Date.parse(commit.date) }))
    .filter((entry): entry is DatedCommit => Number.isFinite(entry.time))
    .sort((a, b) => a.time - b.time || a.commit.sha.localeCompare(b.commit.sha));
}

function weekStart(time: number): string {
  const date = new Date(time);
  const utcDate = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
  const daysSinceMonday = (utcDate.getUTCDay() + 6) % 7;
  utcDate.setUTCDate(utcDate.getUTCDate() - daysSinceMonday);
  return utcDate.toISOString().slice(0, 10);
}

function dayNumber(time: number): number {
  return Math.floor(time / DAY_MS);
}

export function commitsPerWeek(commits: readonly CommitSummary[]): WeekBucket[] {
  const counts = new Map<string, number>();
  for (const { time } of datedCommits(commits)) {
    const key = weekStart(time);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, count]) => ({ weekStart: key, commits: count }));
}

export function busiestDayOfWeek(
  commits: readonly CommitSummary[],
): BusiestPeriod | null {
  const dated = datedCommits(commits);
  if (dated.length < 2) return null;

  const counts = [0, 0, 0, 0, 0, 0, 0];
  for (const { time } of dated) {
    counts[new Date(time).getUTCDay()] += 1;
  }

  let busiest = 0;
  for (let day = 1; day < counts.length; day += 1) {
    if (counts[day] > counts[busiest]) busiest = day;
  }
  return { label: DAY_NAMES[busiest], commits: counts[busiest] };
}

export function busiestHour(
  commits: readonly CommitSummary[],
): BusiestPeriod | null {
  const dated = datedCommits(commits);
  if (dated.length < 2) return null;

  const counts = Array.from({ length: 24 }, () => 0);
  for (const { time } of dated) {
    counts[new Date(time).getUTCHours()] += 1;
  }

  let busiest = 0;
  for (let hour = 1; hour < counts.length; hour += 1) {
    if (counts[hour] > counts[busiest]) busiest = hour;
  }
  return {
    label: `${String(busiest).padStart(2, "0")}:00 UTC`,
    commits: counts[busiest],
  };
}

export function contributorLeaderboard(
  commits: readonly CommitSummary[],
): ContributorStat[] {
  const counts = new Map<string, number>();
  for (const commit of commits) {
    const key = contributorKey(commit);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const total = commits.length;
  return [...counts.entries()]
    .map(([login, count]) => ({
      login,
      commits: count,
      share: total > 0 ? count / total : 0,
    }))
    .sort((a, b) => b.commits - a.commits || a.login.localeCompare(b.login));
}

export function longestCommitStreak(
  commits: readonly CommitSummary[],
): number | null {
  if (commits.length < 2) return null;

  const days = [
    ...new Set(datedCommits(commits).map(({ time }) => dayNumber(time))),
  ].sort((a, b) => a - b);
  if (days.length === 0) return null;

  let longest = 1;
  let current = 1;
  for (let index = 1; index < days.length; index += 1) {
    current = days[index] === days[index - 1] + 1 ? current + 1 : 1;
    longest = Math.max(longest, current);
  }
  return longest;
}

export function biggestCommits(
  commits: readonly CommitSummary[],
  limit = MAX_BIGGEST_COMMITS,
): BiggestCommit[] {
  if (commits.length < 2) return [];

  const dated = datedCommits(commits);
  const first = dated[0]?.commit;
  const isUpload =
    first !== undefined &&
    (UPLOAD_MESSAGE.test(first.message.trim()) ||
      (first.filesChanged ?? 0) >= UPLOAD_FILE_THRESHOLD);

  return dated
    .filter(({ commit }) => !(isUpload && commit.sha === first?.sha))
    .filter(
      ({ commit }) =>
        commit.filesChanged !== undefined &&
        Number.isFinite(commit.filesChanged) &&
        commit.filesChanged > 0,
    )
    .map(({ commit }) => ({
      sha: commit.sha,
      message: commit.message.split("\n")[0] ?? commit.message,
      date: commit.date,
      filesChanged: commit.filesChanged as number,
    }))
    .sort(
      (a, b) =>
        b.filesChanged - a.filesChanged ||
        a.date.localeCompare(b.date) ||
        a.sha.localeCompare(b.sha),
    )
    .slice(0, Math.max(0, Math.min(limit, MAX_BIGGEST_COMMITS)));
}

export function activityByDay(commits: readonly CommitSummary[]): ActivityDay[] {
  const counts = new Map<string, number>();
  for (const { time } of datedCommits(commits)) {
    const key = new Date(time).toISOString().slice(0, 10);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, commits: count }));
}

export function milestoneCommits(
  commits: readonly CommitSummary[],
  limit = 12,
): MilestoneCommit[] {
  const dated = datedCommits(commits);
  if (dated.length === 0) return [];

  const cap = Math.max(1, Math.min(Math.floor(limit), 12));
  const times = new Map(dated.map(({ commit, time }) => [commit.sha, time]));
  const bySha = new Map(dated.map(({ commit }) => [commit.sha, commit]));
  const selected: CommitSummary[] = [];
  const add = (commit: CommitSummary | undefined) => {
    if (commit && !selected.some((item) => item.sha === commit.sha)) {
      selected.push(commit);
    }
  };

  add(dated[0]?.commit);
  for (const { commit } of dated) {
    if (commit.isMerge) add(commit);
  }
  for (const entry of biggestCommits(commits, cap)) {
    add(bySha.get(entry.sha));
  }

  return selected
    .sort((a, b) => (times.get(a.sha) ?? 0) - (times.get(b.sha) ?? 0))
    .slice(0, cap)
    .map((commit) => ({
      sha: commit.sha,
      message: commit.message.split("\n")[0] ?? commit.message,
      date: commit.date,
      isMerge: commit.isMerge,
      filesChanged: commit.filesChanged ?? 0,
    }));
}

function targetEraCount(commitCount: number): number {
  if (commitCount <= 4) return 1;
  if (commitCount <= 14) return 2;
  if (commitCount <= 39) return 3;
  if (commitCount <= 99) return 4;
  if (commitCount <= 249) return 5;
  return 6;
}

function contributorSet(
  dated: readonly DatedCommit[],
  from: number,
  to: number,
): Set<string> {
  return new Set(dated.slice(from, to).map(({ commit }) => contributorKey(commit)));
}

function jaccardDistance(a: ReadonlySet<string>, b: ReadonlySet<string>): number {
  if (a.size === 0 && b.size === 0) return 0;
  const union = new Set([...a, ...b]);
  let intersection = 0;
  for (const value of a) {
    if (b.has(value)) intersection += 1;
  }
  return 1 - intersection / union.size;
}

function eraBoundaries(dated: readonly DatedCommit[]): EraBoundary[] {
  if (dated.length <= 1) return [];

  const target = targetEraCount(dated.length);
  const window = Math.max(2, Math.floor(dated.length / 6));
  const candidates: EraBoundary[] = [];

  for (let index = 1; index < dated.length; index += 1) {
    const gapDays = (dated[index].time - dated[index - 1].time) / DAY_MS;
    const before = contributorSet(
      dated,
      Math.max(0, index - window),
      index,
    );
    const after = contributorSet(
      dated,
      index,
      Math.min(dated.length, index + window),
    );
    const mixChange = jaccardDistance(before, after);
    const gapScore = gapDays >= 30 ? 2 + gapDays / 30 : gapDays / 30;
    candidates.push({ index, score: gapScore + mixChange, gapDays });
  }

  const selected: number[] = [];
  const add = (index: number) => {
    if (selected.length >= MAX_ERAS - 1) return;
    if (selected.some((existing) => Math.abs(existing - index) < 2)) return;
    selected.push(index);
  };

  const gaps = candidates
    .filter((candidate) => candidate.gapDays >= 30)
    .sort((a, b) => b.gapDays - a.gapDays || a.index - b.index);
  for (const candidate of gaps) add(candidate.index);

  if (selected.length + 1 < target) {
    const ranked = [...candidates].sort(
      (a, b) => b.score - a.score || a.index - b.index,
    );
    for (const candidate of ranked) {
      if (selected.length + 1 >= target) break;
      add(candidate.index);
    }
  }

  return selected.sort((a, b) => a - b).map((index) => ({
    index,
    score: candidates.find((candidate) => candidate.index === index)?.score ?? 0,
    gapDays: candidates.find((candidate) => candidate.index === index)?.gapDays ?? 0,
  }));
}

function makeEra(dated: readonly DatedCommit[], index: number): Era {
  if (dated.length === 0) {
    return {
      index,
      start: null,
      end: null,
      commitCount: 0,
      contributorCount: 0,
      topContributors: [],
    };
  }

  const counts = new Map<string, number>();
  for (const { commit } of dated) {
    const key = contributorKey(commit);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const topContributors = [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 3)
    .map(([key]) => key);

  return {
    index,
    start: dated[0].commit.date,
    end: dated[dated.length - 1].commit.date,
    commitCount: dated.length,
    contributorCount: counts.size,
    topContributors,
  };
}

export function splitEras(commits: readonly CommitSummary[]): Era[] {
  const dated = datedCommits(commits);
  const boundaries = eraBoundaries(dated);
  const ranges: Array<[number, number]> = [];
  let start = 0;
  for (const boundary of boundaries) {
    ranges.push([start, boundary.index]);
    start = boundary.index;
  }
  ranges.push([start, dated.length]);

  return ranges.map(([from, to], index) => makeEra(dated.slice(from, to), index + 1));
}

export function analyzeRepo(
  commits: readonly CommitSummary[],
  pullRequests: readonly MergedPullRequest[],
): RepoInsights {
  const dated = datedCommits(commits);
  const thin = commits.length < 2;

  return {
    totalCommits: commits.length,
    totalContributors: new Set(commits.map(contributorKey)).size,
    totalPullRequests: pullRequests.length,
    firstCommitAt: dated[0]?.commit.date ?? null,
    lastCommitAt: dated[dated.length - 1]?.commit.date ?? null,
    commitsPerWeek: commitsPerWeek(commits),
    busiestDayOfWeek: thin ? null : busiestDayOfWeek(commits),
    busiestHour: thin ? null : busiestHour(commits),
    contributorLeaderboard: contributorLeaderboard(commits),
    longestCommitStreakDays: thin ? null : longestCommitStreak(commits),
    biggestCommits: thin ? [] : biggestCommits(commits),
    milestones: milestoneCommits(commits),
    activityByDay: activityByDay(commits),
    eras: splitEras(commits),
  };
}

function text(value: string | number | null | undefined): string {
  return value === null || value === undefined ? "n/a" : String(value);
}

export function formatInsights(insights: RepoInsights): string {
  const lines = [
    `total commits: ${insights.totalCommits}`,
    `total contributors: ${insights.totalContributors}`,
    `merged prs: ${insights.totalPullRequests}`,
    `first commit: ${text(insights.firstCommitAt)}`,
    `last commit: ${text(insights.lastCommitAt)}`,
    `busiest day: ${text(insights.busiestDayOfWeek?.label)} (${text(insights.busiestDayOfWeek?.commits)})`,
    `busiest hour: ${text(insights.busiestHour?.label)} (${text(insights.busiestHour?.commits)})`,
    `longest streak: ${text(insights.longestCommitStreakDays)} days`,
    "",
    "eras:",
    ...insights.eras.map(
      (era) =>
        `  ${era.index}. ${text(era.start)} -> ${text(era.end)} · ${era.commitCount} commits · ${era.contributorCount} contributors`,
    ),
    "",
    "commits per week:",
    ...(insights.commitsPerWeek.length > 0
      ? insights.commitsPerWeek.map(
          (week) => `  ${week.weekStart}: ${week.commits}`,
        )
      : ["  n/a"]),
    "",
    "contributor leaderboard:",
    ...(insights.contributorLeaderboard.length > 0
      ? insights.contributorLeaderboard.map(
          (entry) =>
            `  ${entry.login}: ${entry.commits} commits (${(entry.share * 100).toFixed(1)}%)`,
        )
      : ["  n/a"]),
    "",
    "biggest commits:",
    ...(insights.biggestCommits.length > 0
      ? insights.biggestCommits.map(
          (commit) =>
            `  ${commit.sha.slice(0, 7)} · ${commit.filesChanged} files · ${commit.message}`,
        )
      : ["  n/a"]),
  ];

  return lines.join("\n");
}
