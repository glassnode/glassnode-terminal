import React from 'react';
import { Box, Text } from 'ink';
import type { BrowseMode } from '../lib/types.js';

interface StatusBarProps {
  browseMode: BrowseMode;
}

export function StatusBar({ browseMode }: StatusBarProps): React.ReactElement {
  const modeLabel = browseMode === 'asset-first' ? 'Asset → Metric' : 'Metric → Asset';

  return (
    <Box borderStyle="single" borderColor="gray" paddingX={1} gap={2}>
      <Text dimColor>[{modeLabel}]</Text>
      <Text><Text color="yellow">←→</Text>:pane</Text>
      <Text><Text color="yellow">↑↓</Text>:navigate</Text>
      <Text><Text color="yellow">Enter</Text>:select</Text>
      <Text><Text color="yellow">/</Text>:search</Text>
      <Text><Text color="yellow">m</Text>:mode</Text>
      <Text><Text color="yellow">i</Text>:interval</Text>
      <Text><Text color="yellow">s</Text>:since</Text>
      <Text><Text color="yellow">c</Text>:currency</Text>
      <Text><Text color="yellow">q</Text>:quit</Text>
    </Box>
  );
}
