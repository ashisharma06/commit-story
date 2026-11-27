import { Suspense, cache } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { connection } from "next/server";
import { TerminalWindow } from "@/app/components/TerminalWindow";
import { AsciiBar } from "@/components/AsciiBar";
import { BootLines, BootSequence } from "@/components/BootSequence";
import { LoadErrorView } from "@/components/LoadErrorView";
import { StoryNarrative } from "@/components/StoryNarrative";
import { StoryPrompt } from "@/components/StoryPrompt";
import { StoryVisuals } from "@/components/StoryVisuals";
import { analyzeRepo } from "@/lib/analyze";
import type { RepoStoryData } from "@/lib/github";
import { socialMetadata } from "@/lib/metadata";
import { parseRepoInput } from "@/lib/repo";
import { siteUrl } from "@/lib/site";
import {
  activeYears,
  repoStatsDescription,
  topLanguageLabel,
  yearsLabel,
} from "@/lib/stats";
import type { StoryMarkdownData } from "@/lib/storyMarkdown";
import {
  describeStoryError,
  loadNarrativeCachedAt,
  loadRepoStoryData,
  type RepoStorySnapshot,
  type StoryLoadError,
} from "@/lib/story";

type StoryPageProps = {
  params: Promise<{ owner: string; repo: string }>;
};

type Settled<T> =
  | { ok: true; value: T }
  | { ok: false; error: StoryLoadError };

/** Shared between the page and metadata so one request fetches the repo once. */
const loadStory = cache(loadRepoStoryData);

export async function generateMetadata({
  params,
}: StoryPageProps): Promise<Metadata> {
  await connection();
  const { owner, repo } = await params;
  const slug = `${owner}/${repo}`;
  const title = `${slug}: the story of a codebase`;
  const path = `/story/${owner}/${repo}`;
  const parsed = parseRepoInput(slug);
  let description = `The story of ${slug}, told from its real GitHub history.`;

  if (!("error" in parsed) && parsed.kind === "repo") {
    try {
      const data = await loadStory(parsed.owner, parsed.repo);
      description = repoStatsDescription(
        analyzeRepo(data.commits, data.pullRequests),
      );
    } catch {
      // Keep the generic description when GitHub cannot be reached.
    }
  }

  return socialMetadata({
    title,
    description,
    path,
    imagePath: `${path}/opengraph-image`,
    imageAlt: title,
  });
}

async function settle<T>(promise: Promise<T>): Promise<Settled<T>> {
  try {
    return { ok: true, value: await promise };
  } catch (error) {
    return { ok: false, error: describeStoryError(error) };
  }
}

function invalidInputError(message: string): StoryLoadError {
  return {
    kind: "invalid-input",
    title: "invalid input",
    message,
    hint: "Use owner/repo or a GitHub username, for example vercel/next.js.",
  };
}

function SectionError({
  label,
  error,
}: {
  label: string;
  error: StoryLoadError;
}) {
  return (
    <div className="min-w-0">
      <p className="terminal-label mb-3 text-muted uppercase">{label}</p>
      <p className="terminal-label mb-2 text-warning uppercase">
        {"// "}
        {error.title}
      </p>
      <p role="alert" className="break-words text-sm text-error">
        error: {error.message}
      </p>
      {error.hint ? (
        <p className="mt-2 break-words text-sm text-muted">{error.hint}</p>
      ) : null}
    </div>
  );
}

function RepoSummaryContent({ data }: { data: RepoStoryData }) {
  const { metadata, languages, contributors } = data;
  const maxShare = Math.max(...languages.map((language) => language.share), 0);

  return (
    <div className="min-w-0">
      <dl className="grid grid-cols-2 gap-x-6 gap-y-5 text-sm md:grid-cols-4">
        <div className="min-w-0">
          <dt className="terminal-label text-muted uppercase">open issues</dt>
          <dd className="mt-1 text-lg text-accent">{metadata.openIssues}</dd>
        </div>
        <div className="min-w-0">
          <dt className="terminal-label text-muted uppercase">contributors</dt>
          <dd className="mt-1 text-lg text-accent">{contributors.length}</dd>
        </div>
        <div className="min-w-0">
          <dt className="terminal-label text-muted uppercase">stars</dt>
          <dd className="mt-1 text-lg text-accent">
            {metadata.stars.toLocaleString()}
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="terminal-label text-muted uppercase">forks</dt>
          <dd className="mt-1 text-lg text-accent">
            {metadata.forks.toLocaleString()}
          </dd>
        </div>
      </dl>

      <div className="mt-8 min-w-0">
        <p className="terminal-label mb-3 text-muted uppercase">
          {"// language breakdown"}
        </p>
        {languages.length === 0 ? (
          <p className="text-sm text-muted">no language data reported</p>
        ) : (
          <div className="space-y-2">
            {languages.slice(0, 6).map((language) => (
              <AsciiBar
                key={language.name}
                label={language.name}
                value={language.share}
                max={maxShare}
                detail={`${Math.round(language.share * 100)}%`}
                percent={Math.round(language.share * 100)}
              />
            ))}
          </div>
        )}
      </div>

      <div className="mt-8 min-w-0 border-t border-border pt-6 text-sm leading-relaxed">
        <p className="break-words text-text">
          {metadata.description ?? "No description provided."}
        </p>
        <p className="mt-2 break-words text-muted">
          created {metadata.createdAt.slice(0, 10)} · default branch{" "}
          {metadata.defaultBranch}
        </p>
        <a
          href={metadata.url}
          target="_blank"
          rel="noreferrer"
          aria-label={`View ${metadata.fullName} on GitHub (opens in a new tab)`}
          className="mt-3 inline-block max-w-full break-all text-link hover:underline"
        >
          view on GitHub ↗
        </a>
      </div>
    </div>
  );
}

