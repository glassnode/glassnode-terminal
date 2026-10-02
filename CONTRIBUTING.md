# Contributing to glassnode-terminal

Thanks for helping improve the Glassnode terminal UI. This guide walks you through opening a pull
request (PR).

**A merge to `main` releases the `version` in `package.json` to npm once a maintainer approves
the release** (`.github/workflows/publish.yml`). `main` only accepts changes through reviewed PRs.

## Prerequisites

- **Node.js 24** for development (see `.nvmrc`). Users of the published package only need
  Node.js >= 22, and CI runs on both.
- **pnpm** (the version is pinned in `package.json` `packageManager`; `corepack enable` picks it
  up). Supply-chain settings (build-script allowlist, 7-day release-age cooldown) live in
  `pnpm-workspace.yaml`.
- System libraries for [node-canvas](https://github.com/Automattic/node-canvas#compiling)
  (charts). On macOS: `brew install pkg-config cairo pango`.
- A Glassnode API key (`GLASSNODE_API_KEY`) to run the app against the live API.

## Opening a pull request, step by step

### 1. Fork or branch

Fork the repository (or, with write access, create a branch) and install dependencies:

```bash
git clone https://github.com/<you>/glassnode-terminal.git
cd glassnode-terminal
git checkout -b my-change
pnpm install
```

### 2. Make the change

Project layout (more detail in `CLAUDE.md`):

- `src/cli.tsx` - entry point: picks API-key or x402 mode, validates credentials, renders the app
- `src/App.tsx` - the three-pane layout and keyboard handling
- `src/components/` - Ink UI components; `src/hooks/` - React hooks
- `src/lib/` - pure library code (API client setup, startup data and cache, formatting)
- `scripts/` - the x402 catalog generator and the release tooling
- `test/` - Vitest tests

Add or update tests for what you change. Run the app (`GLASSNODE_API_KEY=… pnpm start`) to check
UI changes by eye; charts draw differently in kitty, iTerm2/VS Code and plain terminals.

### 3. Bump the version and add a changelog entry

Every change bumps `version` in `package.json` and adds an entry at the top of `CHANGELOG.md`
(a `## <version>` heading) describing it. Follow [semver](https://semver.org/):

- **Major**: breaking changes for users (a removed command-line flag or environment variable, a
  changed default that alters behaviour, a higher minimum Node.js version).
- **Minor**: new features, flags, keys or views that are backward compatible.
- **Patch**: bug fixes, docs, dependency bumps and internal refactors with no behaviour change.

The version in your PR is exactly the one that gets published: the release workflow does not bump
it. A PR merged without a bump publishes nothing. CI checks that the top `CHANGELOG.md` heading is
exactly `## <package.json version>` (`node scripts/check-changelog-heading.mjs` runs it locally).

**Release branches.** A large release can be prepared on a `release/**` branch. PRs into it carry
no version bump but still add their `CHANGELOG.md` entry under a single
`## <x.y.z> (unreleased)` heading; the last PR bumps the version and renames the heading to
exactly `## <x.y.z>` before the branch goes to `main`.

### 4. Run the local checks

CI runs these on every PR (on Node 22 and 24); run them locally first:

```bash
node scripts/check-changelog-heading.mjs
pnpm test
pnpm run build
node dist/cli.js   # without credentials: must exit with "no Glassnode credentials"
```

### 5. Open the PR against `main`

A good PR description says:

- **What** changed.
- **Why**: the problem it solves or the issue it closes.
- **How it was verified**: the checks you ran and any manual testing (which terminal).
- **User-facing impact**: behaviour changes, and any breaking change called out explicitly.

### 6. CI, review and merge

CI must pass, and a maintainer reviews the PR. Once it is approved, a maintainer merges it.

The merge starts the release workflow. It re-runs the full CI check list, then its publish job
waits for a maintainer to approve it (the `npm` environment). After the approval it publishes the
new version to npm with provenance, tags the commit `v<version>` and creates a GitHub Release from
your `CHANGELOG.md` entry. If that version is already on npm, the workflow skips the release.

## Releases (for maintainers)

**Merge release PRs one at a time.** Publishes run one after another (the `npm-publish`
concurrency group), and one in progress is never cancelled. But GitHub keeps only **one pending**
run per group: when a newer merge's publish job queues up, it replaces an older one that is still
waiting, including one waiting for its approval. That older version is then never published. Wait
for each release to finish (published, tagged, GitHub Release created) before merging the next PR
that bumps the version.

**Detecting a skipped version.** Every release run's summary lists, as a warning, each
`CHANGELOG.md` version between the last one published to npm and the one being released that is
missing on npm.

**Recovering.** Open the skipped version's workflow run (Actions → Publish, the merge commit that
carries that version) and choose **Re-run all jobs**, then approve the publish. If a higher
version is already npm's `latest`, the older one is published under the
`backport-<major>.<minor>` dist-tag instead, so `latest` never moves backwards, and its GitHub
Release is not marked "Latest". A prerelease version is published under `next`.

## Security

- Report vulnerabilities privately, through GitHub's private vulnerability reporting on this
  repository (the **Security** tab → **Report a vulnerability**). Never open a public issue for
  them.
- Never commit API keys, wallet private keys (`X402_PRIVATE_KEY`) or other secrets, including in
  `.env` files, tests or logs. `.env` is git-ignored.

## License of contributions

This project is licensed under the [Apache License 2.0](./LICENSE). Under its Section 5, any
contribution you intentionally submit for inclusion is licensed under the same terms, unless you
explicitly state otherwise.
