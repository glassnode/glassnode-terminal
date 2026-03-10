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
  chartWidth,
  chartHeight,
}: DataViewProps): React.ReactElement {
  const [start, end] = visibleRange;
  const visible = data.slice(start, end);

  // Prepare chart data: [timestamps[], values[]]
  const chartData = useMemo(() => {
    if (data.length === 0) return null;
    const timestamps: number[] = [];
    const values: number[] = [];
    for (const point of data) {
      timestamps.push(point.t);
      if (typeof point.v === 'number') {
        values.push(point.v);
      } else {
        values.push(0);
      }
    }
    return [timestamps, values] as [number[], number[]];
  }, [data]);

  const chartOpts = useMemo(() => ({
    width: 800,
    height: 400,
    series: [
      {},
      { stroke: 'cyan', label: 'Value', width: 1 },
    ],
    axes: [
      { show: false },
      { show: false },
    ],
  }), []);

  return (
    <Box flexDirection="column" flexGrow={2} borderStyle="single" borderColor={isFocused ? 'cyan' : 'gray'}>
      <ParamBar params={params} />
      <Box paddingX={1} gap={1}>
        <Text dimColor>
          {selectedMetric && selectedAsset
            ? `${selectedMetric} (${selectedAsset})`
            : 'Select a metric and asset'}
        </Text>
        {loading && <Spinner label="" />}
        {data.length > 0 && (
          <Text dimColor> [{viewMode === 'table' ? 'Table' : 'Chart'}]</Text>
        )}
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
            <Text bold>Value</Text>
          </Box>
          {visible.map((point, i) => {
            const globalIndex = start + i;
            const isSelected = globalIndex === selectedIndex;
            const value = point.v !== undefined ? point.v : point.o;
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
                  {formatValue(value)}
                </Text>
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
