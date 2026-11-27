import type { Metadata } from "next";
import { RepoPrompt } from "@/app/components/RepoPrompt";
import { socialMetadata } from "@/lib/metadata";

export async function generateMetadata(): Promise<Metadata> {
  return socialMetadata({
    title: "Commit Story — your repo, told as a story",
    description:
      "Turn any public GitHub repository's history into a readable, terminal-style narrative.",
    path: "/",
    imagePath: "/opengraph-image",
    imageAlt: "Commit Story — your repo, told as a story",
  });
}

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col justify-center px-4 py-10 sm:px-6 sm:py-16 md:px-8">
      <div className="mb-8 min-w-0">
        <p className="accent-glow terminal-label text-accent uppercase">
          {"// a story for every codebase"}
        </p>
        <h1 className="mt-3 text-[clamp(1.75rem,6vw,3.5rem)] leading-[1.25] font-bold break-words text-text">
          commit story
          <span aria-hidden="true" className="text-accent">
            _
          </span>
        </h1>
        <div className="mt-4 max-w-xl min-w-0">
          <p className="text-base leading-relaxed break-words text-text sm:text-lg">
            Your code has a story. Read it.
          </p>
          <p className="mt-1 text-sm leading-relaxed break-words text-muted">
            Enter a GitHub username or owner/repo.
          </p>
        </div>
      </div>

      <RepoPrompt />

      <p className="mt-6 text-sm leading-relaxed break-words text-muted">
        public repositories only · username or owner/repo · GitHub URLs and
        git@github.com addresses accepted
      </p>
    </main>
  );
}
