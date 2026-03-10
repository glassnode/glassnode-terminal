import React from 'react';
import { Box, Text } from 'ink';
import type { MetricListItem } from '../lib/types.js';

interface MetricListProps {
  items: MetricListItem[];
  selectedIndex: number;
  visibleRange: [number, number];
  isFocused: boolean;
  title: string;
  maxWidth?: number;
}

export function MetricList({ items, selectedIndex, visibleRange, isFocused, title, maxWidth = 70 }: MetricListProps): React.ReactElement {
  const [start, end] = visibleRange;
  const visible = items.slice(start, end);

  return (
    <Box flexDirection="column" flexGrow={0} flexShrink={0} width={maxWidth} borderStyle="single" borderColor={isFocused ? 'cyan' : 'gray'}>
      <Box paddingX={1}>
        <Text bold color={isFocused ? 'cyan' : 'white'}>{title}</Text>
      </Box>
      {visible.map((item, i) => {
        const globalIndex = start + i;

        if (item.type === 'tag-header') {
          return (
            <Box key={`t-${globalIndex}-${item.label}`} paddingX={1}>
              <Text bold color="yellow">{item.label}</Text>
            </Box>
          );
        }

        if (item.type === 'group-header') {
          return (
            <Box key={`g-${globalIndex}-${item.label}`} paddingX={1} paddingLeft={2}>
              <Text dimColor>{item.label}</Text>
            </Box>
          );
        }

        const isSelected = globalIndex === selectedIndex;
        return (
          <Box key={`m-${globalIndex}-${item.path}`} paddingX={1} paddingLeft={3}>
            <Text
              wrap="truncate-end"
              color={isSelected ? 'black' : undefined}
              backgroundColor={isSelected ? (isFocused ? 'cyan' : 'gray') : undefined}
            >
              {item.displayName}
            </Text>
          </Box>
        );
      })}
      {items.length === 0 && (
        <Box paddingX={1}>
          <Text dimColor>No metrics</Text>
        </Box>
      )}
    </Box>
  );
}
