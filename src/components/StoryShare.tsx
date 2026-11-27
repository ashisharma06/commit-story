"use client";

import { useEffect, useState } from "react";
import { storyMarkdown, type StoryMarkdownData } from "@/lib/storyMarkdown";

type Feedback = { id: number; message: string; isError?: boolean };

async function copyText(value: string): Promise<boolean> {
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch {
    // Fall through to the legacy path below.
  }

  try {
    const area = document.createElement("textarea");
    area.value = value;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    const copied = document.execCommand("copy");
    area.remove();
    return copied;
  } catch {
    return false;
  }
}

function CommandButton({
  command,
  onClick,
  disabled,
}: {
  command: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex min-h-11 items-center text-sm text-link hover:underline disabled:cursor-not-allowed disabled:text-muted"
    >
      {command}
    </button>
  );
}

export function StoryShare({
  narrative,
  data,
}: {
  narrative: string;
  data: StoryMarkdownData;
}) {
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  useEffect(() => {
    if (!feedback) return;
    const timer = window.setTimeout(() => setFeedback(null), 2400);
    return () => window.clearTimeout(timer);
  }, [feedback]);

  function report(message: string, isError = false): void {
    setFeedback({ id: Date.now(), message, isError });
  }

  async function handleCopyLink(): Promise<void> {
    const copied = await copyText(window.location.href);
    report(copied ? "copied: link" : "error: clipboard unavailable", !copied);
  }

  async function handleBadge(): Promise<void> {
    const snippet = `[![Commit Story](${data.siteUrl}/badge/${data.owner}/${data.repo})](${data.siteUrl}/story/${data.owner}/${data.repo})`;
    const copied = await copyText(snippet);
    report(copied ? "copied: badge snippet" : "error: clipboard unavailable", !copied);
  }

  function handleExport(): void {
    if (!narrative.trim()) return;

    try {
      const markdown = storyMarkdown(data, narrative);
      const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${data.owner}-${data.repo}.story.md`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 0);
      report("exported: story.md");
    } catch {
      report("error: export failed", true);
    }
  }

  return (
    <section aria-label="Share this story" className="mt-6 min-w-0">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <CommandButton command="$ copy link" onClick={() => void handleCopyLink()} />
        <CommandButton
          command="$ export story.md"
          onClick={handleExport}
          disabled={!narrative.trim()}
        />
        <CommandButton command="$ badge" onClick={() => void handleBadge()} />
      </div>
      {feedback ? (
        <p
          key={feedback.id}
          role={feedback.isError ? "alert" : "status"}
          aria-live="polite"
          className={`mt-2 break-words text-xs ${feedback.isError ? "text-error" : "text-accent"}`}
        >
          {feedback.message}
        </p>
      ) : null}
    </section>
  );
}
