import { z } from "zod";

const OWNER_PATTERN = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/;
const NO_DOUBLE_HYPHEN = /^(?!.*--)/;
const NAME_PATTERN = /^[A-Za-z0-9._-]{1,100}$/;

export const repoSchema = z.object({
  owner: z.string().regex(OWNER_PATTERN).refine((owner) => NO_DOUBLE_HYPHEN.test(owner)),
  repo: z.string().regex(NAME_PATTERN).refine((name) => !name.endsWith(".git")),
});

export type Repo = z.infer<typeof repoSchema>;
export type ParsedRepo = Repo & { slug: string };
export type ParseRepoResult =
  | { success: true; repo: ParsedRepo }
  | { success: false; error: string };

const INVALID_INPUT =
  "Enter a public GitHub repo as owner/repo or a github.com URL.";

function failure(): ParseRepoResult {
  return { success: false, error: INVALID_INPUT };
}

function normalize(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";

  const ssh = /^git@github\.com:(.+)$/i.exec(trimmed);
  if (ssh) return ssh[1];

  if (/^[a-z][a-z\d+.-]*:\/\//i.test(trimmed)) {
    let url: URL;
    try {
      url = new URL(trimmed);
    } catch {
      return "";
    }
    if (url.protocol !== "http:" && url.protocol !== "https:") return "";
    const host = url.hostname.toLowerCase();
    if (host !== "github.com" && host !== "www.github.com") return "";
    return url.pathname;
  }

  return trimmed.replace(/^(?:www\.)?github\.com\//i, "");
}

export function parseRepoInput(input: unknown): ParseRepoResult {
  if (typeof input !== "string") return failure();

  const normalized = normalize(input)
    .split(/[?#]/, 1)[0]
    .replace(/^\/+|\/+$/g, "");
  const segments = normalized.split("/").filter(Boolean);
  if (segments.length < 2) return failure();

  const [owner, rawName] = segments;
  const repo = rawName.replace(/\.git$/i, "");
  const parsed = repoSchema.safeParse({ owner, repo });
  if (!parsed.success) return failure();

  return {
    success: true,
    repo: {
      ...parsed.data,
      slug: `${parsed.data.owner}/${parsed.data.repo}`,
    },
  };
}
