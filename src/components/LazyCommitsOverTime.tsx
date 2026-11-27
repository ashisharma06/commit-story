"use client";

import dynamic from "next/dynamic";
import type { WeekBucket } from "@/lib/analyze";

const CommitsOverTime = dynamic(
  () => import("@/components/CommitsOverTime").then((module) => module.CommitsOverTime),
  {
    ssr: false,
    loading: () => (
      <div className="min-w-0">
        <p className="terminal-label mb-4 text-muted uppercase">
          {"// commits over time"}
        </p>
        <p className="break-words text-sm text-muted">loading chart...</p>
      </div>
    ),
  },
);

export function LazyCommitsOverTime({
  weeks,
}: {
  weeks: readonly WeekBucket[];
}) {
  return <CommitsOverTime weeks={weeks} />;
}
