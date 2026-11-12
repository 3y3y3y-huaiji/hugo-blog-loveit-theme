# Android's Tech Weekly

[![CI](https://github.com/3y3y3y-huaiji/hugo-blog-loveit-theme/actions/workflows/ci.yml/badge.svg)](https://github.com/3y3y3y-huaiji/hugo-blog-loveit-theme/actions/workflows/ci.yml)
[![Hugo Version](https://badgen.net/badge/Hugo/v0.169.0/blue)](https://gohugo.io/)
[![Theme LoveIt](https://badgen.net/badge/Theme/LoveIt/orange)](https://github.com/dillonzq/LoveIt)
[![Model Step 5 Preview](https://badgen.net/badge/Model/Step%205%20Preview/blueviolet)](https://build.nvidia.com/stepfun-ai/step-5-preview)
[![Hosting](https://badgen.net/badge/Hosting/Cloudflare%20Pages/F38020)](https://pages.cloudflare.com/)
[![License MIT](https://badgen.net/badge/License/MIT/green)](LICENSE)

> A personal tech weekly. Every Monday at 08:00 Beijing time, GitHub Actions collects my **public GitHub activity** with `gh`, asks **OpenCode CLI + Step 5 Preview** to write a casual retro-style report, verifies it, commits it to `main`, and lets Cloudflare Pages Git integration build and publish the Hugo site.

Live site: <https://hugo-blog-loveit-theme.pages.dev/>

## Environment baseline

| Component | Actual value / usage |
| --- | --- |
| Local Node.js | v26.13.1 at `C:\Program Files\nodejs\node.exe` (preferred on PATH) |
| Local pnpm | 11.22.0 at `C:\Users\安卓人\AppData\Local\pnpm\bin\pnpm` (preferred on PATH) |
| CI Node.js | 26.13.1 (`.ci-node-version`; Pages reads `.node-version` and uses Node 24) |
| CI Hugo | Extended 0.169.0 (`.hugo-version`); Pages defaults to 0.147.7, templates support 0.140+ |
| OpenCode CLI | CI uses 2.2.7; the native Windows binary is incompatible on this machine — use CI/WSL |
| npm registry | Huawei Cloud mirror locally; `pnpm audit` overrides it with npmjs |
| Main deps | Babel 8.1 / TypeScript 6.0.3 / ESLint 10.14 / Prettier 3.9 / typescript-eslint 8.72 / dotenv 18 |

Run `pnpm run env:check` to reproduce the local environment.

## What it does

- **Personal, not a news feed**: tracks commits, PRs, issues, and releases instead of generating generic AI news from RSS.
- **Public data only**: reads `/users/{user}/events/public` and GitHub search APIs; no private repos, code diffs, tokens, or emails.
- **OpenCode + Step 5 Preview**: calls `nvidia/stepfun-ai/step-5-preview` through OpenCode's built-in `nvidia` provider. The model only writes; collection, validation, and publishing are deterministic scripts.
- **Casual style**: voice, structure, and output markers live in [`prompts/weekly-report.md`](prompts/weekly-report.md).
- **Explicit failure semantics**: model errors, malformed output, or a too-short body fail the job. An empty week is skipped instead of hallucinated.
- **Quality gates**: Prettier, ESLint, theme typecheck, content contract, 24 `node:test` tests, Hugo build artifact checks, production dependency audit, Lychee link check, and online smoke.
- **Archive**: early `ai-generated-*` posts live in `content/archive/` and are no longer generated.

## Pipeline

```text
Monday 00:00 UTC (Beijing 08:00)
  -> gh public events
  -> enrich PushEvent commits by head ref
  -> search PRs / issues
  -> activity.json
  -> OpenCode CLI with nvidia/stepfun-ai/step-5-preview
  -> TITLE / DESCRIPTION / BODY parsing
  -> canonical front matter + content contract
  -> content/posts/weekly-YYYY-Www.md
  -> push main
  -> Cloudflare Pages build
```

## Project structure

```text
hugo-blog-loveit-theme/
├── .agents/AGENTS.md               # agent rules, branch policy, quality gates
├── .github/workflows/
│   ├── ci.yml                      # format / content / build / audit / link check
│   ├── weekly-report.yml           # weekly generation -> verify -> commit
│   └── smoke.yml                   # daily/manual online smoke
├── config/weekly-report.json       # GitHub user, model, event cap, excluded repos
├── prompts/weekly-report.md        # writing style and output contract
├── content/
│   ├── posts/                      # weekly reports and personal posts
│   └── archive/                    # archived early AI posts
├── scripts/
│   ├── collect-github-activity.ts
│   ├── generate-weekly-report.ts
│   ├── verify-content.ts
│   ├── verify-build.ts
│   ├── smoke.ts
│   ├── check-env.ts
│   ├── serve-public.ts
│   └── *.test.ts
├── e2e/                            # Playwright browser E2E tests
├── playwright.config.ts
├── dist/                           # tsc output (gitignored)
├── tsconfig.scripts.json
├── themes/LoveIt/
├── docs/
├── hugo.toml
├── package.json
└── .node-version / .ci-node-version / .hugo-version
```

## Cloudflare Pages settings

Pages uses Git integration; no `wrangler deploy` and no Cloudflare API token are needed.

| Setting | Value |
| --- | --- |
| Production branch | `main` |
| Build command | `hugo --gc --minify` |
| Output directory | `public` |
| Node version | `24` from `.node-version` (no `NODE_VERSION` needed) |
| Hugo version | defaults to `0.147.7`; templates support 0.140+, set `HUGO_VERSION=0.169.0` to match CI |

Theme JS is committed at `themes/LoveIt/assets/js/theme.js`, so Pages only needs Hugo; `pnpm run build` is used locally/CI to verify the theme build too.

## GitHub Secrets

| Secret | Purpose |
| --- | --- |
| `NVIDIA_API_KEY` | NVIDIA NIM key (`nvapi-...`) for Step 5 Preview (primary) |
| `NVIDIA_API_KEY_2` | Optional second key; used automatically when the primary probe fails |
| `NVIDIA_API_KEY_3` | Optional third key |
| `GH_PAT` | Public-repo read-only PAT for cross-repository activity; do not grant private repo access |

> Key rotation only switches keys for the same `step-5-preview` model. If the model backend is down, all keys fail; the workflow reports each key's HTTP status.

Optional repository variable: `SITE_ORIGIN` (default `https://hugo-blog-loveit-theme.pages.dev`) for post-deploy smoke.

## CI jobs

| Job | Content |
| --- | --- |
| `static` | Prettier → ESLint → theme TypeScript typecheck |
| `content` | content contract → 24 `node:test` tests |
| `build` | Babel theme build → Hugo 0.169.0 build → artifact contract |
| `audit` | production dependency audit |
| `link-check` | Lychee link check (archive and external sites excluded) |

PRs and pushes run these checks; Cloudflare Pages handles deployment. The weekly bot push uses `GITHUB_TOKEN`, so `ci.yml` also declares `workflow_run` to run checks after the report workflow completes.

## Local development

Requirements: global Node v26.13.1, global pnpm 11.22.0, Hugo Extended 0.169.0 (not installed globally here), GitHub CLI, and OpenCode CLI 2.2.7 (use CI/WSL on Windows).

```bash
pnpm install
pnpm run collect:activity -- --now 2026-11-12T12:00:00+08:00
pnpm run report:weekly   # needs NVIDIA_API_KEY and GH_TOKEN
pnpm run check
pnpm run check:full      # needs Hugo 0.169.0
pnpm run e2e:install     # install Chromium once
pnpm run build
pnpm run e2e
pnpm run build:theme
hugo server -D
```

`.env`:

```env
NVIDIA_API_KEY=nvapi-your-real-key
NVIDIA_API_KEY_2=nvapi-your-backup-key
GH_TOKEN=github_pat_public_read_only
```

## Branch policy

- Human and agent changes go through feature branches and pull requests; `main` is protected.
- Exception: the `weekly-report.yml` bot may push directly to `main` to publish the weekly report.
- See [`.agents/AGENTS.md`](.agents/AGENTS.md) for details.

## License

MIT — see [LICENSE](LICENSE).
