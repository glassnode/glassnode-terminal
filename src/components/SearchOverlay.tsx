import React from 'react';
import { Box, Text, useInput } from 'ink';

interface SearchOverlayProps {
  query: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
}

export function SearchOverlay({ query, onChange, onSubmit, onCancel }: SearchOverlayProps): React.ReactElement {
  useInput((input, key) => {
    if (key.escape) {
      onCancel();
    } else if (key.return) {
      onSubmit();
    } else if (key.backspace || key.delete) {
      onChange(query.slice(0, -1));
    } else if (input && !key.ctrl && !key.meta) {
      onChange(query + input);
    }
  });

  return (
    <Box borderStyle="single" borderColor="yellow" paddingX={1}>
      <Text color="yellow">/</Text>
      <Text>{query}</Text>
      <Text color="gray">█</Text>
      <Text dimColor> (Esc to cancel, Enter to confirm)</Text>
    </Box>
  );
}
