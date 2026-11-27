import { TerminalWindow } from "@/app/components/TerminalWindow";

export default function Loading() {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col justify-center px-4 py-10 sm:px-6 sm:py-16 md:px-8">
      <TerminalWindow title="commit-story ~ booting">
        <div className="min-w-0 space-y-2 text-sm">
          <p className="break-words">
            <span aria-hidden="true" className="text-accent">
              $
            </span>{" "}
            resolving user... <span className="text-accent">done</span>
          </p>
          <p className="break-words text-muted">fetching public repos...</p>
          <p>
            <span aria-hidden="true" className="terminal-cursor" />
          </p>
        </div>
      </TerminalWindow>
    </main>
  );
}
