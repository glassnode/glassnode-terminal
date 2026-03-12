import React from 'react';
import { Box, Text } from 'ink';
import type { PriceMap } from '../hooks/usePulses.js';

interface PriceTickerProps {
  assets: string[];
  prices: PriceMap;
  selectedAsset: string | null;
}

function formatTickerPrice(price: number): string {
  if (price >= 1000) {
    return price.toLocaleString('en-US', { maximumFractionDigits: 0 });
  }
  if (price >= 1) {
    return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  return price.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 });
}

export function PriceTicker({ assets, prices, selectedAsset }: PriceTickerProps): React.ReactElement {
  const sel = selectedAsset?.toUpperCase() ?? null;

  return (
    <Box gap={1}>
      {assets.map((symbol) => {
        const pulse = prices.get(symbol);
        if (!pulse) return null;

        const isSelected = symbol === sel;
        const priceColor = pulse.direction === 'up' ? 'green'
          : pulse.direction === 'down' ? 'red'
          : undefined;

        return (
          <Text key={symbol}>
            <Text bold={isSelected} color={isSelected ? 'cyan' : 'gray'}>
              {symbol}
            </Text>
            <Text bold={isSelected} color={priceColor}>
              {' '}${formatTickerPrice(pulse.price)}
            </Text>
          </Text>
        );
      })}
    </Box>
  );
}
