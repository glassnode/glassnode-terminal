# Changelog

All notable changes to `glassnode-terminal` are documented here. The project follows
[semver](https://semver.org/); see [CONTRIBUTING.md](./CONTRIBUTING.md) for how versions and this
file are updated.

## 0.2.1

- The repository moves to [glassnode/glassnode-terminal](https://github.com/glassnode/glassnode-terminal)
  (from planadecu/glassnode-terminal; GitHub redirects the old URLs). `repository`, `bugs`,
  `homepage` and the README links point there.
- `LICENSE` and `NOTICE` name Glassnode AG as a copyright holder alongside the original author, and
  `package.json` lists Glassnode AG under `contributors`. The license stays Apache-2.0.
- Releases now follow the same flow as
  [glassnode-api](https://github.com/glassnode/glassnode-api-ts-client): every PR bumps `version`
  and adds an entry here, and a merge to `main` publishes that version to npm after a maintainer
  approves it (npm Trusted Publishing with provenance), then tags it and creates the GitHub Release
  from this file. Pushing a `v*` tag no longer publishes.
- CI checks that the top heading of this file is `## <package.json version>`, and every GitHub
  Action is pinned by commit SHA.
- Adds `CONTRIBUTING.md` and this changelog.

## 0.2.0

- **x402 pay-per-call mode**, with a metric catalog bundled into the package so a wallet-only user
  can browse without paying for metadata calls.
- **glassnode-api 1.0.0.** Startup now loads all metric metadata despite the API's rate limit (it
  waits for the limit window instead of dropping about 16% of it), and point-in-time metric variants
  no longer leak into the metric list.
- **Charts**: colored axes, draw order, thinner lines. In VS Code, iTerm2 and kitty the chart stays
  on screen and fits its pane (ink-uplot 0.2.16).
- The table view fits its pane, and the selected row stays visible when the pane gets shorter.
- Requires **Node.js >= 22** (was >= 18).
- Relicensed from MIT to **Apache-2.0**; adds `NOTICE`. Earlier versions stay MIT.

## 0.1.2

- Fixes `npx glassnode-terminal` exiting silently on machines without the dev toolchain.

## 0.1.1

- README: `npx` quick start.

## 0.1.0

- First release: a three-pane TUI (assets, metrics, data) for Glassnode on-chain and market data,
  with search, a chart and table view, a price overlay, a live price ticker and a log view.
