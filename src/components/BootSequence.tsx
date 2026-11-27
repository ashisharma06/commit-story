import { TerminalWindow } from "@/app/components/TerminalWindow";

export type BootStage = "route" | "repo" | "history" | "user" | "repos";
export type BootVariant = "repo" | "user";

type BootStep = { key: BootStage; label: string };

const STEPS: Record<BootVariant, readonly BootStep[]> = {
  repo: [
    { key: "route", label: "resolving route" },
    { key: "repo", label: "reading repository metadata" },
    { key: "history", label: "streaming commits and pull requests" },
  ],
  user: [
    { key: "route", label: "resolving route" },
    { key: "user", label: "reading GitHub profile" },
    { key: "repos", label: "streaming public repositories" },
  ],
};

export function BootLines({
  stage,
  variant = "repo",
}: {
  stage: BootStage;
  variant?: BootVariant;
}) {
  const steps = STEPS[variant];
  const found = steps.findIndex((step) => step.key === stage);
  const current = Math.max(0, found);

  return (
    <ol aria-live="polite" className="min-w-0 space-y-1 text-sm">
      {steps.map((step, index) => {
        const state =
          index < current ? "done" : index === current ? "running" : "queued";
        const color =
          state === "done"
            ? "text-accent"
            : state === "running"
              ? "text-warning"
              : "text-muted";

        return (
          <li key={step.key} className={`break-words ${color}`}>
            [{state === "done" ? "x" : state === "running" ? "…" : " "}]{" "}
            {step.label}
            {state === "done" ? "..." : null}
          </li>
        );
      })}
      <li aria-hidden="true">
        <span className="terminal-cursor" />
      </li>
    </ol>
  );
}

export function BootSequence({
  stage,
  variant = "repo",
  title = "commit-story ~ booting",
}: {
  stage: BootStage;
  variant?: BootVariant;
  title?: string;
}) {
  return (
    <TerminalWindow title={title}>
      <BootLines stage={stage} variant={variant} />
    </TerminalWindow>
  );
}
