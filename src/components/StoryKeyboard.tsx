"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

const ChapterContext = createContext(0);

export function useActiveChapter(): number {
  return useContext(ChapterContext);
}

function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.isContentEditable ||
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT"
  );
}

function scrollBehavior(): ScrollBehavior {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ? "auto"
    : "smooth";
}

export function StoryKeyboard({
  chapterCount,
  children,
}: {
  chapterCount: number;
  children: ReactNode;
}) {
  const [activeIndex, setActiveIndex] = useState(1);
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    function goTo(index: number) {
      if (chapterCount < 1) return;
      const next = ((index - 1 + chapterCount) % chapterCount) + 1;
      setActiveIndex(next);
      const chapter = document.querySelector<HTMLElement>(
        `[data-chapter-index="${next}"]`,
      );
      chapter?.focus({ preventScroll: true });
      chapter?.scrollIntoView({ behavior: scrollBehavior(), block: "start" });
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        if (showHelp) {
          setShowHelp(false);
          return;
        }
        if (isTyping(event.target) && event.target instanceof HTMLElement) {
          event.target.blur();
        }
        return;
      }

      if (isTyping(event.target)) return;

      if (event.key === "?") {
        event.preventDefault();
        setShowHelp((current) => !current);
        return;
      }

      if (event.key === "/") {
        event.preventDefault();
        setShowHelp(false);
        document.getElementById("repo-input")?.focus();
        return;
      }

      if (showHelp) return;

      if (event.key === "j" || event.key === "ArrowDown") {
        event.preventDefault();
        goTo(activeIndex + 1);
        return;
      }

      if (event.key === "k" || event.key === "ArrowUp") {
        event.preventDefault();
        goTo(activeIndex - 1);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeIndex, chapterCount, showHelp]);

  return (
    <ChapterContext.Provider value={activeIndex}>
      {children}
      {showHelp ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-background/95 p-4"
          onMouseDown={() => setShowHelp(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Keyboard shortcuts"
            className="max-h-[calc(100dvh-2rem)] w-full max-w-md min-w-0 overflow-y-auto border border-border bg-surface p-4 sm:p-6"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <p className="break-words text-sm text-accent">
              $ commit-story --help
            </p>
            <dl className="mt-6 space-y-2 text-sm">
              <div className="flex min-w-0 justify-between gap-4 sm:gap-6">
                <dt className="min-w-0 break-words text-muted">next chapter</dt>
                <dd className="shrink-0 text-text">j / ↓</dd>
              </div>
              <div className="flex min-w-0 justify-between gap-4 sm:gap-6">
                <dt className="min-w-0 break-words text-muted">
                  previous chapter
                </dt>
                <dd className="shrink-0 text-text">k / ↑</dd>
              </div>
              <div className="flex min-w-0 justify-between gap-4 sm:gap-6">
                <dt className="min-w-0 break-words text-muted">focus prompt</dt>
                <dd className="shrink-0 text-text">/</dd>
              </div>
              <div className="flex min-w-0 justify-between gap-4 sm:gap-6">
                <dt className="min-w-0 break-words text-muted">
                  close / leave input
                </dt>
                <dd className="shrink-0 text-text">esc</dd>
              </div>
            </dl>
            <p className="mt-6 break-words text-sm text-muted">
              press ? or esc to close
            </p>
          </div>
        </div>
      ) : null}
    </ChapterContext.Provider>
  );
}
