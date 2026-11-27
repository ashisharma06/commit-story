import type { RepoInsights } from "@/lib/analyze";
import type { LanguageSummary } from "@/lib/github";

export function formatCount(value: number): string {
  const safe = Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
  return new Intl.NumberFormat("en-US").format(safe);
}

export function asciiBar(share: number, width = 12): string {
  const safeWidth = Math.max(1, Math.floor(width));
  const ratio = Number.isFinite(share) ? Math.min(1, Math.max(0, share)) : 0;
  const filled = Math.round(ratio * safeWidth);
  return `${"█".repeat(filled)}${"░".repeat(safeWidth - filled)}`;
}

function yearOf(value: string | null): number | null {
  if (!value) return null;
  const time = Date.parse(value);
  if (!Number.isFinite(time)) return null;
  return new Date(time).getUTCFullYear();
}

export function activeYears(
  first: string | null,
  last: string | null,
  now: number = Date.now(),
): number | null {
  const start = yearOf(first);
  const end = yearOf(last) ?? new Date(now).getUTCFullYear();
  if (start === null || !Number.isFinite(end)) return null;
  return Math.max(1, Math.abs(end - start) + 1);
}

export function yearsLabel(years: number | null): string {
  if (years === null) return "unknown";
  return `${years} year${years === 1 ? "" : "s"}`;
}

export function repoStatsDescription(insights: RepoInsights): string {
  const base = `${formatCount(insights.totalCommits)} commits by ${formatCount(
    insights.totalContributors,
  )} contributors`;
  const start = yearOf(insights.firstCommitAt);
  return start === null ? `${base}.` : `${base} since ${start}.`;
}

export function topLanguageLabel(languages: readonly LanguageSummary[]): string {
  const language = languages[0];
  if (!language) return `unknown ${asciiBar(0)} 0%`;
  return `${language.name} ${asciiBar(language.share)} ${Math.round(
    language.share * 100,
  )}%`;
}
