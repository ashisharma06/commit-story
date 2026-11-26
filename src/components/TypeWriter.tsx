"use client";

import {
  useEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function subscribe(onStoreChange: () => void): () => void {
  const query = window.matchMedia(REDUCED_MOTION_QUERY);
  query.addEventListener("change", onStoreChange);
  return () => query.removeEventListener("change", onStoreChange);
}

function clientSnapshot(): boolean {
  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

function serverSnapshot(): boolean {
  return true;
}

function renderInline(value: string): ReactNode[] {
  return value.split(/(\*\*[^*]+\*\*)/g).map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={index} className="font-bold text-text">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <span key={index}>{part}</span>;
  });
}

function renderMarkdown(text: string): ReactNode[] {
  const blocks: ReactNode[] = [];
  let listItems: ReactNode[] = [];

  function flushList(): void {
    if (listItems.length === 0) return;
    blocks.push(
      <ul
        key={`list-${blocks.length}`}
        className="ml-4 mt-2 list-disc space-y-1 text-muted marker:text-accent"
      >
        {listItems}
      </ul>,
    );
    listItems = [];
  }

  text.split("\n").forEach((line, index) => {
    const trimmed = line.trim();

    if (!trimmed) {
      flushList();
      blocks.push(<div key={index} className="h-3" aria-hidden="true" />);
      return;
    }

    const heading = /^(#{1,3})\s+(.*)$/.exec(trimmed);
    if (heading) {
      flushList();
      const Heading = heading[1].length === 1 ? "h2" : "h3";
      blocks.push(
        <Heading key={index} className="mt-5 mb-2 text-sm text-accent">
          {renderInline(heading[2])}
        </Heading>,
      );
      return;
    }

    const bullet = /^[-*]\s+(.*)$/.exec(trimmed);
    if (bullet) {
      listItems.push(<li key={index}>{renderInline(bullet[1])}</li>);
      return;
    }

    flushList();
    blocks.push(
      <p key={index} className="my-2 text-sm leading-7 text-text">
        {renderInline(trimmed)}
      </p>,
    );
  });

  flushList();
  return blocks;
}

export function TypeWriter({
  text,
  charsPerTick = 12,
  tickMs = 16,
}: {
  text: string;
  charsPerTick?: number;
  tickMs?: number;
}) {
  const reducedMotion = useSyncExternalStore(
    subscribe,
    clientSnapshot,
    serverSnapshot,
  );
  const [visibleCount, setVisibleCount] = useState(0);

  useEffect(() => {
    if (reducedMotion || text.length === 0) return;

    const timer = window.setInterval(() => {
      setVisibleCount((current) =>
        Math.min(current + charsPerTick, text.length),
      );
    }, tickMs);
    return () => window.clearInterval(timer);
  }, [reducedMotion, text.length, charsPerTick, tickMs]);

  const visible = reducedMotion ? text : text.slice(0, visibleCount);
  const typing = !reducedMotion && visibleCount < text.length;

  return (
    <div aria-live="polite" aria-busy={typing}>
      {renderMarkdown(visible)}
      {typing ? <span aria-hidden="true" className="terminal-cursor" /> : null}
    </div>
  );
}
