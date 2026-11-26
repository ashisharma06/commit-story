import { RepoPrompt } from "@/components/RepoPrompt";
import { TerminalWindow } from "@/components/TerminalWindow";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-[900px] flex-1 flex-col justify-center px-4 py-16 sm:px-6">
      <div className="mb-8">
        <p className="accent-glow text-xs tracking-[0.2em] text-accent uppercase">
          {"// a story for every codebase"}
        </p>
        <h1 className="mt-3 text-2xl font-bold leading-tight text-text sm:text-4xl">
          commit story
          <span aria-hidden="true" className="text-accent">
            _
          </span>
        </h1>
        <p className="mt-4 max-w-xl text-sm leading-7 text-text sm:text-base">
          Spotify Wrapped for a repository. Paste a public GitHub repo and read
          its history as chapters: commits, contributors, eras, and the people
          behind the code.
        </p>
      </div>

      <TerminalWindow title="commit-story ~ /">
        <RepoPrompt />
      </TerminalWindow>

      <p className="mt-6 text-xs leading-6 text-muted">
        public repositories only · GitHub URLs, owner/repo, or git@github.com addresses
      </p>
    </main>
  );
}
