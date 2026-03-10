import type { AssetMetadata, MetricMetadata } from 'glassnode-api';
import { createClient } from './api-client.js';
import { readCache, writeCache } from './cache.js';
import type { MetricListItem } from './types.js';

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

/**
 * Load all startup data, using 1-day file cache when available.
 * On cache miss, fetches from API and saves to cache.
 */
export async function loadStartupData(
  onProgress?: (message: string) => void,
): Promise<StartupData> {
  // Try cache first
  const cached = readCache<StartupData>('startup-data');
  if (cached) {
    onProgress?.('Loaded from cache');
    return cached;
  }

  const client = createClient();

  // Fetch assets + market caps + metric list in parallel
  onProgress?.('Fetching assets and metrics...');
  const since = String(Math.floor(Date.now() / 1000) - 86400);
  const [assetData, mcapData, metricPaths] = await Promise.all([
    client.getAssetMetadata(),
    client
      .callBulkMetric('/market/marketcap_usd', { a: '*', i: '24h', s: since })
      .catch(() => []),
    client.getMetricList(),
  ]);

  // Sort assets by market cap
  const mcapBySymbol = new Map<string, number>();
  if (mcapData.length > 0) {
    const latest = mcapData[mcapData.length - 1]!;
    for (const entry of latest.bulk) {
      mcapBySymbol.set(entry.a.toUpperCase(), entry.v);
    }
  }

  const sortedAssets = [...assetData].sort((a, b) => {
    const mcapA = mcapBySymbol.get(a.symbol.toUpperCase()) ?? 0;
    const mcapB = mcapBySymbol.get(b.symbol.toUpperCase()) ?? 0;
    if (mcapA !== mcapB) return mcapB - mcapA;
    return a.symbol.localeCompare(b.symbol);
  });

  // Fetch all metric metadata (with progress)
  onProgress?.(`Fetching metadata for ${metricPaths.length} metrics...`);
  const metricMetadataMap = await fetchAllMetricMetadata(metricPaths, (done, total) => {
    onProgress?.(`Fetching metric metadata... ${done}/${total}`);
  });

  const filteredMetrics = metricPaths.filter((p) => !metricMetadataMap[p]?.is_pit);

  const data: StartupData = {
    assets: sortedAssets,
    metrics: filteredMetrics,
    metricMetadataMap,
  };

  // Save to cache
  writeCache('startup-data', data);
  onProgress?.('Done');

  return data;
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
