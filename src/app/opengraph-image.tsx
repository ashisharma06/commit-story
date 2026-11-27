import { ImageResponse } from "next/og";
import { OgBrand, OgNote, OgPrompt, OgTerminal } from "@/components/OgTerminal";
import { loadOgFonts, OG_COLORS, OG_SIZE } from "@/lib/ogTheme";

export const alt = "Commit Story — your repo, told as a story";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image() {
  const fonts = await loadOgFonts();

  return new ImageResponse(
    <OgTerminal title="landing">
      <OgPrompt command="commit-story --help" />
      <OgNote>Your code has a story. Read it.</OgNote>
      <div
        style={{
          display: "flex",
          marginTop: 24,
          fontSize: 28,
          color: OG_COLORS.text,
        }}
      >
        Enter a GitHub username or owner/repo.
      </div>
      <OgBrand />
    </OgTerminal>,
    { ...size, fonts },
  );
}
