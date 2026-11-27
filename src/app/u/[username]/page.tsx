import { cache, type ReactNode } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { connection } from "next/server";
import { TerminalWindow } from "@/app/components/TerminalWindow";
import { UserRepoList, type UserRepoRow } from "@/app/components/UserRepoList";
import { LoadErrorView } from "@/components/LoadErrorView";
import type { UserReposData } from "@/lib/github";
import { socialMetadata } from "@/lib/metadata";
import { parseRepoInput } from "@/lib/repo";
import { formatCount } from "@/lib/stats";
import {
  describeUserError,
  loadCachedUserRepos,
  type StoryLoadError,
} from "@/lib/story";
import { relativeTime } from "@/lib/time";

type UserPageProps = {
  params: Promise<{ username: string }>;
};

/** Shared between the page and metadata so one request fetches the user once. */
const loadUserRepos = cache(loadCachedUserRepos);

export async function generateMetadata({
  params,
}: UserPageProps): Promise<Metadata> {
  await connection();
  const { username } = await params;
  const title = `${username} on GitHub · Commit Story`;
  const path = `/u/${username}`;
  const parsed = parseRepoInput(username);
  let description = `Browse ${username}'s public GitHub repositories and open a commit story.`;

  if (!("error" in parsed) && parsed.kind === "user") {
    try {
      const data = await loadUserRepos(parsed.username);
      description = `${formatCount(data.profile.public_repos)} public repos by ${
        data.profile.name ?? data.profile.login
      } on GitHub.`;
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

type LoadResult =
  | { ok: true; data: UserReposData }
  | { ok: false; error: StoryLoadError };

function invalidInputError(message: string): StoryLoadError {
  return {
    kind: "invalid-input",
    title: "invalid input",
    message,
    hint: "Use a GitHub username or paste owner/repo instead.",
  };
}

async function loadUser(username: string): Promise<LoadResult> {
  try {
    const data = await loadUserRepos(username);
    return { ok: true, data };
  } catch (error) {
    return { ok: false, error: describeUserError(error) };
  }
}

export default async function UserPage({ params }: UserPageProps) {
  await connection();
  const { username } = await params;
  const command = `ls -la github.com/${username}/`;
  const parsed = parseRepoInput(username);
  let content: ReactNode;

  if ("error" in parsed || parsed.kind !== "user") {
    content = (
      <LoadErrorView
        command={command}
        error={invalidInputError(
          "error" in parsed ? parsed.error : "Expected a GitHub username.",
        )}
      />
    );
  } else {
    const result = await loadUser(parsed.username);
    if (!result.ok) {
      content = <LoadErrorView command={command} error={result.error} />;
    } else {
      const { profile } = result.data;
      const rows: UserRepoRow[] = result.data.repos.map((repo) => ({
        ...repo,
        pushedLabel: relativeTime(repo.pushed_at),
      }));

      content = (
        <>
          <TerminalWindow title={`commit-story ~ ${parsed.username}`}>
            <p className="break-words text-sm">
              <span aria-hidden="true" className="accent-glow text-accent">
                $
              </span>{" "}
              {command}
            </p>

            <p className="terminal-label mt-6 break-words text-muted">
              {"// "}
              {profile.name ?? profile.login} · {profile.public_repos} public
              repos
            </p>
            {profile.bio ? (
              <p className="mt-2 break-words text-sm text-muted">{profile.bio}</p>
            ) : null}

            <UserRepoList username={parsed.username} repos={rows} />
          </TerminalWindow>

          <p className="mt-6 text-sm leading-relaxed break-words text-muted">
            select a repo to build its commit story ·{" "}
            <Link href="/" className="text-link hover:underline">
              $ cd ..
            </Link>
          </p>
        </>
      );
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-4 py-10 sm:px-6 sm:py-16 md:px-8">
      <h1 className="sr-only">GitHub user {username}</h1>
      {content}
    </main>
  );
}
