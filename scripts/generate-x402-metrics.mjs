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

// 2. Per-metric metadata (name/group/tags + supported assets/intervals/currencies),
//    fetched with bounded concurrency. The `a` (asset) lists are huge and mostly
//    identical across metrics, so they're deduped into a shared pool below.
const entries = new Array(paths.length);
let done = 0;
async function worker(startIdx) {
  for (let i = startIdx; i < paths.length; i += CONCURRENCY) {
    const path = paths[i];
    try {
      const meta = await getJson(`${API}/v1/metadata/metric?path=${encodeURIComponent(path)}&api_key=${apiKey}`);
      const d = meta.descriptors ?? {};
      const p = meta.parameters ?? {};
      entries[i] = {
        path,
        name: d.name ?? '',
        group: d.group ?? '',
        tags: Array.isArray(d.tags) ? d.tags : [],
        assets: Array.isArray(p.a) ? p.a : [],
        intervals: Array.isArray(p.i) ? p.i : [],
        currencies: Array.isArray(p.c) ? p.c : [],
      };
    } catch (err) {
      console.warn(`  ! ${path}: ${err.message}`);
      entries[i] = { path, name: '', group: '', tags: [], assets: [], intervals: [], currencies: [] };
    }
    if (++done % 50 === 0 || done === paths.length) console.log(`  ${done}/${paths.length}`);
  }
}
await Promise.all(Array.from({ length: CONCURRENCY }, (_, k) => worker(k)));

// 2b. Assets, ordered by market cap — x402 can't serve the marketcap bulk endpoint,
//     so we bake the ranked asset list in too (removes the paid asset call as well).
console.log('Fetching assets + market caps...');
const assetsResp = await getJson(`${API}/v1/metadata/assets?api_key=${apiKey}`);
const allAssets = (assetsResp.data ?? []).map((a) => ({ id: a.id, symbol: a.symbol, name: a.name }));
const since = Math.floor(Date.now() / 1000) - 86400;
let mcapBySymbol = new Map();
try {
  const mcap = await getJson(`${API}/v1/metrics/market/marketcap_usd/bulk?a=*&i=24h&s=${since}&f=json&api_key=${apiKey}`);
  const series = Array.isArray(mcap) ? mcap : (mcap.data ?? []); // response is { data: [{ t, bulk: [{a,v}] }] }
  const latest = series.length ? series[series.length - 1] : null;
  for (const e of latest?.bulk ?? []) mcapBySymbol.set(String(e.a).toUpperCase(), e.v);
} catch (err) {
  console.warn(`  ! marketcap fetch failed (${err.message}); assets will be alphabetical.`);
}
allAssets.sort((a, b) => {
  const ma = mcapBySymbol.get(a.symbol.toUpperCase()) ?? 0;
  const mb = mcapBySymbol.get(b.symbol.toUpperCase()) ?? 0;
  return mb - ma || a.symbol.localeCompare(b.symbol);
});
console.log(`  ${allAssets.length} assets, top: ${allAssets.slice(0, 5).map((a) => a.symbol).join(', ')}`);

// 3. Dedup the asset lists into a pool; each metric references its list by index.
const assetPool = [];
const assetIndex = new Map();
function refAssets(list) {
  const key = list.join('');
  let idx = assetIndex.get(key);
  if (idx === undefined) {
    idx = assetPool.length;
    assetPool.push(list);
    assetIndex.set(key, idx);
  }
  return idx;
}

const catalogBody = entries
  .map((e) => {
    const aRef = refAssets(e.assets);
    return `  { path: ${JSON.stringify(e.path)}, name: ${JSON.stringify(e.name)}, group: ${JSON.stringify(e.group)}, tags: ${JSON.stringify(e.tags)}, assets: ${aRef}, intervals: ${JSON.stringify(e.intervals)}, currencies: ${JSON.stringify(e.currencies)} },`;
  })
  .join('\n');

const poolBody = assetPool.map((list) => `  ${JSON.stringify(list)},`).join('\n');

const out = `// AUTO-GENERATED — do not edit by hand.
// The metric catalog reachable via x402 (the "advanced" product tier), with display
// metadata + supported assets/intervals/currencies baked in so x402 mode needs no
// paid metadata calls. The large per-metric asset lists are deduped into ASSET_SETS
// and referenced by index.
// Regenerate: GLASSNODE_API_KEY=xxx pnpm run gen:x402-metrics
// Source: /v1/metadata/metrics?metadata_filter=${FILTER} + /v1/metadata/metric per path

export interface X402Asset {
  id: string;
  symbol: string;
  name: string;
}

/** All assets, pre-sorted by market cap (x402 can't fetch marketcap at runtime). */
export const X402_ASSETS: readonly X402Asset[] = [
${allAssets.map((a) => `  { id: ${JSON.stringify(a.id)}, symbol: ${JSON.stringify(a.symbol)}, name: ${JSON.stringify(a.name)} },`).join('\n')}
];

/** Deduped pools of supported-asset lists, referenced by X402CatalogEntry.assets. */
export const X402_ASSET_SETS: readonly (readonly string[])[] = [
${poolBody}
];

export interface X402CatalogEntry {
  path: string;
  name: string;
  group: string;
  tags: string[];
  /** Index into X402_ASSET_SETS — the assets this metric supports. */
  assets: number;
  intervals: string[];
  currencies: string[];
}

export const X402_CATALOG: readonly X402CatalogEntry[] = [
${catalogBody}
];

/** O(1) membership test for the advanced (x402-reachable) metric paths. */
export const X402_METRIC_SET: ReadonlySet<string> = new Set(X402_CATALOG.map((e) => e.path));
`;

const target = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'lib', 'x402-catalog.ts');
await writeFile(target, out, 'utf8');
console.log(`Wrote ${entries.length} entries to src/lib/x402-catalog.ts`);
