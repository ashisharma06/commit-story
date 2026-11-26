import { TerminalWindow } from "@/app/components/TerminalWindow";

export default function Loading() {
  return (
    <main className="mx-auto flex w-full max-w-[900px] flex-1 flex-col justify-center px-4 py-16 sm:px-6">
      <TerminalWindow title="commit-story ~ booting">
        <div className="space-y-2 text-sm">
          <p>
            <span aria-hidden="true" className="text-accent">
              $
            </span>{" "}
            resolving repo... <span className="text-accent">done</span>
          </p>
          <p className="text-muted">
            fetching commits, pull requests, contributors, languages...
          </p>
          <p>
            <span aria-hidden="true" className="terminal-cursor" />
          </p>
        </div>
      </TerminalWindow>
    </main>
  );
}
