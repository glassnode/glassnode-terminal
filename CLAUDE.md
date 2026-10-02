# Claude Instructions

## Project Overview

Interactive TUI (Terminal User Interface) for Glassnode on-chain crypto data, built with Ink (React for CLI) and the `glassnode-api` package.

## Project Structure

- `/src` - Source code (TypeScript + React/Ink)
  - `/src/components` - Ink UI components (AssetList, MetricList, DataView, ParamBar, StatusBar, SearchOverlay, Spinner, HighlightedText, LogView, PriceTicker)
  - `/src/hooks` - React hooks
    - `useAssets`, `useMetrics`, `useMetricMetadata` - Startup/catalog data (cached)
    - `useMetricData` - Live data for the selected metric + asset
    - `usePulses` - Live prices over the Pulses WebSocket (price ticker)
    - `useListNavigation` - Scrollable list navigation
  - `/src/lib` - Pure library code (no React dependency, except `logger.ts`'s `useLogs` hook)
    - `startup-data.ts` - Fetches all assets, metrics, and metric metadata at startup; caches to `~/.glassnode-terminal/cache/` for 1 day (separate cache per mode)
    - `cache.ts` - File-based cache with 1-day TTL
    - `api-client.ts` - Singleton GlassnodeAPI client; API-key mode (`GLASSNODE_API_KEY`) or x402 pay-per-call mode (`X402_PRIVATE_KEY`)
    - `x402-catalog.ts` - AUTO-GENERATED bundled metric catalog for x402 mode; regenerate with `pnpm run gen:x402-metrics`, never edit by hand
    - `logger.ts` - In-memory log of API calls (API key redacted), shown in LogView
    - `time-parse.ts` - Parse relative times (30d, 1h) and ISO dates to unix timestamps
    - `format.ts` - Date, number, metric name formatting utilities
    - `types.ts` - Shared types (Pane, BrowseMode, MetricParams, DataPoint, constants)
  - `App.tsx` - Root component: three-pane layout, browse mode toggle, keyboard handling
  - `cli.tsx` - Entry point: resolves mode (`--api` / `--x402` / `GLASSNODE_MODE`), validates credentials, renders App
- `/scripts` - `generate-x402-metrics.mjs` (builds `src/lib/x402-catalog.ts`)
- `/test` - Test files (Vitest, `*.spec.ts(x)`)
- `/dist` - Compiled output (not checked into git)

## Development Workflow

- Use Node.js v24 for development (published package supports Node >= 22)
- Use pnpm 11 as package manager; supply-chain settings (build allowlist, 7-day release-age cooldown) live in `pnpm-workspace.yaml`
- Run tests with `pnpm test`
- Build the project with `pnpm run build`
- Run the app with `GLASSNODE_API_KEY=xxx pnpm start` (or `node --env-file=.env dist/cli.js [--api|--x402]`)
- `glassnode-api` comes from npm; it is maintained by the repo author and exempt from the release-age cooldown
- Repository: https://github.com/glassnode/glassnode-terminal (moved from planadecu/glassnode-terminal; GN-177). See `CONTRIBUTING.md` for the PR flow

## Architecture

- All startup data (assets sorted by market cap, metric list, metric metadata with display names) is fetched once and cached for 1 day
- Metric display names come from `MetricMetadata.descriptors.name` (from the Glassnode API), with a path-based fallback
- After startup, live calls are `useMetricData` (selected metric + asset) and the `usePulses` WebSocket (price ticker)
- Two browse modes: Asset→Metric and Metric→Asset, toggled with `m` key
- Parameter cycling (interval, since, currency) from any pane via `i`, `s`, `c` keys
- Other keys: `/` search, `v` table/chart, `p` price ticker, `l` log pane, `q` quit

## Coding Standards

- TypeScript for all source files
- React JSX for Ink components (.tsx)
- Pure library code in /src/lib has no React imports
- Use the `glassnode-api` package types (AssetMetadata, MetricMetadata) — don't redefine them

## Parameter Mapping (API query params)

| Param    | API key | Values                    |
|----------|---------|---------------------------|
| asset    | `a`     | BTC, ETH, SOL, etc.      |
| interval | `i`     | 10m, 1h, 24h, 1w, 1month |
| since    | `s`     | unix timestamp            |
| currency | `c`     | usd, native               |

## Versioning

Follow [semver](https://semver.org/) (major: breaking for users — removed flags/env vars, changed defaults, higher Node floor; minor: new features; patch: fixes, docs, dependency bumps, refactors).

**Every change** (except PRs into `release/**` branches, which still add a CHANGELOG entry) MUST:

1. Bump `version` in `package.json`
2. Add a `## <version>` entry at the top of `CHANGELOG.md`

The `version` in `package.json` is exactly what gets published: CI never bumps it. A change merged without a bump publishes nothing.

## CI

- `.github/workflows/ci.yml` runs on PRs into `main` and `release/**`, and `publish.yml` calls it (`workflow_call`) as its `verify` job: the CHANGELOG heading check (`scripts/check-changelog-heading.mjs`: the top heading must be exactly `## <package.json version>`; into `release/**`, `## <x.y.z> (unreleased)` is also accepted), install, build, tests and a CLI smoke test, on Node 22 and 24 (`test (22)`, `test (24)` are the required checks).
- Every action is pinned by full commit SHA with a `# vX.Y.Z` comment, never a movable tag. To bump one, resolve the tag with `gh api repos/<owner>/<repo>/git/ref/tags/<tag>` (dereference an annotated tag with `gh api repos/<owner>/<repo>/git/tags/<sha>`), update SHA and comment together, and read the release notes. Dependabot proposes these updates.

## Publishing

Same flow as `glassnode-api` (github.com/glassnode/glassnode-api-ts-client):

- `.github/workflows/publish.yml` releases the `version` already in `package.json`. It never bumps the version, commits or pushes to `main`, which is protected by a ruleset (changes land only through PRs with the required checks).
- On every push to `main`: `verify` runs `ci.yml`; `release` (read-only) runs `scripts/release-state.sh`, which checks npm (only an E404 means "not published"; any other failure fails the job) and plans the dist-tag with `scripts/release-plan.mjs` (`latest`, `backport-<major>.<minor>` for a version below `latest`, `next` for a prerelease); `publish` runs in the `npm` **environment** (required reviewer, `main` only), re-checks, runs `npm publish --tag <dist-tag>` (via `prepublishOnly`: clean + build), pushes the `v<version>` tag and creates the GitHub Release from the version's `CHANGELOG.md` section. A version already on npm is skipped without asking for approval.
- **npm Trusted Publishing (OIDC)** with provenance — no `NPM_TOKEN`. The Trusted Publisher for `glassnode-terminal` on npmjs.com must name repo `glassnode/glassnode-terminal`, workflow `publish.yml` and environment `npm`.
- Merge release PRs one at a time: GitHub keeps only one pending run per concurrency group, so a newer merge can replace an older publish still waiting for approval (CONTRIBUTING.md "Releases" explains detection and recovery).
- `scripts/release-*.{sh,mjs}` and `check-changelog-heading.mjs` are shared with glassnode-api and tested in `test/release-scripts.spec.ts`; keep them in sync.

