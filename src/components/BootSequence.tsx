import { TerminalWindow } from "@/app/components/TerminalWindow";

export type BootStage = "route" | "repo" | "history";

const STEPS = [
  { key: "route", label: "resolving route" },
  { key: "repo", label: "reading repository metadata" },
  { key: "history", label: "streaming commits and pull requests" },
] as const;

export function BootLines({ stage }: { stage: BootStage }) {
  const current = Math.max(
    0,
    STEPS.findIndex((step) => step.key === stage),
  );

  return (
    <ol aria-live="polite" className="space-y-1 text-sm">
      {STEPS.map((step, index) => {
        const state =
          index < current ? "done" : index === current ? "running" : "queued";
        const color =
          state === "done"
            ? "text-accent"
            : state === "running"
              ? "text-warning"
              : "text-muted";

        return (
          <li key={step.key} className={color}>
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
  title = "commit-story ~ booting",
}: {
  stage: BootStage;
  title?: string;
}) {
  return (
    <TerminalWindow title={title}>
      <BootLines stage={stage} />
    </TerminalWindow>
  );
}
