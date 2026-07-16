# glassnode-terminal

Interactive terminal UI for exploring [Glassnode](https://glassnode.com) on-chain and market crypto data. Browse assets, metrics, and data in a three-pane explorer with charts, live price tickers, and keyboard navigation.

## Install

```bash
npm install -g glassnode-terminal
```

> **Note:** Requires Node.js >= 24 and system dependencies for [node-canvas](https://github.com/Automattic/node-canvas#compiling). On macOS: `brew install pkg-config cairo pango`.

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

Instead of an API key, you can pay per request in USDC on Base via [x402](https://x402.glassnode.com). The terminal runs in **one of two modes** — full API (an API key) or full x402 (a funded wallet) — chosen by which env vars are set. Point `X402_PRIVATE_KEY` at a funded Base wallet key:

```bash
export X402_PRIVATE_KEY=0xYOUR_WALLET_PRIVATE_KEY
# optional overrides:
export X402_MAX_PAYMENT=0.06                     # per-call spend cap in USDC (default 0.06)
export X402_API_URL=https://x402.glassnode.tech  # e.g. a testnet host (default: x402.glassnode.com)
glassnode-terminal
```

The wallet needs USDC on Base to cover per-call charges (a data query is ~$0.05). When both `X402_PRIVATE_KEY` and `GLASSNODE_API_KEY` are set, x402 wins by default — force a mode with `GLASSNODE_MODE=api|x402` or the `--api` / `--x402` flags. Keep the private key out of your shell history — prefer an `.env` file (see [`.env.example`](.env.example), loadable with `node --env-file=.env`).

**What x402 mode shows.** x402 only serves the "advanced" metric tier (~326 metrics), and *every* call is paid (metadata included). So the metric catalog — names and grouping — is **bundled into the app at build time** (see [`scripts/generate-x402-metrics.mjs`](scripts/generate-x402-metrics.mjs)); browsing the list costs nothing, and you only pay for the assets list and the data you actually open. To refresh the bundled catalog live instead (paying ~$0.01 per metric), set `X402_REFRESH_CATALOG=1`. Maintainers regenerate the bundled catalog with `GLASSNODE_API_KEY=… pnpm run gen:x402-metrics`.

On first launch, the app fetches and caches startup data (`~/.glassnode-terminal/cache/`, 1-day TTL; separate cache per mode). Subsequent launches load instantly.

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
git clone https://github.com/planadecu/glassnode-terminal.git
cd glassnode-terminal
pnpm install
pnpm run build
GLASSNODE_API_KEY=your-key pnpm start
```

## License

MIT
