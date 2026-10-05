// CI check (.github/workflows/ci.yml): the top `## ` heading of CHANGELOG.md must name the release.
// publish.yml takes the GitHub Release notes from the line that equals `## <package.json version>`,
// so a heading with a suffix (e.g. still "(unreleased)") would release without notes.
//
// - Target `main` (and anything that is not `release/**`): exactly `## <package.json version>`.
// - Target `release/**`: that, or `## <x.y.z> (unreleased)`. PRs into a release branch carry no
//   version bump (package.json still has the last published version), so the unreleased heading is
//   not compared with package.json. Only the last one, the release prep (into the release branch or
//   the final PR to `main`), bumps the version and renames the heading to `## <version>`.
//
// Usage: node scripts/check-changelog-heading.mjs [target-branch]
//   The target defaults to $TARGET_BRANCH, then `main`. Env CHANGELOG and PACKAGE_JSON override
//   the file paths (for tests). Exits 1 with a GitHub `::error::` annotation on failure.
//   BASE_SHA enables PR version/notes checks against that commit's package.json.
/* global process, console */
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { compareSemver, parseSemver } from './release-plan.mjs';

/** Returns null when `heading` is acceptable for `target`, or the reason it is not. */
function checkHeading(heading, version, target) {
  const release = /^release\//.test(target);
  const expected = `## ${version}`;
  if (heading === null) return `CHANGELOG.md has no "## " heading; expected "${expected}".`;
  if (heading === expected) return null;
  const unreleased = /^## (\S+) \(unreleased\)$/.exec(heading);
  if (release && unreleased && parseSemver(unreleased[1])) return null;
  const allowed = release ? `"${expected}" or "## <x.y.z> (unreleased)"` : `"${expected}"`;
  const hint =
    unreleased && !release
      ? ' A heading still marked "(unreleased)" cannot reach main: bump package.json and rename it.'
      : '';
  return `The top CHANGELOG.md heading is "${heading}"; into ${target} it must be ${allowed} (package.json version ${version}).${hint}`;
}

const target = process.argv[2] || process.env.TARGET_BRANCH || 'main';
const changelog = readFileSync(process.env.CHANGELOG || 'CHANGELOG.md', 'utf8');
const { version } = JSON.parse(readFileSync(process.env.PACKAGE_JSON || 'package.json', 'utf8'));
const heading = changelog.split(/\r?\n/).find((line) => line.startsWith('## ')) ?? null;
const error = checkHeading(heading, version, target);
if (error) {
  console.error(`::error file=CHANGELOG.md::${error}`);
  process.exit(1);
}
console.log(`CHANGELOG.md heading "${heading}" is valid for a PR into ${target}.`);

// PR CI supplies the exact base commit. Push/release runs and local heading checks omit it.
// Release-branch PRs accumulate changes under an unreleased heading without a version bump.
if (process.env.BASE_SHA && !/^release\//.test(target)) {
  const base = JSON.parse(execFileSync('git', ['show', `${process.env.BASE_SHA}:package.json`], { encoding: 'utf8' }));
  if (!parseSemver(version) || !parseSemver(base.version) || compareSemver(version, base.version) <= 0) {
    console.error(`::error file=package.json::Version ${version} must be greater than base version ${base.version} for a PR into ${target}.`);
    process.exit(1);
  }
  const lines = changelog.split(/\r?\n/);
  const section = lines.slice(lines.indexOf(heading) + 1);
  const nextHeading = section.findIndex((line) => line.startsWith('## '));
  const notes = (nextHeading < 0 ? section : section.slice(0, nextHeading)).join('\n');
  if (!notes.trim()) {
    console.error(`::error file=CHANGELOG.md::Add release notes under "${heading}".`);
    process.exit(1);
  }
  console.log(`Version ${version} is greater than base version ${base.version} and has release notes.`);
}
