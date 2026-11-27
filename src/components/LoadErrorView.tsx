import Link from "next/link";
import { TerminalWindow } from "@/app/components/TerminalWindow";
import type { StoryLoadError } from "@/lib/story";

export function LoadErrorView({
  command,
  error,
}: {
  command: string;
  error: StoryLoadError;
}) {
  return (
    <TerminalWindow title={`commit-story ~ ${error.kind}`}>
      <p className="break-words text-sm">
        <span aria-hidden="true" className="accent-glow text-accent">
          $
        </span>{" "}
        {command}
      </p>
      <p className="terminal-label mt-6 text-warning uppercase">
        {"// "}
        {error.title}
      </p>
      <p role="alert" className="mt-3 break-words text-sm text-error">
        error: {error.message}
      </p>
      {error.hint ? (
        <p className="mt-3 break-words text-sm text-muted">{error.hint}</p>
      ) : null}
      <Link
        href="/"
        className="mt-8 inline-block text-sm text-link hover:underline"
      >
        $ cd /
      </Link>
    </TerminalWindow>
  );
}
