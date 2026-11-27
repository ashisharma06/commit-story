import Link from "next/link";
import { connection } from "next/server";
import { TerminalWindow } from "@/app/components/TerminalWindow";
import { UserRepoList, type UserRepoRow } from "@/app/components/UserRepoList";
import {
  RateLimitError,
  UserNotFoundError,
  type UserReposData,
} from "@/lib/github";
import { parseRepoInput } from "@/lib/repo";
import { loadCachedUserRepos } from "@/lib/story";
import { relativeTime } from "@/lib/time";

type UserPageProps = {
  params: Promise<{ username: string }>;
};

type LoadResult =
  | { ok: true; data: UserReposData }
  | { ok: false; message: string; hint?: string };

function UserError({
  command,
  message,
  hint,
}: {
  command: string;
  message: string;
  hint?: string;
}) {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col justify-center px-4 py-10 sm:px-6 sm:py-16 md:px-8">
      <TerminalWindow title="commit-story ~ error">
        <p className="break-words text-sm">
          <span aria-hidden="true" className="accent-glow text-accent">
            $
          </span>{" "}
          {command}
        </p>
        <p role="alert" className="mt-6 break-words text-sm text-error">
          error: {message}
        </p>
        {hint ? (
          <p className="mt-3 break-words text-sm text-muted">{hint}</p>
        ) : null}
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

async function loadUser(username: string): Promise<LoadResult> {
  try {
    const data = await loadCachedUserRepos(username);
    return { ok: true, data };
  } catch (error) {
    if (error instanceof UserNotFoundError) {
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

export default async function UserPage({ params }: UserPageProps) {
  await connection();
  const { username } = await params;
  const command = `ls -la github.com/${username}/`;
  const parsed = parseRepoInput(username);

  if ("error" in parsed || parsed.kind !== "user") {
    return (
      <UserError
        command={command}
        message={"error" in parsed ? parsed.error : "Expected a GitHub username."}
      />
    );
  }

  const result = await loadUser(parsed.username);
  if (!result.ok) {
    return (
      <UserError command={command} message={result.message} hint={result.hint} />
    );
  }

  const { profile } = result.data;
  const rows: UserRepoRow[] = result.data.repos.map((repo) => ({
    ...repo,
    pushedLabel: relativeTime(repo.pushed_at),
  }));

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-4 py-10 sm:px-6 sm:py-16 md:px-8">
      <TerminalWindow title={`commit-story ~ ${parsed.username}`}>
        <p className="break-words text-sm">
          <span aria-hidden="true" className="accent-glow text-accent">
            $
          </span>{" "}
          {command}
        </p>

        <p className="terminal-label mt-6 break-words text-muted">
          {"// "}
          {profile.name ?? profile.login} · {profile.public_repos} public repos
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
    </main>
  );
}
