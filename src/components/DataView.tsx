import React from 'react';
import { Box, Text } from 'ink';
import type { DataPoint, MetricParams } from '../lib/types.js';
import { formatDate, formatValue, padRight } from '../lib/format.js';
import { ParamBar } from './ParamBar.js';
import { Spinner } from './Spinner.js';

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
}: DataViewProps): React.ReactElement {
  const [start, end] = visibleRange;
  const visible = data.slice(start, end);

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
      </Box>

      {error && (
        <Box paddingX={1}>
          <Text color="red">Error: {error}</Text>
        </Box>
      )}

      {!loading && !error && data.length > 0 && (
        <Box flexDirection="column">
          <Box paddingX={1} gap={2}>
            <Text bold>{padRight('Date', 12)}</Text>
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
                  {padRight(formatDate(point.t), 12)}
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

      {!loading && !error && data.length === 0 && selectedMetric && selectedAsset && (
        <Box paddingX={1}>
          <Text dimColor>No data</Text>
        </Box>
      )}
    </Box>
  );
}
