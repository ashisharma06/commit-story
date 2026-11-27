[![Commit Story](https://commit-story-mu.vercel.app/badge/ashisharma06/commit-story)](https://commit-story-mu.vercel.app/story/ashisharma06/commit-story)

# commit story_

**Your code has a story. Read it.**

Commit Story turns a public GitHub repository's history into a terminal-style narrative: commits, contributors, eras, charts, and an AI-written story. Paste a username to browse repos, or paste `owner/repo` to go straight to the story.

**Live demo:** [commit-story-mu.vercel.app](https://commit-story-mu.vercel.app)

## Screenshots

<img width="1428" height="909" alt="image" src="https://github.com/user-attachments/assets/d720ec07-6c8a-4541-8c4a-229768fdb8b6" />

### Repository page

<img width="1076" height="907" alt="image" src="https://github.com/user-attachments/assets/c8ab2009-de4f-4fb0-a123-ccddf1662972" />

### Features pages

<img width="1035" height="911" alt="image" src="https://github.com/user-attachments/assets/8947c893-682d-47fa-9f5a-75bd067ca6a5" />
<img width="1132" height="889" alt="image" src="https://github.com/user-attachments/assets/494dc96b-7b96-4fda-9b3d-10165097e86a" />
<img width="1003" height="346" alt="image" src="https://github.com/user-attachments/assets/77035d55-56a6-4613-9fa6-5d0c934252cb" />

## Features

- **Terminal-first UI**: monospace type, ASCII git graph, block-character bars, boot sequence, typewriter narrative, and keyboard shortcuts.
- **Real repository insights**: commits per week, busiest day/hour, contributors, streaks, biggest commits, languages, and detected eras.
- **Streamed AI narrative**: grounded in commit and PR data, with `$ refresh` to regenerate after a new HEAD.
- **Shareable output**: dynamic Open Graph cards, `$ copy link`, `$ export story.md`, `$ badge`, robots.txt, and sitemap.
- **Resilient by default**: distinct public/private/empty/not-found/rate-limit states, friendly error pages, and branded OG/badge fallbacks.
- **Accessible and motion-aware**: visible accent focus, labelled controls, one `h1` per page, and `prefers-reduced-motion` support.

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

## Architecture

| Layer | Location | Responsibility |
|---|---|---|
| Routes | `src/app/` | Landing, story, user, OG images, badge, sitemap, robots, and the streaming narrative API. |
| UI | `src/app/components/`, `src/components/` | Terminal chrome, prompt, charts, ASCII visuals, chapters, share bar, and keyboard controls. |
| GitHub | `src/lib/github.ts` | Validated Octokit calls and typed error classification. |
| Analysis | `src/lib/analyze.ts` | Commit/PR insights, era detection, and milestones. |
| Cache | `src/lib/cache.ts`, `src/lib/story.ts` | Upstash-backed snapshots keyed by the latest commit SHA. |
| Rate limits | `src/lib/rateLimit.ts` | Sliding-window limits for new narratives and refreshes. |
| LLM | `src/lib/llm.ts` | Prompt construction and Vercel AI SDK stream helpers. |

The story page streams repository sections with Suspense, then loads the narrative from `/api/story`. Recharts is loaded on demand from a client wrapper so the chart library stays out of the initial bundle.

## Caching and rate limits

| Cache key | TTL | Contents |
|---|---|---|
| `cs:head:{owner}/{repo}` | 60s | Latest commit SHA pointer. |
| `cs:repo:{owner}/{repo}:{latestCommitSha}` | 6h | Metadata, commits, PRs, contributors, and languages. |
| `cs:narrative:{owner}/{repo}:{latestCommitSha}` | 24h | Completed narrative text. |
| `cs:user:{username}:repos` | 15m | Public repository list. |

- Cached narratives replay as a stream so the typewriter still works.
- Only complete, successful, non-empty streams are cached.
- New narrations are limited to 5/min and 30/day per IP.
- `$ refresh` is limited to 1 per repo per 5m per IP.
- Cached narrative hits do not consume LLM limits.

## Sharing and discovery

- Story, user, and landing pages generate Open Graph/Twitter metadata from live stats where available.
- OG images are generated with `next/og` at 1200×630 using a bundled JetBrains Mono font and fall back to branded cards on fetch errors.
- `/badge/[owner]/[repo]` returns a small terminal-colored SVG with 1h CDN caching.
- `$ copy link`, `$ export story.md`, and `$ badge` live in the story share bar; the badge snippet is built from `NEXT_PUBLIC_SITE_URL`.
- `/robots.txt`, `/sitemap.xml`, and a green `>_` favicon are included.

## Commands

```bash
npm run dev
npm run typecheck
npm run test
npm run lint
npm run build
```

## Notes

- Only public repositories are supported. Private repos show a distinct state when visible to `GITHUB_TOKEN`.
- History is capped at the 1,000 most recent commits per repository.
- Empty repositories show a distinct state instead of an empty story.
- GitHub rate limits include the reset time; GitHub outages show a friendly retry state.
- The AI narrative is grounded in real data, so vague commit messages produce vaguer stories.
