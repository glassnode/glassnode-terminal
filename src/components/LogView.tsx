import React from 'react';
import { Box, Text } from 'ink';
import { useLogs, type LogEntry } from '../lib/logger.js';

interface LogViewProps {
  height: number;
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

const LEVEL_COLOR: Record<LogEntry['level'], string> = {
  info: 'blue',
  error: 'red',
  ws: 'magenta',
};

export function LogView({ height }: LogViewProps): React.ReactElement {
  const entries = useLogs();
  const visible = entries.slice(-Math.max(1, height));

  return (
    <Box flexDirection="column" flexGrow={2} borderStyle="single" borderColor="yellow">
      <Box paddingX={1}>
        <Text bold color="yellow">Logs</Text>
        <Text dimColor> (press l to close)</Text>
      </Box>
      <Box flexDirection="column" paddingX={1}>
        {visible.length === 0 && <Text dimColor>No log entries yet</Text>}
        {visible.map((entry, i) => (
          <Text key={i} wrap="truncate">
            <Text dimColor>{formatTime(entry.time)}</Text>
            {' '}
            <Text color={LEVEL_COLOR[entry.level]}>[{entry.level}]</Text>
            {' '}
            <Text>{entry.message}</Text>
          </Text>
        ))}
      </Box>
    </Box>
  );
}
