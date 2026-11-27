"use client";

import { useCallback, useEffect, useState } from "react";
import { StoryShare } from "@/components/StoryShare";
import { TypeWriter } from "@/components/TypeWriter";
import type { StoryMarkdownData } from "@/lib/storyMarkdown";
import { relativeTime } from "@/lib/time";

type StoryNarrativeProps = {
  owner: string;
  repo: string;
  cachedAt: string | null;
  share: StoryMarkdownData;
};

type StoryStatus = "loading" | "streaming" | "done" | "error";

function readError(payload: unknown): string | null {
  if (typeof payload !== "object" || payload === null) return null;
  const record = payload as Record<string, unknown>;
  return typeof record.error === "string" ? record.error : null;
}

function NarrativeRun({
  owner,
  repo,
  refresh,
  share,
  onRetry,
  onCachedAt,
  onBusyChange,
}: {
  owner: string;
  repo: string;
  refresh: boolean;
  share: StoryMarkdownData;
  onRetry: () => void;
  onCachedAt: (value: string) => void;
  onBusyChange: (value: boolean) => void;
}) {
  const [text, setText] = useState("");
  const [status, setStatus] = useState<StoryStatus>("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    onBusyChange(true);

    void (async () => {
      try {
        const response = await fetch("/api/story", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ owner, repo, refresh }),
          signal: controller.signal,
        });
        if (controller.signal.aborted) return;

        if (!response.ok) {
          const payload: unknown = await response.json().catch(() => null);
          throw new Error(
            readError(payload) ?? `narration failed (${response.status})`,
          );
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error("narration stream unavailable");

        const decoder = new TextDecoder();
        setStatus("streaming");

        for (;;) {
          const { done, value } = await reader.read();
          if (controller.signal.aborted) {
            await reader.cancel().catch(() => undefined);
            return;
          }
          if (done) break;
          if (value && value.byteLength > 0) {
            const chunk = decoder.decode(value, { stream: true });
            setText((current) => current + chunk);
          }
        }

        if (controller.signal.aborted) return;
        setText((current) => current + decoder.decode());
        setStatus("done");
        onCachedAt(
          response.headers.get("x-commit-story-cached-at") ??
            new Date().toISOString(),
        );
        onBusyChange(false);
      } catch (cause) {
        if (controller.signal.aborted) return;
        setError(
          cause instanceof Error ? cause.message : "narration stream failed",
        );
        setStatus("error");
        onBusyChange(false);
      }
    })();

    return () => controller.abort();
  }, [owner, repo, refresh, onCachedAt, onBusyChange]);

  const waiting =
    status === "loading" || (status === "streaming" && text.length === 0);

  return (
    <div className="min-w-0">
      {waiting ? (
        <p aria-live="polite" className="mt-6 break-words text-sm text-warning">
          generating story...
          <span aria-hidden="true" className="terminal-cursor" />
        </p>
      ) : null}

      {text.length > 0 ? (
        <div className="mt-6 min-w-0">
          <TypeWriter text={text} />
        </div>
      ) : null}

      {status === "done" && text.length === 0 ? (
        <p className="mt-6 text-sm text-muted">no narrative returned</p>
      ) : null}

      {status === "error" ? (
        <div className="mt-6 min-w-0" role="alert">
          <p className="break-words text-sm text-error">error: {error}</p>
          <button
            type="button"
            onClick={onRetry}
            className="mt-3 flex min-h-11 items-center text-sm text-link hover:underline"
          >
            $ retry
          </button>
        </div>
      ) : null}

      <StoryShare narrative={text} data={share} />
    </div>
  );
}

export function StoryNarrative({
  owner,
  repo,
  cachedAt,
  share,
}: StoryNarrativeProps) {
  const [run, setRun] = useState({ attempt: 0, refresh: false });
  const [lastUpdated, setLastUpdated] = useState<string | null>(cachedAt);
  const [busy, setBusy] = useState(true);

  const handleCachedAt = useCallback((value: string) => {
    setLastUpdated(value);
  }, []);
  const handleBusyChange = useCallback((value: boolean) => {
    setBusy(value);
  }, []);

  function start(nextRefresh: boolean) {
    setRun((current) => ({ attempt: current.attempt + 1, refresh: nextRefresh }));
  }

  return (
    <section aria-label={`AI narrative for ${owner}/${repo}`} className="min-w-0">
      <p className="break-words text-sm">
        <span aria-hidden="true" className="accent-glow text-accent">
          $
        </span>{" "}
        commit-story narrate {owner}/{repo}
      </p>
      <NarrativeRun
        key={`${owner}/${repo}:${run.attempt}`}
        owner={owner}
        repo={repo}
        refresh={run.refresh}
        share={share}
        onRetry={() => start(false)}
        onCachedAt={handleCachedAt}
        onBusyChange={handleBusyChange}
      />
      <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted">
        {lastUpdated ? (
          <span>
            last updated:{" "}
            <span suppressHydrationWarning>{relativeTime(lastUpdated)}</span>
          </span>
        ) : null}
        <button
          type="button"
          onClick={() => start(true)}
          disabled={busy}
          className="flex min-h-11 items-center text-link hover:underline disabled:cursor-not-allowed disabled:text-muted"
        >
          $ refresh
        </button>
      </div>
    </section>
  );
}
