import { formatCount } from "@/lib/stats";

export function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function badgeSvg(label: string): string {
  const text = escapeXml(label);
  const width = Math.max(220, label.length * 8 + 44);

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="28" viewBox="0 0 ${width} 28" role="img" aria-label="${text}">`,
    `<rect x="0.5" y="0.5" width="${width - 1}" height="27" fill="#12161b" stroke="#1f262e"/>`,
    '<text x="12" y="19" font-family="monospace" font-size="13" fill="#7CFFB2">&gt;_</text>',
    `<text x="42" y="19" font-family="monospace" font-size="13" fill="#c9d1d9">${text}</text>`,
    "</svg>",
  ].join("");
}

export function commitBadgeSvg(totalCommits: number): string {
  return badgeSvg(`commit story | ${formatCount(totalCommits)} commits`);
}

export function neutralBadgeSvg(): string {
  return badgeSvg("commit story | stats unavailable");
}
