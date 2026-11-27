"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
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
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!showHelp) return;

    restoreFocusRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    closeRef.current?.focus();

    return () => {
      restoreFocusRef.current?.focus();
      restoreFocusRef.current = null;
    };
  }, [showHelp]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!showHelp || !dialog) return;

    function keepFocusInDialog(event: KeyboardEvent) {
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    dialog.addEventListener("keydown", keepFocusInDialog);
    return () => dialog.removeEventListener("keydown", keepFocusInDialog);
  }, [showHelp]);

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
        if (showHelp) {
          restoreFocusRef.current = document.getElementById("repo-input");
        }
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
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="shortcuts-title"
            className="max-h-[calc(100dvh-2rem)] w-full max-w-md min-w-0 overflow-y-auto border border-border bg-surface p-4 sm:p-6"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="flex min-w-0 items-start justify-between gap-4">
              <p id="shortcuts-title" className="break-words text-sm text-accent">
                $ commit-story --help
              </p>
              <button
                ref={closeRef}
                type="button"
                onClick={() => setShowHelp(false)}
                className="flex min-h-11 shrink-0 items-center text-sm text-link hover:underline"
              >
                [esc] close
              </button>
            </div>
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
