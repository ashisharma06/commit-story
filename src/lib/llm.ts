import { google } from "@ai-sdk/google";
import { createTextStreamResponse, streamText, toTextStream } from "ai";
import type { RepoInsights } from "@/lib/analyze";
import type { CommitSummary, MergedPullRequest } from "@/lib/github";

const DEFAULT_MODEL = "gemini-2.5-flash";
const CHARS_PER_TOKEN = 4;

/** Rough budget: ~6,000 tokens at four characters per token. */
export const MAX_STORY_INPUT_TOKENS = 6000;
export const MAX_STORY_INPUT_CHARS = MAX_STORY_INPUT_TOKENS * CHARS_PER_TOKEN;
export const MAX_STORY_SIGNALS = 40;
const MAX_SIGNAL_CHARS = 160;
const TRUNCATION_NOTICE = "\n[input truncated to stay within budget]";

export const STORY_SYSTEM_PROMPT = [
  "You are the narrator for Commit Story, a terminal-style history of a GitHub repository.",
  "Write a short, engaging story of the project in one chapter per era, in a dry-humored developer voice.",
  "Use only facts present in the provided repo insights and commit/PR titles.",
  "Never invent facts, motivations, users, features, or outcomes.",
  "Do not guess at features that are not in the commit messages or PR titles.",
  "If the data is thin (1 commit, 1 contributor), write a short honest paragraph instead of padding it.",
  "Format with basic markdown: ## chapter headings, short paragraphs, and - bullets where useful.",
  "Keep it concise. Do not mechanically repeat every statistic.",
].join(" ");

type StorySignalKind = "commit" | "pull request";
type StorySignal = {
  kind: StorySignalKind;
  date: string;
  text: string;
  score: number;
};

export function resolveStoryModelName(): string {
  const configured = process.env.AI_MODEL?.trim();
  const withoutProvider = configured?.replace(/^google\//i, "") ?? "";
  return withoutProvider || DEFAULT_MODEL;
}

function firstLine(value: string): string {
  return value.split(/\r?\n/, 1)[0]?.replace(/\s+/g, " ").trim() ?? "";
}

function truncate(value: string, max: number): string {
  if (value.length <= max) return value;
  if (max <= 1) return value.slice(0, max);
  return `${value.slice(0, max - 1).trimEnd()}…`;
}

function signalDate(value: string): string {
  const date = value.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : "unknown";
}

function commitSignal(commit: CommitSummary): StorySignal {
  const message = truncate(firstLine(commit.message), MAX_SIGNAL_CHARS);
  const churn = Math.min(Math.max(commit.filesChanged ?? 0, 0), 1000);

  return {
    kind: "commit",
    date: signalDate(commit.date),
    text: `${commit.sha.slice(0, 7)} ${message}`,
    score: (commit.isMerge ? 1000 : 0) + churn + Math.min(message.length, 80) / 10,
  };
}

function pullRequestSignal(pullRequest: MergedPullRequest): StorySignal {
  const title = truncate(firstLine(pullRequest.title), MAX_SIGNAL_CHARS);

  return {
    kind: "pull request",
    date: signalDate(pullRequest.mergedAt),
    text: `#${pullRequest.number} ${title}`,
    score: 300 + Math.min(title.length, 100) / 10,
  };
}

export function selectStorySignals(
  commits: readonly CommitSummary[],
  pullRequests: readonly MergedPullRequest[],
): StorySignal[] {
  return [...commits.map(commitSignal), ...pullRequests.map(pullRequestSignal)]
    .sort(
      (a, b) =>
        b.score - a.score ||
        a.date.localeCompare(b.date) ||
        a.text.localeCompare(b.text),
    )
    .slice(0, MAX_STORY_SIGNALS);
}

function formatInsights(insights: RepoInsights): string[] {
  const window =
    insights.firstCommitAt && insights.lastCommitAt
      ? `${insights.firstCommitAt.slice(0, 10)} to ${insights.lastCommitAt.slice(0, 10)}`
      : "unknown";
  const thin = insights.totalCommits <= 1 && insights.totalContributors <= 1;

  const lines = [
    "REPO INSIGHTS",
    `- commits: ${insights.totalCommits}`,
    `- contributors: ${insights.totalContributors}`,
    `- merged pull requests: ${insights.totalPullRequests}`,
    `- window: ${window}`,
    `- busiest day: ${insights.busiestDayOfWeek?.label ?? "n/a"}`,
    `- busiest hour: ${insights.busiestHour?.label ?? "n/a"}`,
    `- longest streak: ${insights.longestCommitStreakDays ?? "n/a"} days`,
    `- milestones: ${insights.milestones.length}`,
    `DATA DENSITY: ${thin ? "thin (one short honest paragraph only)" : "regular"}`,
    "",
    "ERAS",
  ];

  if (insights.eras.length === 0) {
    lines.push("- no eras inferred");
  } else {
    insights.eras.forEach((era, index) => {
      const start = era.start?.slice(0, 10) ?? "beginning";
      const end = era.end?.slice(0, 10) ?? "now";
      lines.push(
        `${index + 1}. ${start} to ${end} | ${era.commitCount} commits | ` +
          `${era.contributorCount} contributors | authors: ${
            era.topContributors.join(", ") || "n/a"
          }`,
      );
    });
  }

  return lines;
}

export function capStoryInput(input: string): string {
  if (input.length <= MAX_STORY_INPUT_CHARS) return input;
  if (MAX_STORY_INPUT_CHARS <= TRUNCATION_NOTICE.length) {
    return input.slice(0, MAX_STORY_INPUT_CHARS);
  }

  const limit = MAX_STORY_INPUT_CHARS - TRUNCATION_NOTICE.length;
  const cut = input.slice(0, limit);
  const boundary = cut.lastIndexOf("\n");
  const body = boundary > limit / 2 ? cut.slice(0, boundary) : cut;
  return `${body}${TRUNCATION_NOTICE}`;
}

export function buildStoryInput(
  insights: RepoInsights,
  commits: readonly CommitSummary[],
  pullRequests: readonly MergedPullRequest[],
): string {
  const signals = selectStorySignals(commits, pullRequests);
  const lines = [
    ...formatInsights(insights),
    "",
    `SIGNALS (${signals.length} ranked commit/PR titles; a sample, not the full history)`,
  ];

  if (signals.length === 0) {
    lines.push("- no commit or pull request titles available");
  } else {
    for (const signal of signals) {
      const kind = signal.kind === "commit" ? "commit" : "pr";
      lines.push(`- [${kind}] ${signal.date} ${signal.text}`);
    }
  }

  return capStoryInput(lines.join("\n"));
}

export function streamStoryResponse({
  prompt,
  signal,
}: {
  prompt: string;
  signal: AbortSignal;
}): Response {
  const result = streamText({
    model: google(resolveStoryModelName()),
    instructions: STORY_SYSTEM_PROMPT,
    prompt,
    temperature: 0.7,
    maxOutputTokens: 900,
    abortSignal: signal,
  });

  return createTextStreamResponse({
    stream: toTextStream({ stream: result.stream }),
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "text/plain; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
