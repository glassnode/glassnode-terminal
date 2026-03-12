import React from 'react';
import { Box, Text } from 'ink';
import type { MetricListItem } from '../lib/types.js';
import { HighlightedText } from './HighlightedText.js';

interface MetricListProps {
  items: MetricListItem[];
  selectedIndex: number;
  visibleRange: [number, number];
  isFocused: boolean;
  title: string;
  maxWidth?: number;
  searchQuery?: string;
}

export function MetricList({ items, selectedIndex, visibleRange, isFocused, title, maxWidth = 50, searchQuery = '' }: MetricListProps): React.ReactElement {
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
        const bg = isSelected ? (isFocused ? 'cyan' : 'gray') : undefined;
        const fg = isSelected ? 'black' : undefined;
        return (
          <Box key={`m-${globalIndex}-${item.path}`} paddingX={1} paddingLeft={3}>
            <HighlightedText
              text={item.displayName}
              highlight={searchQuery}
              color={fg}
              backgroundColor={bg}
            />
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
