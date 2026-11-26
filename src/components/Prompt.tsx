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
    <form onSubmit={handleSubmit} className="w-full">
      <label htmlFor="repo-input" className="sr-only">
        GitHub repository URL or owner/repo
      </label>
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-3 text-sm sm:text-base">
        <span className="whitespace-nowrap text-text">
          <span aria-hidden="true" className="accent-glow text-accent">
            $
          </span>{" "}
          commit-story analyze
        </span>
        <div className="flex min-w-0 flex-1 items-baseline">
          <input
            ref={inputRef}
            id="repo-input"
            name="repo"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            placeholder="owner/repo"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "repo-error" : undefined}
            className="min-w-0 max-w-full bg-transparent text-text caret-transparent outline-none placeholder:text-muted"
            style={{ width: `${Math.max(value.length, 1)}ch`, minWidth: "1ch" }}
          />
          <span aria-hidden="true" className="terminal-cursor ml-0.5" />
        </div>
      </div>
      <p className="sr-only">Press Enter to analyze the repository.</p>
      {error ? (
        <p id="repo-error" role="alert" className="mt-4 text-sm text-error">
          error: {error}
        </p>
      ) : null}
    </form>
  );
}
