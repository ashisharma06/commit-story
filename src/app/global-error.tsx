"use client";

import Link from "next/link";
import { useEffect } from "react";
import { TerminalWindow } from "@/app/components/TerminalWindow";
import "./globals.css";

export default function GlobalError({
  error,
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en" suppressHydrationWarning>
      <body className="flex min-h-dvh flex-col bg-background font-mono text-text">
        <title>Commit Story — runtime error</title>
        <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col justify-center px-4 py-10 sm:px-6 sm:py-16 md:px-8">
          <TerminalWindow title="commit-story ~ runtime error">
            <h1 className="sr-only">Something went wrong</h1>
            <p className="break-words text-sm">
              <span aria-hidden="true" className="accent-glow text-accent">
                $
              </span>{" "}
              retry
            </p>
            <p role="alert" className="mt-6 break-words text-sm text-error">
              error: unexpected runtime failure
            </p>
            <p className="mt-3 break-words text-sm text-muted">
              The app hit an unexpected state. Try again, or head back to the
              prompt.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
              <button
                type="button"
                onClick={() => retry()}
                className="flex min-h-11 items-center text-sm text-link hover:underline"
              >
                $ retry
              </button>
              <Link href="/" className="text-sm text-link hover:underline">
                $ cd /
              </Link>
            </div>
          </TerminalWindow>
        </main>
      </body>
    </html>
  );
}
