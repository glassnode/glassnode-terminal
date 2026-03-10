# Glassnode Terminal

Interactive terminal UI for exploring Glassnode on-chain crypto data.

Browse assets, metrics, and data in a three-pane explorer with keyboard navigation.

## Installation

```bash
pnpm install
pnpm run build
```

## Usage

Set your Glassnode API key and launch:

```bash
export GLASSNODE_API_KEY=your-key
pnpm start
```

Or in one line:

```bash
GLASSNODE_API_KEY=your-key node dist/cli.js
```

On first launch, the app fetches and caches all asset and metric metadata (this may take a minute). Subsequent launches load instantly from cache (`~/.glassnode-terminal/cache/`, 1-day TTL).

## Navigation

The UI has three panes: a primary list, a secondary list, and a data view.

| Key         | Action                                          |
|-------------|-------------------------------------------------|
| `Tab`       | Switch to next pane                             |
| `Shift+Tab` | Switch to previous pane                         |
| `↑` / `↓`  | Navigate within current pane                    |
| `Enter`     | Select item                                     |
| `/`         | Search/filter in current pane                   |
| `Esc`       | Cancel search                                   |
| `m`         | Toggle browse mode (Asset→Metric / Metric→Asset)|
| `i`         | Cycle interval (10m, 1h, 24h, 1w, 1month)      |
| `s`         | Cycle time range (1d, 7d, 30d, 90d, 1y)        |
| `c`         | Cycle currency (usd, native)                    |
| `q`         | Quit                                            |

## Browse Modes

- **Asset → Metric** (default): Pick an asset first, then browse its metrics, then view data.
- **Metric → Asset**: Pick a metric first, then see which assets support it, then view data.

Press `m` to toggle between modes.

## Requirements

- Node.js >= 24
- A [Glassnode API key](https://studio.glassnode.com/settings/api)
