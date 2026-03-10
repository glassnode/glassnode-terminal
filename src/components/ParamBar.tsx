import React from 'react';
import { Box, Text } from 'ink';
import type { MetricParams } from '../lib/types.js';

interface ParamBarProps {
  params: MetricParams;
}

export function ParamBar({ params }: ParamBarProps): React.ReactElement {
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
    </Box>
  );
}
