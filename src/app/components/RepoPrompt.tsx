"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Prompt } from "@/app/components/Prompt";
import { parseRepoInput } from "@/lib/repo";

const EXAMPLES = ["vercel/next.js", "facebook/react", "vercel/ai"] as const;

export function RepoPrompt() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit() {
    const result = parseRepoInput(value);
    if (!result.success) {
      setError(result.error);
      inputRef.current?.focus();
      return;
    }
    router.push(`/story/${result.repo.owner}/${result.repo.repo}`);
  }

  function chooseExample(example: string) {
    setValue(example);
    setError(null);
    inputRef.current?.focus();
  }

  return (
    <div>
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

      <div className="mt-10 border-t border-border pt-6">
        <p className="mb-3 text-xs tracking-[0.18em] text-muted uppercase">
          {"// try an example"}
        </p>
        <ul className="space-y-2 text-sm">
          {EXAMPLES.map((example) => (
            <li key={example}>
              <button
                type="button"
                onClick={() => chooseExample(example)}
                className="block w-full text-left text-muted transition-colors hover:text-link"
              >
                <span aria-hidden="true" className="text-accent">
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
