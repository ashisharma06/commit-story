import type { Era } from "@/lib/analyze";

export function chapterCommand(era: Era): string {
  const since = era.start?.slice(0, 7) ?? "beginning";
  const until = era.end?.slice(0, 7) ?? "now";
  return `$ git log --since="${since}" --until="${until}" --oneline | wc -l`;
}
