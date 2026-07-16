#!/usr/bin/env node
import React from 'react';
import { render, Text } from 'ink';
import { App } from './App.js';
import { initClient } from './lib/api-client.js';

function fail(message: string): void {
  render(<Text color="red">{message}</Text>);
  setTimeout(() => process.exit(1), 100);
}

const hasApiKey = !!process.env['GLASSNODE_API_KEY'];
const hasX402 = !!process.env['X402_PRIVATE_KEY'];

if (!hasApiKey && !hasX402) {
  fail(
    'Error: no Glassnode credentials.\n' +
      'Set GLASSNODE_API_KEY for the free/metered API, or\n' +
      'X402_PRIVATE_KEY (a funded Base wallet key) for x402 pay-per-call.',
  );
} else {
  try {
    // Build the client up front (x402 setup is async) so hooks can use it synchronously.
    await initClient();
    render(<App />, { exitOnCtrlC: true });
  } catch (err) {
    fail(`Error initializing Glassnode client: ${err instanceof Error ? err.message : String(err)}`);
  }
}
