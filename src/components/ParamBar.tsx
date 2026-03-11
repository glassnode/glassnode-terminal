import React from 'react';
import { Box, Text } from 'ink';
import type { MetricParams } from '../lib/types.js';
import type { DataViewMode } from './DataView.js';

interface ParamBarProps {
  params: MetricParams;
  viewMode: DataViewMode;
  showPrice: boolean;
}

export function ParamBar({ params, viewMode, showPrice }: ParamBarProps): React.ReactElement {
  return (
    <Box gap={1} paddingX={1}>
      <Text>
        <Text color="yellow">[i]</Text>
        <Text>{params.interval}</Text>
      </Text>
      <Text>
        <Text color="yellow">[s]</Text>
        <Text>{params.since}</Text>
      </Text>
      <Text>
        <Text color="yellow">[c]</Text>
        <Text>{params.currency}</Text>
      </Text>
      <Text>
        <Text color="yellow">[v]</Text>
        <Text>{viewMode === 'table' ? 'table' : 'chart'}</Text>
      </Text>
      <Text>
        <Text color="yellow">[p]</Text>
        <Text>{showPrice ? 'price' : 'off'}</Text>
      </Text>
    </Box>
  );
}
