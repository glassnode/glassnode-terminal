import type { AssetMetadata, MetricMetadata } from 'glassnode-api';
import { createClient, isX402Enabled, fetchX402AdvancedPaths } from './api-client.js';
import { readCache, writeCache } from './cache.js';
import type { MetricListItem } from './types.js';
import { X402_CATALOG, X402_ASSET_SETS, X402_ASSETS, type X402CatalogEntry } from './x402-catalog.js';

export interface StartupData {
  assets: AssetMetadata[];
  metrics: string[];
  /** Map of metric path → MetricMetadata (including descriptors with name) */
  metricMetadataMap: Record<string, MetricMetadata>;
}

const BATCH_SIZE = 20;
const BATCH_DELAY_MS = 100;

async function fetchAllMetricMetadata(
  metricPaths: string[],
  onProgress?: (done: number, total: number) => void,
): Promise<Record<string, MetricMetadata>> {
  const client = createClient();
  const result: Record<string, MetricMetadata> = {};

  for (let i = 0; i < metricPaths.length; i += BATCH_SIZE) {
    const batch = metricPaths.slice(i, i + BATCH_SIZE);
    const results = await Promise.allSettled(
      batch.map((path) => client.getMetricMetadata(path)),
    );

    for (let j = 0; j < results.length; j++) {
      const r = results[j]!;
      const path = batch[j]!;
      if (r.status === 'fulfilled') {
        result[path] = r.value;
      }
    }

    onProgress?.(Math.min(i + BATCH_SIZE, metricPaths.length), metricPaths.length);

    if (i + BATCH_SIZE < metricPaths.length) {
      await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY_MS));
    }
  }

  return result;
}

/** Sort assets by descending market cap, then symbol. */
function sortAssetsByMcap(
  assetData: AssetMetadata[],
  mcapData: Array<{ bulk: Array<{ a: string; v: number }> }>,
): AssetMetadata[] {
  const mcapBySymbol = new Map<string, number>();
  if (mcapData.length > 0) {
    const latest = mcapData[mcapData.length - 1]!;
    for (const entry of latest.bulk) {
      mcapBySymbol.set(entry.a.toUpperCase(), entry.v);
    }
  }
  return [...assetData].sort((a, b) => {
    const mcapA = mcapBySymbol.get(a.symbol.toUpperCase()) ?? 0;
    const mcapB = mcapBySymbol.get(b.symbol.toUpperCase()) ?? 0;
    if (mcapA !== mcapB) return mcapB - mcapA;
    return a.symbol.localeCompare(b.symbol);
  });
}

/** Turn catalog entries into the metrics list + a metadata map buildMetricList understands. */
function catalogToStartupParts(entries: readonly X402CatalogEntry[]): {
  metrics: string[];
  metricMetadataMap: Record<string, MetricMetadata>;
} {
  const metricMetadataMap: Record<string, MetricMetadata> = {};
  for (const e of entries) {
    metricMetadataMap[e.path] = {
      descriptors: { name: e.name, group: e.group, tags: e.tags },
      // Parameters drive per-metric asset/interval/currency filtering in the UI.
      parameters: {
        a: [...(X402_ASSET_SETS[e.assets] ?? [])],
        i: e.intervals,
        c: e.currencies,
      },
    } as unknown as MetricMetadata;
  }
  return { metrics: entries.map((e) => e.path), metricMetadataMap };
}

/**
 * Load all startup data, using 1-day file cache when available.
 * On cache miss, fetches from API and saves to cache.
 */
export async function loadStartupData(
  onProgress?: (message: string) => void,
): Promise<StartupData> {
  // Cache is per-mode: x402 shows only the ~326 advanced metrics, API mode shows all.
  const cacheKey = isX402Enabled() ? 'startup-data-x402' : 'startup-data';

  const cached = readCache<StartupData>(cacheKey);
  if (cached) {
    onProgress?.('Loaded from cache');
    return cached;
  }

  const data = isX402Enabled()
    ? await loadStartupDataX402(onProgress)
    : await loadStartupDataApi(onProgress);

  writeCache(cacheKey, data);
  onProgress?.('Done');
  return data;
}

/** Full-API mode: fetch the whole metric list + per-metric metadata (free/metered). */
async function loadStartupDataApi(
  onProgress?: (message: string) => void,
): Promise<StartupData> {
  const client = createClient();

  onProgress?.('Fetching assets and metrics...');
  const since = String(Math.floor(Date.now() / 1000) - 86400);
  const [assetData, mcapData, metricPaths] = await Promise.all([
    client.getAssetMetadata(),
    client.callBulkMetric('/market/marketcap_usd', { a: '*', i: '24h', s: since }).catch(() => []),
    client.getMetricList(),
  ]);

  const sortedAssets = sortAssetsByMcap(assetData, mcapData);

  onProgress?.(`Fetching metadata for ${metricPaths.length} metrics...`);
  const metricMetadataMap = await fetchAllMetricMetadata(metricPaths, (done, total) => {
    onProgress?.(`Fetching metric metadata... ${done}/${total}`);
  });

  const filteredMetrics = metricPaths.filter((p) => !metricMetadataMap[p]?.is_pit);
  return { assets: sortedAssets, metrics: filteredMetrics, metricMetadataMap };
}

