"use client";

import type { ReactNode } from "react";
import { TerminalWindow } from "@/app/components/TerminalWindow";
import { useActiveChapter } from "@/components/StoryKeyboard";
import type { Era } from "@/lib/analyze";
import { chapterCommand } from "@/lib/chapter";

export function Chapter({
  era,
  index,
  children,
}: {
  era: Era;
  index: number;
  children: ReactNode;
}) {
  const active = useActiveChapter() === index;
  const command = chapterCommand(era);

  return (
    <article
      data-chapter-index={index}
      tabIndex={-1}
      className="min-w-0 scroll-mt-8 outline-none"
      aria-current={active ? "step" : undefined}
    >
      <div className={active ? "border-l-2 border-l-accent pl-3" : "pl-3"}>
        <TerminalWindow
          title={`commit-story ~ chapter ${String(index).padStart(2, "0")}`}
        >
          <div className="flex min-w-0 gap-3">
            <span
              aria-hidden="true"
              className={`w-3 shrink-0 ${active ? "text-accent" : "text-muted"}`}
            >
              {active ? ">" : " "}
            </span>
            <div className="min-w-0 flex-1">
              <p className="break-words text-sm text-text">{command}</p>
              <p className="mt-4 break-words text-sm text-muted">
                {era.commitCount} commit{era.commitCount === 1 ? "" : "s"} ·{" "}
                {era.contributorCount} contributor
                {era.contributorCount === 1 ? "" : "s"}
              </p>
              <p className="mt-1 break-words text-sm text-muted">
                authors:{" "}
                {era.topContributors.length > 0
                  ? era.topContributors.join(", ")
                  : "n/a"}
              </p>
              <div className="mt-6 min-w-0">{children}</div>
            </div>
          </div>
        </TerminalWindow>
      </div>
    </article>
  );
}
