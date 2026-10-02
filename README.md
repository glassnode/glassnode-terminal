# glassnode-terminal

[![npm version](https://img.shields.io/npm/v/glassnode-terminal.svg)](https://www.npmjs.com/package/glassnode-terminal)
[![CI](https://github.com/glassnode/glassnode-terminal/actions/workflows/ci.yml/badge.svg)](https://github.com/glassnode/glassnode-terminal/actions/workflows/ci.yml)
[![license](https://img.shields.io/npm/l/glassnode-terminal.svg)](./LICENSE)

Interactive terminal UI for exploring [Glassnode](https://glassnode.com) on-chain and market crypto data. Browse assets, metrics, and data in a three-pane explorer with charts, live price tickers, and keyboard navigation.

## Install

```bash
npm install -g glassnode-terminal
```

> **Note:** Requires Node.js >= 22 and system dependencies for [node-canvas](https://github.com/Automattic/node-canvas#compiling). On macOS: `brew install pkg-config cairo pango`.

## Quick Start

Run directly without installing:

```bash
GLASSNODE_API_KEY=your-key npx glassnode-terminal
```

Or install globally and run:

```bash
export GLASSNODE_API_KEY=your-key
glassnode-terminal
```

Get your API key at [studio.glassnode.com/settings/api](https://studio.glassnode.com/settings/api).

### x402 pay-per-call (no API key)

Instead of an API key, you can pay per request in USDC on Base via [x402](https://x402.glassnode.com). The terminal runs in **one of two modes** — full API (an API key) or full x402 (a funded wallet). Point `X402_PRIVATE_KEY` at a funded Base wallet key:

```bash
export X402_PRIVATE_KEY=0xYOUR_WALLET_PRIVATE_KEY
export X402_MAX_PAYMENT=0.06   # optional: per-call spend cap in USDC (default 0.06)
glassnode-terminal
```

The wallet needs USDC on Base to cover per-call charges (a data query is ~$0.05).

**What x402 mode shows.** x402 only serves the "advanced" metric tier (~326 metrics), and *every* call is paid (metadata included). So the metric catalog (names, grouping, supported assets) **and** the market-cap-ordered asset list are **bundled into the app at build time** (see [`scripts/generate-x402-metrics.mjs`](scripts/generate-x402-metrics.mjs)). Startup is instant and free — you only pay for the data you actually open. To refresh the catalog live instead (paying ~$0.01 per metric), set `X402_REFRESH_CATALOG=1`. Maintainers regenerate the bundle with `GLASSNODE_API_KEY=… pnpm run gen:x402-metrics`.

### Configuration

Set these via the environment or an `.env` file (see [`.env.example`](.env.example); load with `node --env-file=.env dist/cli.js`). Keep the wallet key out of your shell history.

| Variable | Mode | Description |
|---|---|---|
| `GLASSNODE_API_KEY` | API | API key for the free/metered API. |
| `X402_PRIVATE_KEY` | x402 | Funded Base wallet private key (pay-per-call). |
| `X402_MAX_PAYMENT` | x402 | Per-call spend cap in USDC (default `0.06`). |
| `X402_API_URL` | x402 | Override the x402 host (default `x402.glassnode.com`); e.g. a testnet host. |
| `X402_REFRESH_CATALOG` | x402 | Set to `1` to re-fetch the metric catalog live via x402 (paid) instead of using the bundle. |
| `GLASSNODE_MODE` | both | Force `api` or `x402` when both credentials are set (default: x402 wins). |

When both credentials are present, x402 wins unless you force a mode — via `GLASSNODE_MODE`, or the equivalent `--api` / `--x402` CLI flags:

```bash
glassnode-terminal --api     # force the API-key path
glassnode-terminal --x402    # force x402
```

On first launch the app caches startup data (`~/.glassnode-terminal/cache/`, 1-day TTL; separate cache per mode). Subsequent launches load instantly.

## Features

- **Three-pane explorer** — browse assets, metrics, and data side by side
- **Two browse modes** — Asset → Metric or Metric → Asset (toggle with `m`)
- **Live price ticker** — WebSocket-powered prices for top assets in the header
- **Charts** — truecolor terminal charts via [ink-uplot](https://github.com/planadecu/ink-uplot) with dual Y-axes (metric + price overlay)
- **Table view** — toggle between chart and table with `v`
- **Search/filter** — press `/` to filter assets or metrics
- **Parameter controls** — cycle interval, time range, and currency with keyboard shortcuts
- **Log view** — press `l` to see HTTP/WS request logs for debugging

## Navigation

| Key | Action |
|-----|--------|
| `Tab` / `Shift+Tab` | Switch panes |
| `↑` / `↓` | Navigate within current pane |
| `Shift+↑` / `Shift+↓` | Page up / page down |
| `←` / `→` | Previous pane / select item |
| `Enter` | Select item |
| `/` | Search/filter in current pane |
| `Esc` | Cancel search |
| `m` | Toggle browse mode (Asset → Metric / Metric → Asset) |
| `i` | Cycle interval (10m, 1h, 24h, 1w, 1month) |
| `s` | Cycle time range (1d, 7d, 30d, 90d, 1y, all) |
| `c` | Cycle currency (usd, native) |
| `v` | Toggle table / chart view |
| `p` | Toggle price overlay |
| `l` | Toggle log view |
| `q` | Quit |

## Browse Modes

- **Asset → Metric** (default): Pick an asset, then browse its available metrics.
- **Metric → Asset**: Pick a metric, then see which assets support it.

Press `m` to toggle between modes.

## Development

```bash
git clone https://github.com/glassnode/glassnode-terminal.git
cd glassnode-terminal
pnpm install
pnpm run build
GLASSNODE_API_KEY=your-key pnpm start
```

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for how to open a pull request: the local checks, the
version bump and changelog entry every change needs, and how releases work. Changes are listed in
[CHANGELOG.md](./CHANGELOG.md).

## License

[Apache License 2.0](./LICENSE); see [NOTICE](./NOTICE) for attribution. Versions before 0.2.0
were published under the MIT License.
