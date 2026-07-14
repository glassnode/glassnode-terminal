import React, { useMemo } from 'react';
import { Box, Text } from 'ink';
import { InkUPlot } from 'ink-uplot';
import type { DataPoint, MetricParams } from '../lib/types.js';
import { formatDate, formatValue, padRight } from '../lib/format.js';
import { ParamBar } from './ParamBar.js';
import { Spinner } from './Spinner.js';

export type DataViewMode = 'table' | 'chart';

interface DataViewProps {
  data: DataPoint[];
  loading: boolean;
  error: string | null;
  params: MetricParams;
  selectedMetric: string | null;
  selectedAsset: string | null;
  isFocused: boolean;
  visibleRange: [number, number];
  selectedIndex: number;
  viewMode: DataViewMode;
  showPrice: boolean;
  priceData: DataPoint[];
  chartWidth: number;
  chartHeight: number;
}

export function DataView({
  data,
  loading,
  error,
  params,
  selectedMetric,
  selectedAsset,
  isFocused,
  visibleRange,
  selectedIndex,
  viewMode,
  showPrice,
  priceData,
  chartWidth,
  chartHeight,
}: DataViewProps): React.ReactElement {
  const [start, end] = visibleRange;
  const visible = data.slice(start, end);

  // Price lookup for table view
  const priceMap = useMemo(() => {
    if (!showPrice || priceData.length === 0) return null;
    const map = new Map<number, number>();
    for (const p of priceData) {
      if (typeof p.v === 'number') map.set(p.t, p.v);
    }
    return map;
  }, [showPrice, priceData]);

  // Prepare chart data: [timestamps[], values[]] with optional price overlay
  const chartData = useMemo(() => {
    if (data.length === 0) return null;
    const timestamps: number[] = [];
    const values: number[] = [];
    for (const point of data) {
      timestamps.push(point.t);
      values.push(typeof point.v === 'number' ? point.v : 0);
    }

    if (priceMap) {
      const prices: number[] = timestamps.map((t) => priceMap.get(t) ?? 0);
      // Price before value so uPlot draws it first (behind the main metric line).
      return [timestamps, prices, values] as [number[], number[], number[]];
    }

    return [timestamps, values] as [number[], number[]];
  }, [data, priceMap]);

  const chartOpts = useMemo(() => {
    const METRIC_COLOR = '#22d3ee'; // cyan — main metric line + its left axis
    const PRICE_COLOR = '#f59e0b'; // amber/orange — price line + its right axis
    const X_AXIS_COLOR = '#aaaaaa'; // brighter than the default grey for contrast

    // Main metric drawn last so it sits on top of the price overlay.
    const valueSeries = { stroke: METRIC_COLOR, label: 'Value', width: 1 };
    const priceSeries = { stroke: PRICE_COLOR, label: 'Price', width: 1, scale: 'price' };
    const series: object[] = priceMap
      ? [{}, priceSeries, valueSeries]
      : [{}, valueSeries];

    // uPlot draws these on the canvas: time on X (bottom), the main metric on the
    // left Y, and the price on the right Y. Each Y axis is tinted to match its line.
    const axes: object[] = [
      { stroke: X_AXIS_COLOR }, // X — time range
      { scale: 'y', side: 3, stroke: METRIC_COLOR }, // left — main metric
    ];
    if (priceMap) {
      axes.push({ scale: 'price', side: 1, stroke: PRICE_COLOR }); // right — price
    }

    return { width: 800, height: 400, series, axes };
  }, [priceMap]);

  return (
    <Box flexDirection="column" flexGrow={2} borderStyle="single" borderColor={isFocused ? 'cyan' : 'gray'}>
      <ParamBar params={params} viewMode={viewMode} showPrice={showPrice} />
      <Box paddingX={1} gap={1}>
        <Text dimColor>
          {selectedMetric && selectedAsset
            ? `${selectedMetric} (${selectedAsset})`
            : 'Select a metric and asset'}
        </Text>
        {loading && <Spinner label="" />}
      </Box>

      {error && (
        <Box paddingX={1}>
          <Text color="red">Error: {error}</Text>
        </Box>
      )}

      {!loading && !error && data.length > 0 && viewMode === 'table' && (
        <Box flexDirection="column">
          <Box paddingX={1} gap={2}>
            <Text bold>{padRight('Date', 16)}</Text>
            <Text bold>{padRight('Value', 16)}</Text>
            {priceMap && <Text bold dimColor>Price</Text>}
          </Box>
          {visible.map((point, i) => {
            const globalIndex = start + i;
            const isSelected = globalIndex === selectedIndex;
            const value = point.v !== undefined ? point.v : point.o;
            const price = priceMap?.get(point.t);
            return (
              <Box key={point.t} paddingX={1} gap={2}>
                <Text
                  color={isSelected ? 'black' : undefined}
                  backgroundColor={isSelected && isFocused ? 'cyan' : undefined}
                >
                  {padRight(formatDate(point.t, params.interval), 16)}
                </Text>
                <Text
                  color={isSelected ? 'black' : undefined}
                  backgroundColor={isSelected && isFocused ? 'cyan' : undefined}
                >
                  {padRight(formatValue(value), 16)}
                </Text>
                {priceMap && (
                  <Text dimColor>
                    {price != null ? formatValue(price) : '—'}
                  </Text>
                )}
              </Box>
            );
          })}
        </Box>
      )}

      {!loading && !error && data.length > 0 && viewMode === 'chart' && chartData && (
        <InkUPlot
          opts={chartOpts}
          data={chartData}
          width={Math.max(20, chartWidth)}
          height={Math.max(5, chartHeight)}
        />
      )}

      {!loading && !error && data.length === 0 && selectedMetric && selectedAsset && (
        <Box paddingX={1}>
          <Text dimColor>No data</Text>
        </Box>
      )}
    </Box>
  );
}
