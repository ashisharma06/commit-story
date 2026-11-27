"use client";

import type { FormEvent, RefObject } from "react";

type PromptProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  error?: string | null;
  inputRef?: RefObject<HTMLInputElement | null>;
};

export function Prompt({
  value,
  onChange,
  onSubmit,
  error = null,
  inputRef,
}: PromptProps) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit();
  }

  return (
    <form onSubmit={handleSubmit} className="w-full min-w-0">
      <div className="flex min-h-11 w-full min-w-0 items-center text-sm sm:text-base">
        <span className="shrink-0 whitespace-pre text-text">
          <span aria-hidden="true" className="accent-glow text-accent">
            $
          </span>
          {" commit-story analyze "}
        </span>
        <input
          ref={inputRef}
          id="repo-input"
          name="repo"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          aria-label="GitHub username or owner/repo"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "repo-hint repo-error" : "repo-hint"}
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          className="min-h-11 min-w-0 flex-1 border-0 bg-transparent text-text caret-accent"
        />
      </div>
      <p id="repo-hint" className="sr-only">
        Press Enter to analyze the repository.
      </p>
      {error ? (
        <p
          id="repo-error"
          role="alert"
          className="mt-4 break-words text-sm text-error"
        >
          error: {error}
        </p>
      ) : null}
    </form>
  );
}
