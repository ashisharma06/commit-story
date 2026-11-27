import { ImageResponse } from "next/og";
import { OG_COLORS, OG_FONT_NAME, loadOgFonts } from "@/lib/ogTheme";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

export default async function Icon() {
  const fonts = await loadOgFonts();

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: OG_COLORS.background,
        border: `4px solid ${OG_COLORS.border}`,
        color: OG_COLORS.accent,
        fontFamily: OG_FONT_NAME,
        fontSize: 36,
        letterSpacing: -3,
      }}
    >
      {">_"}
    </div>,
    { ...size, fonts },
  );
}
