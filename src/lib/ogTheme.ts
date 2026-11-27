import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const OG_SIZE = { width: 1200, height: 630 } as const;
export const OG_FONT_NAME = "JetBrains Mono";

export const OG_COLORS = {
  background: "#0b0d10",
  surface: "#12161b",
  border: "#1f262e",
  text: "#c9d1d9",
  muted: "#6b7785",
  accent: "#7CFFB2",
  warning: "#FFC857",
  error: "#FF6B6B",
  link: "#5CCFE6",
} as const;

type OgFont = {
  name: string;
  data: Buffer;
  style: "normal";
  weight: 400;
};

let fontsPromise: Promise<OgFont[]> | undefined;

/** Font is bundled in the repo; no CDN or runtime network fetch. */
export function loadOgFonts(): Promise<OgFont[]> {
  fontsPromise ??= readFile(
    join(process.cwd(), "src/assets/fonts/JetBrainsMono-Regular.ttf"),
  )
    .then((data): OgFont[] => [
      { name: OG_FONT_NAME, data, style: "normal", weight: 400 },
    ])
    .catch(() => {
      console.warn("[commit-story] Bundled OG font unavailable; using fallback.");
      return [];
    });
  return fontsPromise;
}
