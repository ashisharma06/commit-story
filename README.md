# commit story_

**Your code has a story. Read it.**

Commit Story turns any public GitHub user's repository history into a terminal-style visual timeline and an AI-written narrative. Enter a username, pick a repo, and read its history as chapters: commits, contributors, eras, and the people behind the code.

**Live demo:** [commit-story-mu.vercel.app](https://commit-story-mu.vercel.app/)

<img width="1428" height="909" alt="image" src="https://github.com/user-attachments/assets/d720ec07-6c8a-4541-8c4a-229768fdb8b6" />



---

## Features

- **Username or repo input**: enter `username` or `owner/repo` (full GitHub URLs and `git@github.com` addresses also work). A username opens a repo picker; `owner/repo` goes straight to the story.
- **Terminal-style repo picker**: an `ls -la`-style listing with live filtering, a toggle to hide forks and archived repos, and keyboard navigation.
- **Repository insights**: commits per week, busiest day and hour, contributor leaderboard, longest commit streak, biggest commits, and automatically detected "eras" of the project.
- **Visual timeline**: ASCII git graph, block-character bars, a contribution heatmap, and an activity chart, all in one consistent terminal theme.
- **AI-written story**: a streamed narrative, one chapter per era, grounded only in the repository's real data.
- **Handles thin data gracefully**: repos with one commit or one contributor show honest, compact output instead of empty sections.
- **Keyboard-first**: auto-focused prompt, `/` to focus input, `j`/`k` to move around, `?` for shortcuts.
- **Responsive and accessible**: works from phone to desktop and respects `prefers-reduced-motion`.

## How it works


<img width="3309" height="763" alt="image" src="https://github.com/user-attachments/assets/1ba82d80-1b02-4ecd-91c1-a5830934620a" />



## Tech stack

| Area | Tools |
|---|---|
| Framework | Next.js (App Router), React, TypeScript |
| Styling | Tailwind CSS, custom terminal design system |
| Data | Octokit (GitHub REST API), Zod |
| Charts | Recharts, custom ASCII components |
| AI | Vercel AI SDK, Google Gemini |
| Testing | Vitest |
| Deployment | Vercel |

## Getting started

### Prerequisites

- Node.js 20 or newer
- A [GitHub personal access token](https://github.com/settings/tokens) (no scopes needed for public repos)
- An LLM API key (Google AI Studio offers a free tier)

### Setup

```bash
git clone https://github.com/ashisharma06/commit-story.git
cd commit-story
npm install
cp .env.example .env.local
```

Fill in `.env.local`:

```
GITHUB_TOKEN=
GOOGLE_GENERATIVE_AI_API_KEY=
AI_MODEL=
```

| Variable | Purpose |
|---|---|
| `GITHUB_TOKEN` | Raises the GitHub API limit from 60 to 5,000 requests per hour |
| `GOOGLE_GENERATIVE_AI_API_KEY` | API key for the LLM that writes the story |
| `AI_MODEL` | Model name to use, so it can be swapped without code changes |

Then start the dev server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the development server |
| `npm run build` | Create a production build |
| `npm run lint` | Run ESLint |
| `npm run test` | Run unit tests with Vitest |

## Project structure

```
src/
  app/
    page.tsx                   Landing page with the prompt
    u/[username]/              Repository picker
    story/[owner]/[repo]/      Story page
    api/story/                 Streaming narrative route handler
  components/                  Terminal UI: prompt, graph, bars, heatmap, chapters
  lib/
    repo.ts                    Input parsing and validation
    github.ts                  GitHub API client
    analyze.ts                 Insights and era detection
    llm.ts                     Prompt building for the narrative
```

## Design

The whole app is styled as a terminal: a dark theme, a single monospace font, a green accent, ASCII graph and bar components, a boot-sequence loading state, and a typewriter effect for the AI story.

## Known limitations

- Only **public** repositories are supported.
- History is capped at the most recent 1,000 commits per repository for speed and API limits.
- Rate limiting is **in-memory**, so it is not reliable across serverless instances.
- There is **no caching** yet, so each visit refetches data and regenerates the story.
- The AI narrative is grounded in commit messages and statistics, so repos with vague commit messages produce vaguer stories.

## Possible next steps

- Redis caching and distributed rate limiting
- Dynamic Open Graph images for shareable links
- Embeddable README badge
- GitHub OAuth for private repositories
- Compare two repositories side by side

## Author

Built by [Ashish Sharma](https://github.com/ashisharma06).
=======
# Commit Story

A terminal-style Next.js app that turns a public GitHub repository's history into a readable, streamed narrative. Commit, PR, and language data is analyzed on the server; the browser only receives the rendered story.

## Setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Server-only environment variables:

- `GITHUB_TOKEN` — optional; raises the GitHub API limit from 60 to 5,000 requests/hour.
- `GOOGLE_GENERATIVE_AI_API_KEY` — required to generate new narratives.
- `AI_MODEL` — optional; defaults to `gemini-2.5-flash`.
- `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` — optional; enable shared caching and rate limits.

Never expose these values to the client. Local dev without Upstash credentials logs one warning, disables caching, and uses in-memory rate limiters instead of crashing.

## Caching and rate limits

Upstash Redis is used for shared caching and distributed rate limiting. `@upstash/ratelimit` provides sliding-window limits; `@upstash/redis` stores JSON cache entries.

- Repository metadata, commits, PRs, and languages are cached for 6 hours under `cs:repo:{owner}/{repo}:{latestCommitSha}`.
- Narratives are cached for 24 hours under `cs:narrative:{owner}/{repo}:{latestCommitSha}` and replayed as a text stream, so the typewriter still works without calling the LLM.
- User repo lists are cached for 15 minutes.
- Only complete, successful, non-empty generations are cached. Errors, aborts, and truncated streams are never cached.
- `$ refresh` on the story page bypasses the cache and is limited to 1 refresh per repo per 5 minutes per IP.
- New narrations are limited to 5 requests per minute per IP and 30 per day per IP. Cached narrative hits do not consume either limit. 429 responses include the reset time in the terminal error line.

## Commands

```bash
npm run dev
npm run test
npm run lint
npm run build
```

## Deploy

Deploy to Vercel with the server-only environment variables above configured in the project settings.
>>>>>>> 778a40d (Add caching and proper rate limiting with Upstash Redis)
