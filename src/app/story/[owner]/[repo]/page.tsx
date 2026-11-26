import Link from "next/link";
import { connection } from "next/server";
import { TerminalWindow } from "@/app/components/TerminalWindow";
import { analyzeRepo, formatInsights } from "@/lib/analyze";
import {
  fetchRepoStoryData,
  RateLimitError,
  RepoNotFoundError,
  type RepoStoryData,
} from "@/lib/github";
import { parseRepoInput } from "@/lib/repo";

type StoryPageProps = {
  params: Promise<{ owner: string; repo: string }>;
};

type LoadResult =
  | { ok: true; data: RepoStoryData }
  | { ok: false; message: string; hint?: string };

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
    <main className="mx-auto flex w-full max-w-[900px] flex-1 flex-col justify-center px-4 py-16 sm:px-6">
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
        <Link
          href="/"
          className="mt-8 inline-block text-sm text-link hover:underline"
        >
          $ cd ..
        </Link>
      </TerminalWindow>
    </main>
  );
}

async function loadStory(owner: string, repo: string): Promise<LoadResult> {
  try {
    const data = await fetchRepoStoryData(owner, repo);
    return { ok: true, data };
  } catch (error) {
    if (error instanceof RepoNotFoundError) {
      return { ok: false, message: error.message };
    }
    if (error instanceof RateLimitError) {
      return {
        ok: false,
        message: error.message,
        hint: `reset: ${error.resetAt?.toISOString() ?? "unknown"} · remaining: ${error.remaining}`,
      };
    }
    if (error instanceof Error) {
      return { ok: false, message: `Unexpected error: ${error.message}` };
    }
    return { ok: false, message: "Unexpected GitHub error." };
  }
}

export default async function StoryPage({ params }: StoryPageProps) {
  await connection();
  const { owner, repo } = await params;
  const parsed = parseRepoInput(`${owner}/${repo}`);
  if (!parsed.success) {
    return (
      <StoryError
        command={`commit-story analyze ${owner}/${repo}`}
        message={parsed.error}
      />
    );
  }

  const slug = parsed.repo.slug;
  const result = await loadStory(parsed.repo.owner, parsed.repo.repo);

  if (!result.ok) {
    return (
      <StoryError
        command={`commit-story analyze ${slug}`}
        message={result.message}
        hint={result.hint}
      />
    );
  }

  const data = result.data;
  const insights = analyzeRepo(data.commits, data.pullRequests);

  return (
    <main className="mx-auto flex w-full max-w-[900px] flex-1 flex-col px-4 py-12 sm:px-6 sm:py-16">
      <TerminalWindow title={`commit-story ~ ${slug}`}>
        <p className="text-sm">
          <span aria-hidden="true" className="accent-glow text-accent">
            $
          </span>{" "}
          commit-story analyze {slug}
        </p>

        <dl className="mt-8 grid grid-cols-2 gap-x-6 gap-y-5 text-sm sm:grid-cols-4">
          <div>
            <dt className="text-xs tracking-[0.14em] text-muted uppercase">
              commits
            </dt>
            <dd className="mt-1 text-lg text-accent">{data.commits.length}</dd>
          </div>
          <div>
            <dt className="text-xs tracking-[0.14em] text-muted uppercase">
              contributors
            </dt>
            <dd className="mt-1 text-lg text-accent">
              {data.contributors.length}
            </dd>
          </div>
          <div>
            <dt className="text-xs tracking-[0.14em] text-muted uppercase">
              merged prs
            </dt>
            <dd className="mt-1 text-lg text-accent">
              {data.pullRequests.length}
            </dd>
          </div>
          <div>
            <dt className="text-xs tracking-[0.14em] text-muted uppercase">
              languages
            </dt>
            <dd className="mt-1 text-lg text-accent">
              {data.languages.length}
            </dd>
          </div>
        </dl>

        <div className="mt-8 border-t border-border pt-6">
          <p className="mb-3 text-xs tracking-[0.18em] text-muted uppercase">
            {"// language breakdown"}
          </p>
          {data.languages.length === 0 ? (
            <p className="text-sm text-muted">no language data reported</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {data.languages.slice(0, 10).map((language) => (
                <li
                  key={language.name}
                  className="flex flex-wrap justify-between gap-x-4 gap-y-1"
                >
                  <span className="text-text">{language.name}</span>
                  <span className="text-muted">
                    {Math.round(language.share * 100)}% ·{" "}
                    {language.bytes.toLocaleString()} bytes
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-8 border-t border-border pt-6">
          <p className="mb-3 text-xs tracking-[0.18em] text-muted uppercase">
            {"// INSIGHTS (debug)"}
          </p>
          <pre className="overflow-x-auto whitespace-pre-wrap text-xs leading-6 text-muted">
            {formatInsights(insights)}
          </pre>
        </div>

        <div className="mt-8 border-t border-border pt-6 text-sm leading-7">
          <p className="text-text">
            {data.metadata.description ?? "No description provided."}
          </p>
          <p className="mt-2 text-muted">
            {data.metadata.stars.toLocaleString()} stars ·{" "}
            {data.metadata.forks.toLocaleString()} forks · created{" "}
            {data.metadata.createdAt.slice(0, 10)}
          </p>
          <a
            href={data.metadata.url}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-block text-link hover:underline"
          >
            view on GitHub ↗
          </a>
        </div>
      </TerminalWindow>
    </main>
  );
}