async function RepoSummary({ promise }: { promise: Promise<RepoStoryData> }) {
  const result = await settle(promise);
  if (!result.ok) {
    return <SectionError label="// repository" error={result.error} />;
  }
  return <RepoSummaryContent data={result.value} />;
}

async function StoryHistory({
  promise,
  owner,
  repo,
}: {
  promise: Promise<RepoStorySnapshot>;
  owner: string;
  repo: string;
}) {
  const result = await settle(promise);
  if (!result.ok) {
    return <SectionError label="// history" error={result.error} />;
  }

  const insights = analyzeRepo(result.value.commits, result.value.pullRequests);
  const narrativeCachedAt = await loadNarrativeCachedAt(
    owner,
    repo,
    result.value.headSha,
  ).catch(() => null);

  const share: StoryMarkdownData = {
    owner,
    repo,
    siteUrl: siteUrl(),
    title: `${owner}/${repo}: the story of a codebase`,
    description: repoStatsDescription(insights),
    totalCommits: insights.totalCommits,
    totalContributors: insights.totalContributors,
    totalPullRequests: insights.totalPullRequests,
    yearsActive: yearsLabel(
      activeYears(insights.firstCommitAt, insights.lastCommitAt),
    ),
    topLanguage: topLanguageLabel(result.value.languages),
    firstCommitAt: insights.firstCommitAt,
    lastCommitAt: insights.lastCommitAt,
    languages: result.value.languages.slice(0, 8),
  };

  return (
    <>
      <StoryVisuals insights={insights} />
      <div className="mt-10 min-w-0 border-t border-border pt-6">
        <StoryNarrative
          owner={owner}
          repo={repo}
          cachedAt={narrativeCachedAt}
          share={share}
        />
      </div>
    </>
  );
}

async function StoryRoute({ params }: StoryPageProps) {
  await connection();
  const { owner, repo } = await params;
  const slug = `${owner}/${repo}`;
  const parsed = parseRepoInput(slug);

  if ("error" in parsed || parsed.kind !== "repo") {
    return (
      <LoadErrorView
        command={`commit-story analyze ${slug}`}
        error={invalidInputError(
          "error" in parsed
            ? parsed.error
            : "Expected owner/repo, got a username.",
        )}
      />
    );
  }

  const storyPromise = loadStory(parsed.owner, parsed.repo);

  return (
    <TerminalWindow title={`commit-story ~ ${slug}`}>
      <div className="flex min-w-0 flex-wrap items-baseline justify-between gap-3">
        <p className="min-w-0 break-words text-sm">
          <span aria-hidden="true" className="accent-glow text-accent">
            $
          </span>{" "}
          commit-story analyze {slug}
        </p>
        <Link
          href="/"
          className="shrink-0 text-sm text-link hover:underline"
        >
          $ cd ..
        </Link>
      </div>

      <div className="mt-8 min-w-0">
        <Suspense fallback={<BootLines stage="repo" />}>
          <RepoSummary promise={storyPromise} />
        </Suspense>
      </div>

      <div className="mt-8 min-w-0 border-t border-border pt-6">
        <Suspense fallback={<BootLines stage="history" />}>
          <StoryHistory
            promise={storyPromise}
            owner={parsed.owner}
            repo={parsed.repo}
          />
        </Suspense>
      </div>

      <div className="mt-8 min-w-0 border-t border-border pt-6">
        <p className="terminal-label mb-3 text-muted uppercase">
          {"// analyze another"}
        </p>
        <StoryPrompt slug={slug} />
      </div>
    </TerminalWindow>
  );
}

export default function StoryPage({ params }: StoryPageProps) {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-4 py-10 sm:px-6 sm:py-16 md:px-8">
      <h1 className="sr-only">Commit Story</h1>
      <Suspense fallback={<BootSequence stage="route" />}>
        <StoryRoute params={params} />
      </Suspense>
    </main>
  );
}
