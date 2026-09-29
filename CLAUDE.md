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
- Releasing: bump `version` in package.json via a PR, merge, then push a `vX.Y.Z` tag on that commit — `.github/workflows/publish.yml` publishes to npm (trusted publishing, provenance) and creates the GitHub Release

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
