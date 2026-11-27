import { ImageResponse } from "next/og";
import { connection } from "next/server";
import {
  OgBar,
  OgBrand,
  OgNote,
  OgPrompt,
  OgStat,
  OgTerminal,
} from "@/components/OgTerminal";
import { analyzeRepo, type RepoInsights } from "@/lib/analyze";
import type { LanguageSummary } from "@/lib/github";
import { loadOgFonts, OG_SIZE } from "@/lib/ogTheme";
import { parseRepoInput } from "@/lib/repo";
import {
  activeYears,
  formatCount,
  topLanguageLabel,
  yearsLabel,
} from "@/lib/stats";
import { loadRepoStoryData } from "@/lib/story";

export const alt = "Commit Story — the story of a codebase";
export const size = OG_SIZE;
export const contentType = "image/png";

type OgSummary = {
  insights: RepoInsights;
  languages: LanguageSummary[];
};

async function loadSummary(owner: string, repo: string): Promise<OgSummary | null> {
  try {
    const data = await loadRepoStoryData(owner, repo);
    return {
      insights: analyzeRepo(data.commits, data.pullRequests),
      languages: data.languages,
    };
  } catch {
    return null;
  }
}

function displaySlug(value: string): string {
  return value.length > 52 ? `${value.slice(0, 49)}...` : value;
}

export default async function Image({
  params,
}: {
  params: Promise<{ owner: string; repo: string }>;
}) {
  await connection();

  const { owner, repo } = await params;
  const slug = `${owner}/${repo}`;
  const fonts = await loadOgFonts();
  const parsed = parseRepoInput(slug);
  const summary =
    !("error" in parsed) && parsed.kind === "repo"
      ? await loadSummary(parsed.owner, parsed.repo)
      : null;

  return new ImageResponse(
    <OgTerminal title={displaySlug(slug)}>
      <OgPrompt command={`commit-story analyze ${displaySlug(slug)}`} />
      {summary ? (
        <>
          <OgStat
            label="total commits"
            value={formatCount(summary.insights.totalCommits)}
          />
          <OgStat
            label="contributors"
            value={formatCount(summary.insights.totalContributors)}
          />
          <OgStat
            label="years active"
            value={yearsLabel(
              activeYears(
                summary.insights.firstCommitAt,
                summary.insights.lastCommitAt,
              ),
            )}
          />
          <OgBar value={topLanguageLabel(summary.languages)} />
        </>
      ) : (
        <OgNote>stats unavailable · showing branded card</OgNote>
      )}
      <OgBrand />
    </OgTerminal>,
    { ...size, fonts },
  );
}
