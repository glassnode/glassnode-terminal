# Claude Instructions

## Project Overview

Interactive TUI (Terminal User Interface) for Glassnode on-chain crypto data, built with Ink (React for CLI) and the `glassnode-api` package.

## Project Structure

- `/src` - Source code (TypeScript + React/Ink)
  - `/src/components` - Ink UI components (AssetList, MetricList, DataView, ParamBar, StatusBar, SearchOverlay, Spinner)
  - `/src/hooks` - React hooks (useMetricData for live data, useListNavigation for scrollable lists)
  - `/src/lib` - Pure library code (no React dependency)
    - `startup-data.ts` - Fetches all assets, metrics, and metric metadata at startup; caches to `~/.glassnode-terminal/cache/` for 1 day
    - `cache.ts` - File-based cache with 1-day TTL
    - `api-client.ts` - Singleton GlassnodeAPI client from GLASSNODE_API_KEY env var
    - `time-parse.ts` - Parse relative times (30d, 1h) and ISO dates to unix timestamps
    - `format.ts` - Date, number, metric name formatting utilities
    - `types.ts` - Shared types (Pane, BrowseMode, MetricParams, DataPoint, constants)
  - `App.tsx` - Root component: three-pane layout, browse mode toggle, keyboard handling
  - `cli.tsx` - Entry point: validates API key, renders App
- `/test` - Test files (Jest with ts-jest, ESM mode)
- `/dist` - Compiled output (not checked into git)

## Development Workflow

- Use Node.js v24
- Use pnpm as package manager
- Run tests with `pnpm test`
- Build the project with `pnpm run build`
- Run the app with `GLASSNODE_API_KEY=xxx pnpm start`
- The `glassnode-api` package is linked locally via `link:../glassnode-api`

## Architecture

- All startup data (assets sorted by market cap, metric list, metric metadata with display names) is fetched once and cached for 1 day
- Metric display names come from `MetricMetadata.descriptors.name` (from the Glassnode API), with a path-based fallback
- Only `useMetricData` makes live API calls (when user selects a metric + asset)
- Two browse modes: Asset→Metric and Metric→Asset, toggled with `m` key
- Parameter cycling (interval, since, currency) from any pane via `i`, `s`, `c` keys

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