/**
 * Full-x402 mode: the metric list is restricted to the "advanced" tier, and every
 * call is paid — so the metric catalog comes from the bundled build-time snapshot
 * (no paid metadata calls). Set X402_REFRESH_CATALOG=1 to instead re-fetch it live
 * via x402 (pays ~$0.01 per metric). Only assets + the data you open cost money.
 */
async function loadStartupDataX402(
  onProgress?: (message: string) => void,
): Promise<StartupData> {
  // Assets come from the bundled snapshot (already market-cap ordered): x402 can't
  // serve the marketcap bulk endpoint, and this avoids a paid asset-metadata call —
  // so nothing at startup costs money; only opening data does.
  const sortedAssets = X402_ASSETS as unknown as AssetMetadata[];

  let metrics: string[];
  let metricMetadataMap: Record<string, MetricMetadata>;

  if (process.env['X402_REFRESH_CATALOG']?.trim()) {
    // Live refresh: fetch the advanced list + full per-metric metadata via x402 (paid).
    onProgress?.('Refreshing metric catalog via x402 (paid)...');
    const paths = await fetchX402AdvancedPaths();
    metricMetadataMap = await fetchAllMetricMetadata(paths, (done, total) => {
      onProgress?.(`Fetching metric metadata via x402... ${done}/${total}`);
    });
    metrics = paths.filter((p) => !metricMetadataMap[p]?.is_pit);
  } else {
    // Default: serve from the bundled catalog — no paid metadata calls.
    onProgress?.(`Loading ${X402_CATALOG.length} advanced metrics (bundled catalog)...`);
    ({ metrics, metricMetadataMap } = catalogToStartupParts(X402_CATALOG));
  }

  return { assets: sortedAssets, metrics, metricMetadataMap };
}

/**
 * Get display name for a metric path using cached metadata.
 * Falls back to path-based name if no descriptor available.
 */
export function getMetricDisplayName(
  path: string,
  metadataMap: Record<string, MetricMetadata>,
): string {
  const meta = metadataMap[path];
  if (meta?.descriptors?.name) {
    return meta.descriptors.name;
  }
  // Fallback: convert path to readable name
  const clean = path.startsWith('/') ? path.slice(1) : path;
  const parts = clean.split('/');
  const name = parts.pop()!.replace(/_/g, ' ');
  const category = parts.join('/');
  return category ? `${category} / ${name}` : name;
}

/** Ordered tag list — determines display order and friendly names */
const TAG_ORDER: Array<[string, string]> = [
  ['price', 'Price'],
  ['on-chain', 'On-Chain'],
  ['volume', 'Volume'],
  ['spot', 'Spot'],
  ['futures', 'Futures'],
  ['options', 'Options'],
  ['etf', 'ETF'],
  ['other', 'Other']
];

const TAG_DISPLAY_NAMES = new Map(TAG_ORDER);
const TAG_SORT_INDEX = new Map(TAG_ORDER.map(([key], i) => [key, i]));

function tagSortKey(tag: string): number {
  return TAG_SORT_INDEX.get(tag) ?? TAG_ORDER.length;
}

function tagDisplayName(tag: string): string {
  return TAG_DISPLAY_NAMES.get(tag) ?? tag.charAt(0).toUpperCase() + tag.slice(1);
}

/**
 * Build a structured metric list sorted by tag → group → name,
 * with tag and group headers interleaved.
 */
export function buildMetricList(
  metricPaths: string[],
  metadataMap: Record<string, MetricMetadata>,
): MetricListItem[] {
  const items = metricPaths.map((path) => {
    const meta = metadataMap[path];
    const group = meta?.descriptors?.group ?? 'Other';
    const tags = meta?.descriptors?.tags ?? [];
    const tag = tags[0] ?? 'other';
    const displayName = getMetricDisplayName(path, metadataMap);
    return { path, group, tag, displayName };
  });

  // Sort: tag (manual order) → group (alpha) → displayName (alpha)
  items.sort((a, b) =>
    tagSortKey(a.tag) - tagSortKey(b.tag)
    || a.group.localeCompare(b.group)
    || a.displayName.localeCompare(b.displayName),
  );

  // Build flat list with headers (tag as primary, group as secondary)
  const result: MetricListItem[] = [];
  let lastTag = '';
  let lastGroup = '';

  for (const item of items) {
    if (item.tag !== lastTag) {
      result.push({ type: 'tag-header', label: tagDisplayName(item.tag) });
      lastTag = item.tag;
      lastGroup = '';
    }
    if (item.group !== lastGroup) {
      result.push({ type: 'group-header', label: item.group });
      lastGroup = item.group;
    }
    result.push({ type: 'metric', path: item.path, displayName: item.displayName });
  }

  return result;
}
