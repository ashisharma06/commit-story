const FALLBACK_SITE_URL = "http://localhost:3000";

/** Public canonical site URL, configurable without exposing any secret. */
export function siteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!configured) return FALLBACK_SITE_URL;

  try {
    return new URL(configured).toString().replace(/\/$/, "");
  } catch {
    return FALLBACK_SITE_URL;
  }
}

export function absoluteUrl(path: string): string {
  return new URL(path, `${siteUrl()}/`).toString();
}
