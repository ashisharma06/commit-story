import Link from "next/link";
import { TerminalWindow } from "@/app/components/TerminalWindow";

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col justify-center px-4 py-10 sm:px-6 sm:py-16 md:px-8">
      <TerminalWindow title="commit-story ~ 404">
        <h1 className="sr-only">Page not found</h1>
        <p className="break-words text-sm">
          <span aria-hidden="true" className="accent-glow text-accent">
            $
          </span>{" "}
          cd /that-page
        </p>
        <p role="alert" className="mt-6 break-words text-sm text-error">
          bash: no such page
        </p>
        <Link
          href="/"
          className="mt-8 inline-block text-sm text-link hover:underline"
        >
          $ cd /
        </Link>
      </TerminalWindow>
    </main>
  );
}
