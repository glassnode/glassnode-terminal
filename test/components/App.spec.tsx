import { vi, describe, it, expect, afterEach, beforeAll } from 'vitest';
import React from 'react';
import type { MetricListItem } from '../../src/lib/types.js';

// ANSI escape sequences for special keys
const KEYS = {
  up: '\x1B[A',
  down: '\x1B[B',
  right: '\x1B[C',
  enter: '\r',
  escape: '\x1B',
  backspace: '\x7F',
};

// --- Hoisted mock state ---
// vi.mock factories are hoisted above imports, so everything they reference
// must be created inside vi.hoisted() (which runs first).
const mocks = vi.hoisted(() => {
  const mockAssets = [
    { id: 'btc', symbol: 'BTC', name: 'Bitcoin' },
    { id: 'eth', symbol: 'ETH', name: 'Ethereum' },
    { id: 'ada', symbol: 'ADA', name: 'Cardano' },
    { id: 'sol', symbol: 'SOL', name: 'Solana' },
  ];

  const mockMetricPaths = [
    '/market/price_usd_close',
    '/market/price_usd_ohlc',
    '/market/marketcap_usd',
    '/indicators/sopr',
  ];

  const mockMetadataMap: Record<string, any> = {
    '/market/price_usd_close': {
      path: '/market/price_usd_close',
      parameters: { a: ['btc', 'eth', 'ada', 'sol'] },
      descriptors: { name: 'Price USD Close', group: 'Market', tags: ['price'] },
    },
    '/market/price_usd_ohlc': {
      path: '/market/price_usd_ohlc',
      parameters: { a: ['btc', 'eth', 'ada', 'sol'] },
      descriptors: { name: 'Price USD OHLC', group: 'Market', tags: ['price'] },
    },
    '/market/marketcap_usd': {
      path: '/market/marketcap_usd',
      parameters: { a: ['btc', 'eth', 'ada'] },
      descriptors: { name: 'Market Cap USD', group: 'Market', tags: ['on-chain'] },
    },
    '/indicators/sopr': {
      path: '/indicators/sopr',
      parameters: { a: ['btc', 'eth'] },
      descriptors: { name: 'SOPR', group: 'Indicators', tags: ['on-chain'] },
    },
  };

  const mockMetricData = [
    { t: 1709251200, v: 97234.5 },
    { t: 1709337600, v: 98102.3 },
    { t: 1709424000, v: 99500.0 },
  ];

  // Pure functions copied from startup-data.ts (avoids circular import in mock)
  const TAG_ORDER: Array<[string, string]> = [
    ['price', 'Price'],
    ['on-chain', 'On-Chain'],
    ['volume', 'Volume'],
    ['other', 'Other'],
  ];
  const TAG_SORT_INDEX = new Map(TAG_ORDER.map(([key], i) => [key, i]));

  function buildMetricList(
    metricPaths: string[],
    metadataMap: Record<string, any>,
  ): MetricListItem[] {
    const items = metricPaths.map((path) => {
      const meta = metadataMap[path];
      const group = meta?.descriptors?.group ?? 'Other';
      const tags = meta?.descriptors?.tags ?? [];
      const tag = tags[0] ?? 'other';
      const displayName = meta?.descriptors?.name ?? path;
      return { path, group, tag, displayName };
    });

    items.sort((a, b) =>
      (TAG_SORT_INDEX.get(a.tag) ?? 99) - (TAG_SORT_INDEX.get(b.tag) ?? 99)
      || a.group.localeCompare(b.group)
      || a.displayName.localeCompare(b.displayName),
    );

    const result: MetricListItem[] = [];
    let lastTag = '';
    let lastGroup = '';

    for (const item of items) {
      if (item.tag !== lastTag) {
        const label = TAG_ORDER.find(([k]) => k === item.tag)?.[1] ?? item.tag;
        result.push({ type: 'tag-header', label });
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

  function getMetricDisplayName(path: string, metadataMap: Record<string, any>): string {
    const meta = metadataMap[path];
    if (meta?.descriptors?.name) return meta.descriptors.name;
    return path;
  }

  const callMetricMock = vi.fn<() => Promise<typeof mockMetricData>>().mockResolvedValue(mockMetricData);

  return {
    mockAssets,
    mockMetricPaths,
    mockMetadataMap,
    mockMetricData,
    buildMetricList,
    getMetricDisplayName,
    callMetricMock,
  };
});

// --- Setup mocks ---

vi.mock('../../src/lib/startup-data.js', () => ({
  loadStartupData: vi.fn().mockResolvedValue({
    assets: mocks.mockAssets,
    metrics: mocks.mockMetricPaths,
    metricMetadataMap: mocks.mockMetadataMap,
  }),
  buildMetricList: mocks.buildMetricList,
  getMetricDisplayName: mocks.getMetricDisplayName,
}));

vi.mock('../../src/lib/api-client.js', () => ({
  createClient: vi.fn().mockReturnValue({
    callMetric: mocks.callMetricMock,
  }),
  USER_AGENT: 'glassnode-terminal-test',
}));

vi.mock('ink-uplot', () => ({
  InkUPlot: () => null,
  detectFormat: () => 'symbols',
}));

// Helper: wait for async renders to settle
function wait(ms = 50): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe('App integration', () => {
  let renderInk: typeof import('ink-testing-library').render;
  let App: typeof import('../../src/App.js').App;

  beforeAll(async () => {
    const inkTest = await import('ink-testing-library');
    renderInk = inkTest.render;
    const appModule = await import('../../src/App.js');
    App = appModule.App;
  });

  afterEach(() => {
    mocks.callMetricMock.mockClear();
  });

  it('per-pane search: /card filters assets only, → to metrics, /price filters metrics only, ↓↓ enter renders, esc, i cycles interval', async () => {
    const instance = renderInk(<App />);
    // Widen the terminal so all 3 panes fit (asset=35 + metric=70 + data needs space)
    Object.defineProperty(instance.stdout, 'columns', { get: () => 200 });
    Object.defineProperty(instance.stdout, 'rows', { get: () => 30 });
    instance.stdout.emit('resize');
    await wait(100);

    // Verify initial state — all 4 assets visible
    let frame = instance.lastFrame()!;
    expect(frame).toContain('Bitcoin');
    expect(frame).toContain('Cardano');

    // Step 1: "/" opens search on left pane (assets), type "card"
    instance.stdin.write('/');
    await wait();
    instance.stdin.write('c');
    await wait();
    instance.stdin.write('a');
    await wait();
    instance.stdin.write('r');
    await wait();
    instance.stdin.write('d');
    await wait();

    frame = instance.lastFrame()!;
    expect(frame).toContain('Cardano');
    expect(frame).not.toContain('Bitcoin');

    // Step 2: Enter to confirm, → to select Cardano and move to middle pane
    instance.stdin.write(KEYS.enter);
    await wait();
    instance.stdin.write(KEYS.right);
    await wait();

    frame = instance.lastFrame()!;
    // Cardano still filtered in left pane
    expect(frame).toContain('Cardano');
    // Metrics visible (not text-filtered by "card")
    expect(frame).toContain('Price USD Close');

    // Step 3: "/" to search metrics, type "price"
    instance.stdin.write('/');
    await wait();
    instance.stdin.write('p');
    await wait();
    instance.stdin.write('r');
    await wait();
    instance.stdin.write('i');
    await wait();
    instance.stdin.write('c');
    await wait();
    instance.stdin.write('e');
    await wait();

    frame = instance.lastFrame()!;
    expect(frame).toContain('Price USD Close');
    expect(frame).toContain('Price USD OHLC');
    expect(frame).not.toContain('Market Cap USD');

    // Step 4: ↓↓ navigate within filtered metrics
    instance.stdin.write(KEYS.down);
    await wait();
    instance.stdin.write(KEYS.down);
    await wait();

    frame = instance.lastFrame()!;
    // Filter still active
    expect(frame).toContain('Price USD Close');
    expect(frame).not.toContain('Market Cap USD');

    // Step 5: Enter to confirm search, then Enter again to select metric
    instance.stdin.write(KEYS.enter);
    await wait();
    instance.stdin.write(KEYS.enter);
    await wait(200);

    frame = instance.lastFrame()!;
    expect(frame).toContain('ADA');
    expect(mocks.callMetricMock).toHaveBeenCalled();

    // Step 6: Escape (clean up any lingering state)
    instance.stdin.write(KEYS.escape);
    await wait();

    // Step 7: "i" cycles interval 24h → 1w
    frame = instance.lastFrame()!;
    expect(frame).toContain('24h');

    instance.stdin.write('i');
    await wait();

    frame = instance.lastFrame()!;
    expect(frame).toContain('1w');

    instance.unmount();
  });

  it('search on asset pane does not filter metric pane', async () => {
    const instance = renderInk(<App />);
    await wait(100);

    instance.stdin.write('/');
    await wait();
    instance.stdin.write('b');
    await wait();
    instance.stdin.write('t');
    await wait();
    instance.stdin.write('c');
    await wait();
    instance.stdin.write(KEYS.enter);
    await wait();

    const frame = instance.lastFrame()!;
    expect(frame).toContain('Bitcoin');
    expect(frame).not.toContain('Cardano');
    // Metrics not text-filtered
    expect(frame).toContain('Price USD Close');

    instance.unmount();
  });

  it('backspace on empty search cancels search mode', async () => {
    const instance = renderInk(<App />);
    await wait(100);

    instance.stdin.write('/');
    await wait();

    let frame = instance.lastFrame()!;
    expect(frame).toContain('Esc to cancel');

    instance.stdin.write(KEYS.backspace);
    await wait();

    frame = instance.lastFrame()!;
    expect(frame).not.toContain('Esc to cancel');

    instance.unmount();
  });
});
