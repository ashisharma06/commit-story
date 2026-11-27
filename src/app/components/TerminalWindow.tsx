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
    <section
      className={`w-full min-w-0 border border-border bg-surface ${className}`.trim()}
    >
      <div className="flex min-w-0 items-center gap-2 border-b border-border px-3 py-2 sm:gap-3 sm:px-4 sm:py-2.5">
        <div className="flex shrink-0 items-center gap-1" aria-hidden="true">
          <span className="h-1.5 w-1.5 bg-[var(--muted-dim)] sm:h-2 sm:w-2" />
          <span className="h-1.5 w-1.5 bg-[var(--muted-dim)] sm:h-2 sm:w-2" />
          <span className="h-1.5 w-1.5 bg-[var(--muted-dim)] sm:h-2 sm:w-2" />
        </div>
        <span
          title={title}
          className="min-w-0 flex-1 truncate text-[11px] text-muted sm:text-xs"
        >
          {title}
        </span>
      </div>
      <div className="min-w-0 px-4 py-5 sm:px-6 sm:py-6 md:px-8 md:py-8">
        {children}
      </div>
    </section>
  );
}
