import { connection, type NextRequest } from "next/server";
import { commitBadgeSvg, neutralBadgeSvg } from "@/lib/badge";
import { analyzeRepo } from "@/lib/analyze";
import { parseRepoInput } from "@/lib/repo";
import { loadRepoStoryData } from "@/lib/story";

const HEADERS = {
  "Content-Type": "image/svg+xml; charset=utf-8",
  "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
} as const;

type BadgeContext = {
  params: Promise<{ owner: string; repo: string }>;
};

export async function GET(
  _request: NextRequest,
  { params }: BadgeContext,
): Promise<Response> {
  await connection();
  let svg = neutralBadgeSvg();

  try {
    const { owner, repo } = await params;
    const parsed = parseRepoInput(`${owner}/${repo}`);
    if (!("error" in parsed) && parsed.kind === "repo") {
      const data = await loadRepoStoryData(parsed.owner, parsed.repo);
      const insights = analyzeRepo(data.commits, data.pullRequests);
      svg = commitBadgeSvg(insights.totalCommits);
    }
  } catch {
    svg = neutralBadgeSvg();
  }

  return new Response(svg, { status: 200, headers: HEADERS });
}
