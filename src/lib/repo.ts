import { z } from "zod";

const GITHUB_NAME_PATTERN =
  /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/;
const NO_DOUBLE_HYPHEN = /^(?!.*--)/;
const NAME_PATTERN = /^[A-Za-z0-9._-]{1,100}$/;

export const usernameSchema = z
  .string()
  .regex(GITHUB_NAME_PATTERN)
  .refine((value) => NO_DOUBLE_HYPHEN.test(value));

export const repoSchema = z.object({
  owner: usernameSchema,
  repo: z.string().regex(NAME_PATTERN).refine((name) => !name.endsWith(".git")),
});

export type Repo = z.infer<typeof repoSchema>;
export type ParsedRepoInput =
  | { kind: "user"; username: string }
  | { kind: "repo"; owner: string; repo: string };
export type ParseRepoInputResult = ParsedRepoInput | { error: string };

const INVALID_INPUT =
  "Enter a GitHub username or owner/repo (or a github.com URL).";

function failure(): ParseRepoInputResult {
  return { error: INVALID_INPUT };
}

function normalize(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";

  const atMention = /^@([^/]+)$/.exec(trimmed);
  if (atMention) return atMention[1];

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

export function parseRepoInput(input: unknown): ParseRepoInputResult {
  if (typeof input !== "string") return failure();

  const normalized = normalize(input)
    .split(/[?#]/, 1)[0]
    .replace(/^\/+|\/+$/g, "");
  const segments = normalized.split("/").filter(Boolean);

  if (segments.length === 1) {
    const parsed = usernameSchema.safeParse(segments[0]);
    if (!parsed.success) return failure();
    return { kind: "user", username: parsed.data };
  }

  if (segments.length < 2) return failure();

  const [owner, rawName] = segments;
  const repo = rawName.replace(/\.git$/i, "");
  const parsed = repoSchema.safeParse({ owner, repo });
  if (!parsed.success) return failure();

  return { kind: "repo", owner: parsed.data.owner, repo: parsed.data.repo };
}
