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

Instead of an API key, you can pay per request in USDC on Base via [x402](https://x402.glassnode.com). Point `GLASSNODE_X402_PRIVATE_KEY` at a funded Base-mainnet wallet key:

```bash
export GLASSNODE_X402_PRIVATE_KEY=0xYOUR_WALLET_PRIVATE_KEY
# optional: cap spend per call in USDC (default 0.06)
export GLASSNODE_X402_MAX_PER_CALL=0.06
glassnode-terminal
```

The wallet needs USDC on Base to cover per-call charges. x402 takes precedence when both it and `GLASSNODE_API_KEY` are set. Keep the private key out of your shell history — prefer an `.env` file (loadable with `node --env-file=.env`).

On first launch, the app fetches and caches all asset and metric metadata (this may take a minute). Subsequent launches load instantly from cache (`~/.glassnode-terminal/cache/`, 1-day TTL).

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
