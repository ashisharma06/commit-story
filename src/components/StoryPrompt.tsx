"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Prompt } from "@/app/components/Prompt";
import { parseRepoInput } from "@/lib/repo";

export function StoryPrompt({ slug }: { slug: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState(slug);
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

  return (
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
  );
}
