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
        return;
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeIndex, filtered, router, username]);

  return (
    <div>
      <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-baseline gap-2 text-sm">
          <label htmlFor="repo-filter" className="whitespace-nowrap text-text">
            <span aria-hidden="true" className="accent-glow text-accent">
              $
            </span>{" "}
            grep{" "}
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
            className="min-w-0 flex-1 bg-transparent text-text caret-transparent outline-none placeholder:text-muted"
            style={{ width: `${Math.max(query.length, 9)}ch` }}
          />
          <span aria-hidden="true" className="terminal-cursor" />
        </div>

        <button
          type="button"
          onClick={() => {
            setHideExtras((current) => !current);
            setSelectedIndex(0);
          }}
          aria-pressed={hideExtras}
          className="text-xs text-muted transition-colors hover:text-accent"
        >
          [{hideExtras ? "x" : " "}] hide forks + archived
        </button>
      </div>

      <p className="mt-8 text-sm text-muted">select a repository to analyze:</p>

      {filtered.length === 0 ? (
        <p className="mt-4 text-sm text-error">
          {repos.length === 0
            ? "no public repositories found"
            : "no repositories match the current filters"}
        </p>
      ) : (
        <div className="mt-3 border-y border-border">
          {filtered.map((repo, index) => {
            const active = index === activeIndex;
            return (
              <Link
                key={`${repo.name}-${index}`}
                ref={(node) => {
                  rowRefs.current[index] = node;
                }}
                href={`/story/${username}/${repo.name}`}
                aria-current={active ? "page" : undefined}
                className={`block border-l-2 px-3 py-3 transition-colors ${
                  active
                    ? "border-accent bg-surface text-accent"
                    : "border-transparent text-text hover:bg-surface"
                }`}
              >
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm">
                  <span
                    aria-hidden="true"
                    className={`w-3 ${active ? "text-accent" : "text-transparent"}`}
                  >
                    {">"}
                  </span>
                  <span className="font-bold">{repo.name}</span>
                  <span className={active ? "text-accent" : "text-muted"}>
                    {repo.language ?? "unknown"}
                  </span>
                  <span className="text-warning">
                    {repo.stargazers_count.toLocaleString()} stars
                  </span>
                  <span className={active ? "text-accent" : "text-muted"}>
                    {repo.pushedLabel}
                  </span>
                  {repo.fork ? (
                    <span className="text-warning">[fork]</span>
                  ) : null}
                  {repo.archived ? (
                    <span className="text-warning">[archived]</span>
                  ) : null}
                </div>
                {repo.description ? (
                  <p
                    className={`mt-1 truncate pl-6 text-xs ${active ? "text-accent" : "text-muted"}`}
                  >
                    {repo.description}
                  </p>
                ) : null}
              </Link>
            );
          })}
        </div>
      )}

      <p className="mt-6 text-xs text-muted">
        [j/k] move · [enter] open · [/] filter · [esc] leave filter
      </p>
    </div>
  );
}
