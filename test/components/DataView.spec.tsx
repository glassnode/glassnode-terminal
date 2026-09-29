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

function renderDataView(paneWidth: number, paneHeight: number) {
  chartSizes.length = 0;
  return render(
    <Box width={paneWidth} height={paneHeight}>
      <DataView
        data={[
          { t: 1, v: 1 },
          { t: 2, v: 2 },
        ]}
        loading={false}
        error={null}
        params={{ interval: '24h', since: '30d', currency: 'usd' }}
        selectedMetric="/addresses/count"
        selectedAsset="BTC"
        isFocused={false}
        visibleRange={[0, 2]}
        selectedIndex={0}
        viewMode="chart"
        showPrice={false}
        priceData={[]}
        chartRedrawKey={0}
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
