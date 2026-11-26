import type { ReactNode } from "react";

type TerminalWindowProps = {
  title: string;
  children: ReactNode;
  className?: string;
};

export function TerminalWindow({
  title,
  children,
  className = "",
}: TerminalWindowProps) {
  return (
    <section className={`border border-border bg-surface ${className}`.trim()}>
      <div className="flex items-center gap-3 border-b border-border px-4 py-2.5">
        <div className="flex items-center gap-1.5" aria-hidden="true">
          <span className="h-2 w-2 bg-muted" />
          <span className="h-2 w-2 bg-muted" />
          <span className="h-2 w-2 bg-muted" />
        </div>
        <span className="truncate text-xs text-muted">{title}</span>
      </div>
      <div className="px-4 py-6 sm:px-6 sm:py-8">{children}</div>
    </section>
  );
}
