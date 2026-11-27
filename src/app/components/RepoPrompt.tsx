"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Prompt } from "@/app/components/Prompt";
import { parseRepoInput } from "@/lib/repo";

const EXAMPLES = [
  "ashisharma06",
  "vercel/next.js",
  "facebook/react",
  "vercel/ai",
] as const;

export function RepoPrompt() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit() {
    const result = parseRepoInput(value);
    if ("error" in result) {
      setError(result.error);
      inputRef.current?.focus();
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
    inputRef.current?.focus();
  }

  return (
    <div className="min-w-0">
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
        <ul className="space-y-1 text-sm">
          {EXAMPLES.map((example) => (
            <li key={example} className="min-w-0">
              <button
                type="button"
                onClick={() => chooseExample(example)}
                className="flex min-h-11 w-full min-w-0 items-center break-words text-left text-muted transition-colors hover:text-link"
              >
                <span aria-hidden="true" className="shrink-0 text-accent">
                  $
                </span>{" "}
                commit-story analyze {example}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
