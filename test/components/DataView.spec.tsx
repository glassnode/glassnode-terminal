import { vi, describe, it, expect } from 'vitest';
import React from 'react';
import { Box } from 'ink';
import { render } from 'ink-testing-library';

// Capture the size DataView gives the chart instead of rendering a real one.
const chartSizes = vi.hoisted(() => [] as Array<{ width?: number; height?: number }>);
vi.mock('ink-uplot', () => ({
  InkUPlot: (props: { width?: number; height?: number }) => {
    chartSizes.push({ width: props.width, height: props.height });
    return null;
  },
}));

const { DataView } = await import('../../src/components/DataView.js');

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function renderDataView(
  paneWidth: number,
  paneHeight: number,
  { viewMode = 'chart', points = 2, onBodyHeightChange }: {
    viewMode?: 'chart' | 'table';
    points?: number;
    onBodyHeightChange?: (height: number) => void;
  } = {},
) {
  chartSizes.length = 0;
  const data = Array.from({ length: points }, (_, i) => ({ t: 86400 * (i + 1), v: i + 1 }));
  return render(
    <Box width={paneWidth} height={paneHeight}>
      <DataView
        data={data}
        loading={false}
        error={null}
        params={{ interval: '24h', since: '30d', currency: 'usd' }}
        selectedMetric="/addresses/count"
        selectedAsset="BTC"
        isFocused={false}
        visibleRange={[0, points]}
        selectedIndex={0}
        viewMode={viewMode}
        showPrice={false}
        priceData={[]}
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
    await delay(50);
    expect(chartSizes.at(-1)).toEqual({ width: 78, height: 16 });
  });

  it('shrinks the chart when the param bar wraps in a narrow pane', async () => {
    // Narrow pane: the param bar and metric line wrap, so fewer rows remain.
    renderDataView(34, 20);
    await delay(50);
    const size = chartSizes.at(-1)!;
    expect(size.width).toBe(32);
    expect(size.height).toBeLessThan(16);
    expect(size.height).toBeGreaterThan(0);
  });
});

describe('DataView table sizing', () => {
  it('reports the rows available below the param bar and metric line', async () => {
    const heights: number[] = [];
    renderDataView(80, 20, { viewMode: 'table', points: 50, onBodyHeightChange: (h) => heights.push(h) });
    await delay(50);
    // 20 - border (2) - param bar (1) - metric line (1) = 16 rows (table header + 15 data rows).
    expect(heights.at(-1)).toBe(16);
  });

  it('never draws past the pane border, even when given more rows than fit', async () => {
    const { lastFrame } = renderDataView(80, 20, { viewMode: 'table', points: 50 });
    await delay(50);
    const lines = (lastFrame() ?? '').split('\n');
    expect(lines).toHaveLength(20);
    expect(lines.at(-1)).toMatch(/^└─+┘$/);
    // The param bar and metric line aren't squeezed out by the long table.
    expect(lines[1]).toContain('[i]');
    expect(lines[2]).toContain('/addresses/count');
  });
});
