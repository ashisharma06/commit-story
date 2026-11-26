import type { MilestoneCommit } from "@/lib/analyze";

function connector(commit: MilestoneCommit, index: number): string {
  if (commit.isMerge) return "|\\";
  if (index === 0) return "*";
  return index % 4 === 0 ? "|/" : "|";
}

export function GitGraph({
  commits,
  title = "// commit graph",
}: {
  commits: readonly MilestoneCommit[];
  title?: string;
}) {
  if (commits.length === 0) {
    return (
      <div>
        <p className="mb-4 text-xs tracking-[0.18em] text-muted uppercase">
          {title}
        </p>
        <p className="text-sm text-muted">no milestone commits yet</p>
      </div>
    );
  }

  return (
    <div>
      <p className="mb-4 text-xs tracking-[0.18em] text-muted uppercase">
        {title}
      </p>
      <ol className="space-y-1">
        {commits.map((commit, index) => {
          const rail = connector(commit, index);
          return (
            <li
              key={commit.sha}
              className="flex min-w-0 items-baseline gap-3 text-xs leading-6"
            >
              <span
                aria-hidden="true"
                className={`w-6 shrink-0 whitespace-nowrap ${rail === "*" ? "text-accent" : "text-link"}`}
              >
                {rail}
              </span>
              <span className="shrink-0 text-warning">
                {commit.sha.slice(0, 7)}
              </span>
              <span className="min-w-0 flex-1 truncate text-text">
                {commit.message}
              </span>
              <span className="hidden shrink-0 text-muted sm:inline">
                {commit.date.slice(0, 10)}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
