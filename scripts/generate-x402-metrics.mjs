#!/usr/bin/env node
// Generates src/lib/x402-catalog.ts — the bundled metric catalog for x402 mode.
//
// x402 (pay-per-call) only serves the "advanced" product tier, and on x402 every
// call (incl. metadata, $0.01 each) costs money. To let a wallet-only user browse a
// polished metric list without paying ~$3+ per refresh, we bake the catalog in at
// build/code time here (using an API key on the free/metered API), then bundle it.
//
// x402 mode reads this catalog by default; set X402_REFRESH_CATALOG=1 to instead
// re-fetch it live via x402 (paying) when you want it current.
//
// Usage: GLASSNODE_API_KEY=xxx node scripts/generate-x402-metrics.mjs
//        (or `pnpm run gen:x402-metrics`)

import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const API = 'https://api.glassnode.com';
const FILTER = 'metadata.products.exists(product,product=="advanced")';
const CONCURRENCY = 10;

const apiKey = process.env.GLASSNODE_API_KEY;
if (!apiKey) {
  console.error('GLASSNODE_API_KEY is required to generate the x402 catalog.');
  process.exit(1);
}

const ua = { 'User-Agent': 'glassnode-terminal-gen' };

async function getJson(url) {
  const res = await fetch(url, { headers: ua });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url.split('?')[0]}`);
  return res.json();
}

// 1. The advanced allowlist (paths).
const listUrl = `${API}/v1/metadata/metrics?metadata_filter=${encodeURIComponent(FILTER)}&api_key=${apiKey}`;
const paths = await getJson(listUrl);
if (!Array.isArray(paths) || paths.some((p) => typeof p !== 'string')) {
  console.error('Unexpected list shape — expected an array of metric path strings.');
  process.exit(1);
}
paths.sort();
console.log(`Fetching metadata for ${paths.length} advanced metrics...`);

// 2. Per-metric metadata (name/group/tags), fetched with bounded concurrency.
const entries = new Array(paths.length);
let done = 0;
async function worker(startIdx) {
  for (let i = startIdx; i < paths.length; i += CONCURRENCY) {
    const path = paths[i];
    try {
      const meta = await getJson(`${API}/v1/metadata/metric?path=${encodeURIComponent(path)}&api_key=${apiKey}`);
      const d = meta.descriptors ?? {};
      entries[i] = { path, name: d.name ?? '', group: d.group ?? '', tags: Array.isArray(d.tags) ? d.tags : [] };
    } catch (err) {
      console.warn(`  ! ${path}: ${err.message}`);
      entries[i] = { path, name: '', group: '', tags: [] };
    }
    if (++done % 50 === 0 || done === paths.length) console.log(`  ${done}/${paths.length}`);
  }
}
await Promise.all(Array.from({ length: CONCURRENCY }, (_, k) => worker(k)));

// 3. Emit the catalog module.
const body = entries
  .map((e) => `  { path: ${JSON.stringify(e.path)}, name: ${JSON.stringify(e.name)}, group: ${JSON.stringify(e.group)}, tags: ${JSON.stringify(e.tags)} },`)
  .join('\n');

const out = `// AUTO-GENERATED — do not edit by hand.
// The metric catalog reachable via x402 (the "advanced" product tier), with the
// display metadata baked in so x402 mode needs no paid metadata calls.
// Regenerate: GLASSNODE_API_KEY=xxx pnpm run gen:x402-metrics
// Source: /v1/metadata/metrics?metadata_filter=${FILTER} + /v1/metadata/metric per path

export interface X402CatalogEntry {
  path: string;
  name: string;
  group: string;
  tags: string[];
}

export const X402_CATALOG: readonly X402CatalogEntry[] = [
${body}
];

/** O(1) membership test for the advanced (x402-reachable) metric paths. */
export const X402_METRIC_SET: ReadonlySet<string> = new Set(X402_CATALOG.map((e) => e.path));
`;

const target = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'lib', 'x402-catalog.ts');
await writeFile(target, out, 'utf8');
console.log(`Wrote ${entries.length} entries to src/lib/x402-catalog.ts`);
