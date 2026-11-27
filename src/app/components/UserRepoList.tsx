"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import type { UserRepo } from "@/lib/github";

export type UserRepoRow = UserRepo & { pushedLabel: string };

type UserRepoListProps = {
  username: string;
  repos: UserRepoRow[];
};

export function UserRepoList({ username, repos }: UserRepoListProps) {
  const router = useRouter();
  const filterRef = useRef<HTMLInputElement>(null);
  const rowRefs = useRef<Array<HTMLAnchorElement | null>>([]);
  const [query, setQuery] = useState("");
  const [hideExtras, setHideExtras] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return repos.filter((repo) => {
      if (needle && !repo.name.toLowerCase().includes(needle)) return false;
      if (hideExtras && (repo.fork || repo.archived)) return false;
      return true;
    });
  }, [hideExtras, query, repos]);
  const activeIndex = Math.min(selectedIndex, Math.max(filtered.length - 1, 0));

  useEffect(() => {
    const row = rowRefs.current[activeIndex];
    if (row && typeof row.scrollIntoView === "function") {
      row.scrollIntoView({ block: "nearest" });
    }
  }, [activeIndex, filtered]);

  useEffect(() => {
    function step(delta: number) {
      setSelectedIndex((current) => {
        if (filtered.length === 0) return 0;
        const base = Math.min(current, filtered.length - 1);
        return (base + delta + filtered.length) % filtered.length;
      });
    }

    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target;
      const isTyping =
        target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement;

      if (event.key === "/" && !isTyping) {
        event.preventDefault();
        filterRef.current?.focus();
        return;
      }

      if (event.key === "Escape" && isTyping) {
        filterRef.current?.blur();
        return;
      }

      if (event.key === "ArrowDown") {
        event.preventDefault();
        step(1);
        return;
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        step(-1);
        return;
      }

      if (event.key === "Enter") {
        const repo = filtered[activeIndex];
        if (repo) {
          event.preventDefault();
          router.push(`/story/${username}/${repo.name}`);
        }
        return;
      }

      if (isTyping) return;

      if (event.key === "j") {
        event.preventDefault();
        step(1);
        return;
      }

      if (event.key === "k") {
        event.preventDefault();
        step(-1);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeIndex, filtered, router, username]);

  return (
    <div className="min-w-0">
      <div className="mt-6 flex w-full min-w-0 flex-col gap-3 sm:mt-8 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-h-11 w-full min-w-0 items-center gap-2 border border-border px-3 sm:w-auto sm:flex-1 sm:border-0 sm:px-0">
          <label htmlFor="repo-filter" className="shrink-0 whitespace-nowrap text-sm">
            <span aria-hidden="true" className="accent-glow text-accent">
              $
            </span>{" "}
            grep
          </label>
          <input
            ref={filterRef}
            id="repo-filter"
            type="text"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setSelectedIndex(0);
            }}
            placeholder="repo name"
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            className="min-h-11 min-w-0 flex-1 bg-transparent text-sm text-text caret-transparent outline-none placeholder:text-muted"
          />
          <span aria-hidden="true" className="terminal-cursor shrink-0" />
        </div>

        <button
          type="button"
          onClick={() => {
            setHideExtras((current) => !current);
            setSelectedIndex(0);
          }}
          aria-pressed={hideExtras}
          className="flex min-h-11 w-full min-w-0 items-center justify-center border border-border px-4 text-sm text-muted transition-colors hover:text-accent sm:w-auto sm:justify-start sm:border-0 sm:px-0"
        >
          [{hideExtras ? "x" : " "}] hide forks + archived
        </button>
      </div>

      <p className="mt-8 text-sm text-muted">select a repository to analyze:</p>

      {filtered.length === 0 ? (
        <p className="mt-4 break-words text-sm text-error">
          {repos.length === 0
            ? "no public repositories found"
            : "no repositories match the current filters"}
        </p>
      ) : (
        <div className="mt-3 border-y border-border">
          {filtered.map((repo, index) => {
            const active = index === activeIndex;
            const metaColor = active ? "text-accent" : "text-muted";
            return (
              <Link
                key={`${repo.name}-${index}`}
                ref={(node) => {
                  rowRefs.current[index] = node;
                }}
                href={`/story/${username}/${repo.name}`}
                aria-current={active ? "page" : undefined}
                className={`block min-w-0 border-l-2 px-3 py-3 transition-colors ${
                  active
                    ? "border-accent bg-surface text-accent"
                    : "border-transparent text-text hover:bg-surface"
                }`}
              >
                <div className="flex min-w-0 items-baseline gap-2 text-sm">
                  <span
                    aria-hidden="true"
                    className={`w-3 shrink-0 ${active ? "text-accent" : "text-transparent"}`}
                  >
                    {">"}
                  </span>
                  <span className="min-w-0 break-words font-bold">
                    {repo.name}
                  </span>
                </div>
                {repo.description ? (
                  <p
                    title={repo.description}
                    className={`mt-1 truncate pl-5 text-sm ${metaColor}`}
                  >
                    {repo.description}
                  </p>
                ) : null}
                <div className="mt-2 flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1 pl-5 text-sm">
                  <span className={`min-w-0 break-words ${metaColor}`}>
                    {repo.language ?? "unknown"}
                  </span>
                  <span className="shrink-0 text-warning">
                    {repo.stargazers_count.toLocaleString()} stars
                  </span>
                  <span className={`min-w-0 break-words ${metaColor}`}>
                    {repo.pushedLabel}
                  </span>
                  {repo.fork ? (
                    <span className="shrink-0 text-warning">[fork]</span>
                  ) : null}
                  {repo.archived ? (
                    <span className="shrink-0 text-warning">[archived]</span>
                  ) : null}
                </div>
              </Link>
            );
          })}
        </div>
      )}

      <p className="keyboard-hint mt-6 text-sm text-muted">
        [j/k] move · [enter] open · [/] filter · [esc] leave filter
      </p>
    </div>
  );
}
