import React from 'react';
import { Text } from 'ink';

interface HighlightedTextProps {
  text: string;
  highlight: string;
  color?: string;
  backgroundColor?: string;
}

export function HighlightedText({ text, highlight, color, backgroundColor }: HighlightedTextProps): React.ReactElement {
  if (!highlight) {
    return <Text color={color} backgroundColor={backgroundColor} wrap="truncate-end">{text}</Text>;
  }

  const lowerText = text.toLowerCase();
  const lowerQuery = highlight.toLowerCase();
  const idx = lowerText.indexOf(lowerQuery);

  if (idx === -1) {
    return <Text color={color} backgroundColor={backgroundColor} wrap="truncate-end">{text}</Text>;
  }

  const before = text.slice(0, idx);
  const match = text.slice(idx, idx + highlight.length);
  const after = text.slice(idx + highlight.length);

  return (
    <Text color={color} backgroundColor={backgroundColor} wrap="truncate-end">
      {before}
      <Text color="yellow" bold>{match}</Text>
      {after}
    </Text>
  );
}
