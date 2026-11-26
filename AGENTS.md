<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Commit Story

A Next.js app that turns any public GitHub repo's history into a readable narrative, like "Spotify Wrapped for a codebase". The user pastes a repo URL; the app fetches commits, PRs and issues, then shows a timeline, charts, and an AI-written story of how the project evolved.

## Stack
- Next.js (App Router), TypeScript (strict), Tailwind CSS
- Octokit (`@octokit/rest`) for GitHub API
- Upstash Redis for caching (free tier)
- Recharts for charts
- Vercel AI SDK (`ai`) with an LLM provider for streaming the narrative
- Zod for validating all external input and API responses
- Deploy target: Vercel

## Conventions
- Use Server Components by default; add `"use client"` only for interactive pieces (charts, copy buttons).
- All GitHub and LLM calls happen server-side (route handlers or server components). Never expose API keys to the client.
- Secrets live in `.env.local`; keep `.env.example` up to date with placeholder names only.
- Keep data-fetching logic in `src/lib/` (`github.ts`, `analyze.ts`, `cache.ts`, `llm.ts`), UI in `src/components/`.
- Validate the `owner/repo` input with Zod; reject anything that doesn't match GitHub's naming rules.
- Handle GitHub rate limits gracefully (show a friendly error with reset time).
- Write small, typed functions. Add unit tests (Vitest) for the analysis functions in `src/lib/analyze.ts`.
- Do not add dependencies without saying why.

## Design direction: Terminal / git log
The whole app should feel like a developer's terminal telling a story. Do NOT use default shadcn or generic SaaS card grids.

**Palette (dark only, single theme)**
- Background `#0b0d10`, surface `#12161b`, border `#1f262e` (1px, sharp, no rounded corners beyond 2px)
- Text `#c9d1d9`, muted `#6b7785`
- Accent green `#7CFFB2` (primary), amber `#FFC857` (warnings, highlights), red `#FF6B6B` (errors), cyan `#5CCFE6` (links, branch lines)
- Define all as CSS variables / Tailwind theme tokens. No other colors.

**Typography**
- Everything in monospace: Geist Mono (or JetBrains Mono) via `next/font`. Headings are the same font, just larger and bold. No second font.

**Signature components**
- `<TerminalWindow>`: window chrome with three dots, a title like `commit-story ~ vercel/next.js`, and a content area. Used to wrap sections.
- `<Prompt>`: renders `$ commit-story analyze owner/repo` with a blinking block cursor. The landing input is a real prompt line (no boxed input).
- `<GitGraph>`: ASCII-style commit graph using `*`, `|`, `/`, `\` characters in accent colors, one line per major commit or merge, with short hashes (7 chars) in amber.
- `<TypeWriter>`: streams text character by character. Used for the AI narrative so it feels like a terminal printing output.
- `<AsciiBar>`: horizontal bars for stats using block characters (e.g. `████████░░ 82%`), used for languages and contributors.
- Charts (Recharts) must be restyled: no gridlines except faint dotted, monospace axis labels, accent-colored strokes, flat fills, no gradients.

**Layout and motion**
- Narrow centered column (max ~900px), generous line height, content reads like terminal output blocks.
- Each era/chapter is a "command": `$ git log --since="2019" --until="2020"` followed by its output.
- Boot sequence on load (3 to 4 quick lines like `fetching commits... done`) that doubles as the real loading state.
- Subtle CRT touches only: faint scanline overlay (opacity ~3%), slight text glow on accent text. Keep it readable.
- Keyboard-first: `j`/`k` move between chapters, `/` focuses the prompt, `?` shows a shortcuts overlay.
- Respect `prefers-reduced-motion` (disable typing animation and scanlines).

## Routes
- `/` : landing page with repo URL input and example repos
- `/story/[owner]/[repo]` : the story page (streams in with Suspense)
- `/story/[owner]/[repo]/opengraph-image` : dynamic OG image
- `/api/story` : route handler that streams the AI narrative

## Definition of done for any task
- `npm run build` and `npm run lint` pass
- No `any` types, no unhandled promise rejections
- Loading and error states exist for every async UI
