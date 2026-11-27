"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Prompt } from "@/app/components/Prompt";
import { TerminalWindow } from "@/app/components/TerminalWindow";
import { parseRepoInput } from "@/lib/repo";

const EXAMPLES = [
  "ashisharma06",
  "vercel/next.js",
  "facebook/react",
  "vercel/ai",
] as const;

function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.isContentEditable ||
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT"
  );
}

export function RepoPrompt() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (
      typeof window.matchMedia === "function" &&
      window.matchMedia("(pointer: fine)").matches
    ) {
      inputRef.current?.focus();
    }
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "/" || isTyping(event.target)) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      event.preventDefault();
      inputRef.current?.focus();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  function focusInput() {
    inputRef.current?.focus();
  }

  function handleSubmit() {
    const result = parseRepoInput(value);
    if ("error" in result) {
      setError(result.error);
      focusInput();
      return;
    }
    if (result.kind === "user") {
      router.push(`/u/${result.username}`);
      return;
    }
    router.push(`/story/${result.owner}/${result.repo}`);
  }

  function chooseExample(example: string) {
    setValue(example);
    setError(null);
    focusInput();
  }

  return (
    <div className="min-w-0" onClick={focusInput}>
      <TerminalWindow title="commit-story ~ /">
        <Prompt
          value={value}
          onChange={(nextValue: string) => {
            setValue(nextValue);
            setError(null);
          }}
          onSubmit={handleSubmit}
          error={error}
          inputRef={inputRef}
        />

        <div className="mt-8 border-t border-border pt-6 sm:mt-10">
          <p className="terminal-label mb-3 text-muted uppercase">
            {"// try an example"}
          </p>
          <ul className="space-y-1">
            {EXAMPLES.map((example) => (
              <li key={example} className="min-w-0">
                <button
                  type="button"
                  onClick={() => chooseExample(example)}
                  className="min-h-11 w-full min-w-0 text-left text-sm text-text transition-colors hover:text-link sm:text-base"
                >
                  <span className="whitespace-pre-wrap break-words">
                    <span aria-hidden="true" className="accent-glow text-accent">
                      $
                    </span>
                    {" commit-story analyze "}
                    {example}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </TerminalWindow>
    </div>
  );
}
