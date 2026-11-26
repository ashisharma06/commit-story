"use client";

import { useEffect, useState } from "react";
import { TypeWriter } from "@/components/TypeWriter";

type StoryNarrativeProps = {
  owner: string;
  repo: string;
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
  onRetry,
}: StoryNarrativeProps & { onRetry: () => void }) {
  const [text, setText] = useState("");
  const [status, setStatus] = useState<StoryStatus>("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    void (async () => {
      try {
        const response = await fetch("/api/story", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ owner, repo }),
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
      } catch (cause) {
        if (controller.signal.aborted) return;
        setError(
          cause instanceof Error ? cause.message : "narration stream failed",
        );
        setStatus("error");
      }
    })();

    return () => controller.abort();
  }, [owner, repo]);

  const waiting =
    status === "loading" || (status === "streaming" && text.length === 0);

  return (
    <>
      {waiting ? (
        <p aria-live="polite" className="mt-6 text-sm text-warning">
          generating story...
          <span aria-hidden="true" className="terminal-cursor" />
        </p>
      ) : null}

      {text.length > 0 ? (
        <div className="mt-6">
          <TypeWriter text={text} />
        </div>
      ) : null}

      {status === "done" && text.length === 0 ? (
        <p className="mt-6 text-sm text-muted">no narrative returned</p>
      ) : null}

      {status === "error" ? (
        <div className="mt-6" role="alert">
          <p className="text-sm text-error">error: {error}</p>
          <button
            type="button"
            onClick={onRetry}
            className="mt-3 text-sm text-link hover:underline"
          >
            $ retry
          </button>
        </div>
      ) : null}
    </>
  );
}

export function StoryNarrative({ owner, repo }: StoryNarrativeProps) {
  const [attempt, setAttempt] = useState(0);

  return (
    <section aria-label={`AI narrative for ${owner}/${repo}`}>
      <p className="text-sm">
        <span aria-hidden="true" className="accent-glow text-accent">
          $
        </span>{" "}
        commit-story narrate {owner}/{repo}
      </p>
      <NarrativeRun
        key={`${owner}/${repo}:${attempt}`}
        owner={owner}
        repo={repo}
        onRetry={() => setAttempt((current) => current + 1)}
      />
    </section>
  );
}
