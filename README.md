# commit story_

**Your code has a story. Read it.**

Commit Story turns a public GitHub repository's history into a terminal-style narrative: commits, contributors, eras, charts, and an AI-written story. Paste a username to browse repos, or paste `owner/repo` to go straight to the story.

## Features

- **Terminal-first UI**: monospace type, ASCII git graph, block-character bars, boot sequence, typewriter narrative, and keyboard shortcuts.
- **Real repository insights**: commits per week, busiest day/hour, contributors, streaks, biggest commits, languages, and detected eras.
- **Streamed AI narrative**: grounded in commit and PR data, with `$ refresh` to regenerate after a new HEAD.
- **Shareable output**: dynamic Open Graph cards, `$ copy link`, `$ export story.md`, `$ badge`, robots.txt, and sitemap.
- **Resilient by default**: graceful GitHub error states, missing-cache fallback, and branded OG/badge fallbacks.

## Setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment variables

| Variable | Purpose |
|---|---|
| `GITHUB_TOKEN` | Optional; raises the GitHub API limit from 60 to 5,000 requests/hour. |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Server-only key required to generate new narratives. |
| `AI_MODEL` | Optional; defaults to `gemini-2.5-flash`. |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | Optional; enable shared caching and rate limits. |
| `NEXT_PUBLIC_SITE_URL` | Public canonical URL for metadata, sitemap, robots, and badge snippets. |

Server-only keys are never exposed to the client. Without Upstash credentials, local development logs one warning, disables caching, and uses in-memory rate limiters.

## Caching and rate limits

- Repository metadata, commits, PRs, and languages are cached for 6h under `cs:repo:{owner}/{repo}:{latestCommitSha}`.
- Narratives are cached for 24h under `cs:narrative:{owner}/{repo}:{latestCommitSha}` and replayed as a stream so the typewriter still works.
- User repo lists are cached for 15m.
- Only complete, successful, non-empty streams are cached.
- New narrations are limited to 5/min and 30/day per IP; `$ refresh` is limited to 1 per repo per 5m per IP.

## Sharing and discovery

- Story, user, and landing pages generate Open Graph/Twitter metadata from live stats where available.
- OG images are generated with `next/og` at 1200×630 using a bundled JetBrains Mono font and fall back to branded cards on fetch errors.
- `/badge/[owner]/[repo]` returns a small terminal-colored SVG with 1h CDN caching.
- `$ badge` copies a README snippet built from `NEXT_PUBLIC_SITE_URL`.
- `/robots.txt`, `/sitemap.xml`, and a green `>_` favicon are included.

## Commands

```bash
npm run dev
npm run test
npm run lint
npm run build
```

## Notes

- Only public repositories are supported.
- History is capped at the 1,000 most recent commits per repository.
- The AI narrative is grounded in real data, so vague commit messages produce vaguer stories.
