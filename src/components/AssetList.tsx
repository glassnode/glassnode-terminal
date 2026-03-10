import React from 'react';
import { Box, Text } from 'ink';
import type { AssetMetadata } from 'glassnode-api';

interface AssetListProps {
  assets: AssetMetadata[];
  selectedIndex: number;
  visibleRange: [number, number];
  isFocused: boolean;
  title: string;
  maxWidth?: number;
}

export function AssetList({ assets, selectedIndex, visibleRange, isFocused, title, maxWidth = 35 }: AssetListProps): React.ReactElement {
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
        return (
          <Box key={asset.id} paddingX={1}>
            <Text
              wrap="truncate-end"
              color={isSelected ? 'black' : undefined}
              backgroundColor={isSelected ? (isFocused ? 'cyan' : 'gray') : undefined}
            >
              {asset.symbol} - {asset.name}
            </Text>
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
