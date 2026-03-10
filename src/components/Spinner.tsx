import React from 'react';
import { Text } from 'ink';
import InkSpinner from 'ink-spinner';

interface SpinnerProps {
  label: string;
}

export function Spinner({ label }: SpinnerProps): React.ReactElement {
  return (
    <Text>
      <InkSpinner type="dots" />
      {' '}
      {label}
    </Text>
  );
}
