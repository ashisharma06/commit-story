import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { TerminalWindow } from "@/app/components/TerminalWindow";
import { AsciiBar } from "@/components/AsciiBar";
import { BootLines, BootSequence } from "@/components/BootSequence";
import { StoryNarrative } from "@/components/StoryNarrative";
import { StoryPrompt } from "@/components/StoryPrompt";
import { analyzeRepo } from "@/lib/analyze";
import { parseRepoInput } from "@/lib/repo";
import {
  describeStoryError,
  loadRepoHistory,
  loadRepoSummary,
  type RepoHistoryData,
  type RepoSummaryData,
  type StoryLoadError,
} from "@/lib/story";

type StoryPageProps = {
  params: Promise<{ owner: string; repo: string }>;
};

type Settled<T> =
  | { ok: true; value: T }
  | { ok: false; error: StoryLoadError };

async function settle<T>(promise: Promise<T>): Promise<Settled<T>> {
  try {
    return { ok: true, value: await promise };
  } catch (error) {
    return { ok: false, error: describeStoryError(error) };
  }
}

function StoryError({
  command,
  message,
  hint,
}: {
  command: string;
  message: string;
  hint?: string;
}) {
  return (
    <TerminalWindow title="commit-story ~ error">
      <p className="text-sm">
        <span aria-hidden="true" className="accent-glow text-accent">
          $
        </span>{" "}
        {command}
      </p>
      <p role="alert" className="mt-6 text-sm text-error">
        error: {message}
      </p>
      {hint ? <p className="mt-3 text-sm text-muted">{hint}</p> : null}
      <Link href="/" className="mt-8 inline-block text-sm text-link hover:underline">
        $ cd ..
      </Link>
    </TerminalWindow>
  );
}

function SectionError({
  label,
  error,
}: {
  label: string;
  error: StoryLoadError;
}) {
  return (
    <div>
      <p className="mb-3 text-xs tracking-[0.18em] text-muted uppercase">
        {label}
      </p>
      <p role="alert" className="text-sm text-error">
        error: {error.message}
      </p>
      {error.hint ? <p className="mt-2 text-xs text-muted">{error.hint}</p> : null}
    </div>
  );
}

function RepoSummaryContent({ data }: { data: RepoSummaryData }) {
  const { metadata, languages, contributors } = data;
  const maxShare = Math.max(...languages.map((language) => language.share), 0);

  return (
    <div>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-5 text-sm sm:grid-cols-4">
        <div>
          <dt className="text-xs tracking-[0.14em] text-muted uppercase">
            open issues
          </dt>
          <dd className="mt-1 text-lg text-accent">{metadata.openIssues}</dd>
        </div>
        <div>
          <dt className="text-xs tracking-[0.14em] text-muted uppercase">
            contributors
          </dt>
          <dd className="mt-1 text-lg text-accent">{contributors.length}</dd>
        </div>
        <div>
          <dt className="text-xs tracking-[0.14em] text-muted uppercase">
            stars
          </dt>
          <dd className="mt-1 text-lg text-accent">
            {metadata.stars.toLocaleString()}
          </dd>
        </div>
        <div>
          <dt className="text-xs tracking-[0.14em] text-muted uppercase">
            forks
          </dt>
          <dd className="mt-1 text-lg text-accent">
            {metadata.forks.toLocaleString()}
          </dd>
        </div>
      </dl>

      <div className="mt-8">
        <p className="mb-3 text-xs tracking-[0.18em] text-muted uppercase">
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

      <div className="mt-8 border-t border-border pt-6 text-sm leading-7">
        <p className="text-text">
          {metadata.description ?? "No description provided."}
        </p>
        <p className="mt-2 text-muted">
          created {metadata.createdAt.slice(0, 10)} · default branch{" "}
          {metadata.defaultBranch}
        </p>
        <a
          href={metadata.url}
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-block text-link hover:underline"
        >
          view on GitHub ↗
        </a>
      </div>
    </div>
  );
}

async function RepoSummary({ promise }: { promise: Promise<RepoSummaryData> }) {
  const result = await settle(promise);
  if (!result.ok) {
    return <SectionError label="// repository" error={result.error} />;
  }
  return <RepoSummaryContent data={result.value} />;
}

async function StoryHistory({ promise }: { promise: Promise<RepoHistoryData> }) {
  const result = await settle(promise);
  if (!result.ok) {
    return <SectionError label="// history" error={result.error} />;
  }
  return (
    <StoryNarrative
      insights={analyzeRepo(result.value.commits, result.value.pullRequests)}
    />
  );
}

async function StoryRoute({ params }: StoryPageProps) {
  await connection();
  const { owner, repo } = await params;
  const slug = `${owner}/${repo}`;
  const parsed = parseRepoInput(slug);

  if ("error" in parsed || parsed.kind !== "repo") {
    return (
      <StoryError
        command={`commit-story analyze ${slug}`}
        message={
          "error" in parsed ? parsed.error : "Expected owner/repo, got a username."
        }
      />
    );
  }

  const summaryPromise = loadRepoSummary(parsed.owner, parsed.repo);
  const historyPromise = loadRepoHistory(parsed.owner, parsed.repo);

  return (
    <TerminalWindow title={`commit-story ~ ${slug}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <p className="text-sm">
          <span aria-hidden="true" className="accent-glow text-accent">
            $
          </span>{" "}
          commit-story analyze {slug}
        </p>
        <Link href="/" className="text-xs text-link hover:underline">
          $ cd ..
        </Link>
      </div>

      <div className="mt-8">
        <Suspense fallback={<BootLines stage="repo" />}>
          <RepoSummary promise={summaryPromise} />
        </Suspense>
      </div>

      <div className="mt-8 border-t border-border pt-6">
        <Suspense fallback={<BootLines stage="history" />}>
          <StoryHistory promise={historyPromise} />
        </Suspense>
      </div>

      <div className="mt-8 border-t border-border pt-6">
        <p className="mb-3 text-xs tracking-[0.18em] text-muted uppercase">
          {"// analyze another"}
        </p>
        <StoryPrompt slug={slug} />
      </div>
    </TerminalWindow>
  );
}

export default function StoryPage({ params }: StoryPageProps) {
  return (
    <main className="mx-auto flex w-full max-w-[900px] flex-1 flex-col px-4 py-12 sm:px-6 sm:py-16">
      <Suspense fallback={<BootSequence stage="route" />}>
        <StoryRoute params={params} />
      </Suspense>
    </main>
  );
}
