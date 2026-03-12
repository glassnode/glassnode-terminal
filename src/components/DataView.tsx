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
      return [timestamps, values, prices] as [number[], number[], number[]];
    }

    return [timestamps, values] as [number[], number[]];
  }, [data, priceMap]);

  const chartOpts = useMemo(() => {
    const series: object[] = [
      {},
      { stroke: 'cyan', label: 'Value', width: 2 },
    ];
    if (priceMap) {
      series.push({ stroke: '#555', label: 'Price', width: 1, scale: 'price' });
    }
    return {
      width: 800,
      height: 400,
      series,
      axes: [
        { show: false },
        { show: false },
      ],
    };
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
          threshold={30}
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
