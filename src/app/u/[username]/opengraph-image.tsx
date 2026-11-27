import { ImageResponse } from "next/og";
import { connection } from "next/server";
import { OgBrand, OgNote, OgPrompt, OgStat, OgTerminal } from "@/components/OgTerminal";
import { loadOgFonts, OG_SIZE } from "@/lib/ogTheme";
import { parseRepoInput } from "@/lib/repo";
import { formatCount } from "@/lib/stats";
import { loadCachedUserRepos } from "@/lib/story";

export const alt = "Commit Story — GitHub repositories";
export const size = OG_SIZE;
export const contentType = "image/png";

function displayName(value: string): string {
  return value.length > 32 ? `${value.slice(0, 29)}...` : value;
}

async function loadPublicRepoCount(username: string): Promise<number | null> {
  try {
    const data = await loadCachedUserRepos(username);
    return data.profile.public_repos;
  } catch {
    return null;
  }
}

export default async function Image({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  await connection();

  const { username } = await params;
  const fonts = await loadOgFonts();
  const parsed = parseRepoInput(username);
  const valid = !("error" in parsed) && parsed.kind === "user";
  const safeName = displayName(valid ? parsed.username : username);
  const count = valid ? await loadPublicRepoCount(parsed.username) : null;

  return new ImageResponse(
    <OgTerminal title={`github.com/${safeName}`}>
      <OgPrompt command={`ls -la github.com/${safeName}/`} />
      {count === null ? (
        <OgNote>public repo count unavailable</OgNote>
      ) : (
        <OgStat label="public repos" value={formatCount(count)} />
      )}
      <OgBrand />
    </OgTerminal>,
    { ...size, fonts },
  );
}
