import { cache } from "react";
import {
  fetchCommits,
  fetchContributors,
  fetchLanguages,
  fetchMergedPullRequests,
  fetchRepoMetadata,
  RateLimitError,
  RepoNotFoundError,
  type CommitSummary,
  type ContributorSummary,
  type LanguageSummary,
  type MergedPullRequest,
  type RepoMetadata,
} from "@/lib/github";

export type RepoSummaryData = {
  metadata: RepoMetadata;
  languages: LanguageSummary[];
  contributors: ContributorSummary[];
};

export type RepoHistoryData = {
  commits: CommitSummary[];
  pullRequests: MergedPullRequest[];
};

export type StoryLoadError = { message: string; hint?: string };

export const loadRepoSummary = cache(
  async (owner: string, repo: string): Promise<RepoSummaryData> => {
    const [metadata, languages, contributors] = await Promise.all([
      fetchRepoMetadata(owner, repo),
      fetchLanguages(owner, repo),
      fetchContributors(owner, repo),
    ]);
    return { metadata, languages, contributors };
  },
);

export const loadRepoHistory = cache(
  async (owner: string, repo: string): Promise<RepoHistoryData> => {
    const [commits, pullRequests] = await Promise.all([
      fetchCommits(owner, repo),
      fetchMergedPullRequests(owner, repo),
    ]);
    return { commits, pullRequests };
  },
);

export function describeStoryError(error: unknown): StoryLoadError {
  if (error instanceof RepoNotFoundError) {
    return { message: error.message };
  }
  if (error instanceof RateLimitError) {
    return {
      message: error.message,
      hint: `reset: ${error.resetAt?.toISOString() ?? "unknown"} · remaining: ${error.remaining}`,
    };
  }
  if (error instanceof Error) {
    return { message: `Unexpected error: ${error.message}` };
  }
  return { message: "Unexpected GitHub error." };
}
