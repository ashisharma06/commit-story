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
      <label htmlFor="repo-input" className="sr-only">
        GitHub username or owner/repo
      </label>
      <div className="flex min-h-11 w-full min-w-0 flex-wrap items-center gap-x-2 gap-y-2 text-sm sm:text-base">
        <span className="shrink-0 whitespace-nowrap text-text">
          <span aria-hidden="true" className="accent-glow text-accent">
            $
          </span>{" "}
          commit-story analyze
        </span>
        <div className="flex w-full min-w-0 items-center sm:w-auto sm:flex-1">
          <input
            ref={inputRef}
            id="repo-input"
            name="repo"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            placeholder="username or owner/repo"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "repo-error" : undefined}
            className="min-h-11 w-full min-w-0 bg-transparent text-text caret-transparent outline-none placeholder:text-muted"
          />
          <span aria-hidden="true" className="terminal-cursor ml-0.5 shrink-0" />
        </div>
      </div>
      <p className="sr-only">Press Enter to analyze the repository.</p>
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
