import { vi, describe, it, expect, afterEach } from 'vitest';
import React from 'react';
import { Box } from 'ink';
import { render, cleanup } from 'ink-testing-library';
import type { DataPoint } from '../../src/lib/types.js';

// Capture the size DataView gives the chart instead of rendering a real one.
const chartSizes = vi.hoisted(() => [] as Array<{ width?: number; height?: number }>);
const chartValues = vi.hoisted(() => [] as Array<Array<Array<number | null>>>);
vi.mock('ink-uplot', () => ({
  InkUPlot: (props: { width?: number; height?: number; data: Array<Array<number | null>> }) => {
    chartSizes.push({ width: props.width, height: props.height });
    chartValues.push(props.data);
    return null;
  },
}));

const { DataView } = await import('../../src/components/DataView.js');
afterEach(() => cleanup());

// Measuring takes a couple of render passes (layout, measure, setState, report), so poll
// for the expected state instead of sleeping a fixed time (flaky on slower CI runners).
async function until(cond: () => boolean, timeout = 3000): Promise<void> {
  const start = Date.now();
  while (!cond()) {
    if (Date.now() - start > timeout) return; // let the assertion report the actual value
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}

function renderDataView(
  paneWidth: number,
  paneHeight: number,
  { viewMode = 'chart', points = 2, onBodyHeightChange, data: suppliedData, priceData = [], showPrice = false, priceError }: {
    viewMode?: 'chart' | 'table';
    points?: number;
    onBodyHeightChange?: (height: number) => void;
    data?: DataPoint[];
    priceData?: DataPoint[];
    showPrice?: boolean;
    priceError?: string;
  } = {},
) {
  chartSizes.length = 0;
  chartValues.length = 0;
  const data = suppliedData ?? Array.from({ length: points }, (_, i) => ({ t: 86400 * (i + 1), v: i + 1 }));
  return render(
    <Box width={paneWidth} height={paneHeight}>
      <DataView
        data={data}
        loading={false}
        error={null}
        priceError={priceError}
        params={{ interval: '24h', since: '30d', currency: 'usd' }}
        selectedMetric="/addresses/count"
        selectedAsset="BTC"
        isFocused={false}
        visibleRange={[0, points]}
        selectedIndex={0}
        viewMode={viewMode}
        showPrice={showPrice}
        priceData={priceData}
        chartRedrawKey={0}
        onBodyHeightChange={onBodyHeightChange}
      />
    </Box>,
  );
}

describe('DataView chart sizing', () => {
  it('gives the chart exactly the space left inside the pane', async () => {
    // Wide pane: border (2 rows) + param bar (1) + metric line (1) leave 20 - 4 = 16 rows;
    // border leaves 80 - 2 = 78 columns.
    renderDataView(80, 20);
    await until(() => chartSizes.length > 0);
    expect(chartSizes.at(-1)).toEqual({ width: 78, height: 16 });
  });

  it('shrinks the chart when the param bar wraps in a narrow pane', async () => {
    // Narrow pane: the param bar and metric line wrap, so fewer rows remain.
    renderDataView(34, 20);
    await until(() => chartSizes.length > 0);
    const size = chartSizes.at(-1)!;
    expect(size.width).toBe(32);
    expect(size.height).toBeLessThan(16);
    expect(size.height).toBeGreaterThan(0);
  });
});

describe('DataView chart values', () => {
  it('keeps missing values as gaps and retains real zeros', async () => {
    renderDataView(80, 20, { data: [{ t: 1, v: 12 }, { t: 2, v: null }, { t: 3 }, { t: 4, v: 0 }] });
    await until(() => chartValues.length > 0);
    expect(chartValues.at(-1)).toEqual([[1, 2, 3, 4], [12, null, null, 0]]);
  });

  it('keeps missing overlay timestamps as gaps', async () => {
    renderDataView(80, 20, {
      data: [{ t: 1, v: 12 }, { t: 2, v: 13 }, { t: 3, v: 14 }],
      showPrice: true,
      priceData: [{ t: 1, v: 100 }, { t: 3, v: 0 }],
    });
    await until(() => chartValues.length > 0);
    expect(chartValues.at(-1)).toEqual([[1, 2, 3], [100, null, 0], [12, 13, 14]]);
  });

  it('offers table mode for object-valued metrics instead of drawing zeros', async () => {
    const instance = renderDataView(80, 20, { data: [{ t: 1, o: { open: 123, close: 456 } }] });
    await until(() => instance.lastFrame()?.includes('Chart unavailable') ?? false);
    expect(instance.lastFrame()).toContain('Press v for table view');
    expect(chartValues).toHaveLength(0);
  });

  it('preserves structured values in the table', async () => {
    const instance = renderDataView(80, 20, { viewMode: 'table', data: [{ t: 1, o: { close: 456 } }] });
    await until(() => instance.lastFrame()?.includes('456') ?? false);
    expect(instance.lastFrame()).toContain('456');
    expect(instance.lastFrame()).not.toContain('Chart unavailable');
  });

  it('shows a price warning alongside the successful metric chart', async () => {
    const instance = renderDataView(80, 20, { showPrice: true, priceError: 'price unavailable' });
    await until(() => chartValues.length > 0);
    expect(instance.lastFrame()).toContain('Price overlay unavailable: price unavailable');
    expect(chartValues.at(-1)).toEqual([[86400, 172800], [1, 2]]);
  });
});

describe('DataView table sizing', () => {
  it('reports the rows available below the param bar and metric line', async () => {
    const heights: number[] = [];
    renderDataView(80, 20, { viewMode: 'table', points: 50, onBodyHeightChange: (h) => heights.push(h) });
    await until(() => heights.length > 0);
    // 20 - border (2) - param bar (1) - metric line (1) = 16 rows (table header + 15 data rows).
    expect(heights.at(-1)).toBe(16);
  });

  it('never draws past the pane border, even when given more rows than fit', async () => {
    const { lastFrame } = renderDataView(80, 20, { viewMode: 'table', points: 50 });
    await until(() => (lastFrame() ?? '').split('\n').length === 20);
    const lines = (lastFrame() ?? '').split('\n');
    expect(lines).toHaveLength(20);
    expect(lines.at(-1)).toMatch(/^└─+┘$/);
    // The param bar and metric line aren't squeezed out by the long table.
    expect(lines[1]).toContain('[i]');
    expect(lines[2]).toContain('/addresses/count');
  });

  it('reports 0 when the pane has no room left for a body', async () => {
    const heights: number[] = [];
    // 4 rows = border (2) + param bar (1) + metric line (1): nothing left.
    renderDataView(80, 4, { viewMode: 'table', points: 50, onBodyHeightChange: (h) => heights.push(h) });
    await until(() => heights.length > 0);
    expect(heights.at(-1)).toBe(0);
  });
});
