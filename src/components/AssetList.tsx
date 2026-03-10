import React from 'react';
import { Box, Text } from 'ink';
import type { AssetMetadata } from 'glassnode-api';
import { HighlightedText } from './HighlightedText.js';

interface AssetListProps {
  assets: AssetMetadata[];
  selectedIndex: number;
  visibleRange: [number, number];
  isFocused: boolean;
  title: string;
  maxWidth?: number;
  searchQuery?: string;
}

export function AssetList({ assets, selectedIndex, visibleRange, isFocused, title, maxWidth = 35, searchQuery = '' }: AssetListProps): React.ReactElement {
  const [start, end] = visibleRange;
  const visible = assets.slice(start, end);

  return (
    <Box flexDirection="column" flexGrow={0} flexShrink={0} width={maxWidth} borderStyle="single" borderColor={isFocused ? 'cyan' : 'gray'}>
      <Box paddingX={1}>
        <Text bold color={isFocused ? 'cyan' : 'white'}>{title}</Text>
      </Box>
      {visible.map((asset, i) => {
        const globalIndex = start + i;
        const isSelected = globalIndex === selectedIndex;
        const bg = isSelected ? (isFocused ? 'cyan' : 'gray') : undefined;
        const fg = isSelected ? 'black' : undefined;
        return (
          <Box key={asset.id} paddingX={1}>
            <HighlightedText
              text={`${asset.symbol} - ${asset.name}`}
              highlight={searchQuery}
              color={fg}
              backgroundColor={bg}
            />
          </Box>
        );
      })}
      {assets.length === 0 && (
        <Box paddingX={1}>
          <Text dimColor>No assets</Text>
        </Box>
      )}
    </Box>
  );
}
