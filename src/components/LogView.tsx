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
  // Lines wrap (see wrap="wrap" below), so a single entry can occupy more than
  // one row — long API-call URLs especially. Reserve headroom by showing fewer
  // entries than there are rows, and clip any remaining overflow so it can't
  // bleed past this pane into the status bar or neighbouring panes.
  const visible = entries.slice(-Math.max(1, Math.floor(height / 2)));

  return (
    <Box flexDirection="column" flexGrow={2} borderStyle="single" borderColor="yellow" overflow="hidden">
      <Box paddingX={1}>
        <Text bold color="yellow">Logs</Text>
        <Text dimColor> (press l to close)</Text>
      </Box>
      <Box flexDirection="column" paddingX={1} overflow="hidden">
        {visible.length === 0 && <Text dimColor>No log entries yet</Text>}
        {visible.map((entry, i) => (
          <Text key={i} wrap="wrap">
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
