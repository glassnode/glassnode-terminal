#!/usr/bin/env node
import React from 'react';
import { render, Text } from 'ink';
import { App } from './App.js';

if (!process.env['GLASSNODE_API_KEY']) {
  render(
    <Text color="red">
      Error: GLASSNODE_API_KEY environment variable is required.
      {'\n'}Set it with: export GLASSNODE_API_KEY=your-key
    </Text>,
  );
  setTimeout(() => process.exit(1), 100);
} else {
  render(<App />, { exitOnCtrlC: true });
}
