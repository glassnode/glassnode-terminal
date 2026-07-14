import { createRequire } from 'node:module';
import { GlassnodeAPI } from 'glassnode-api';
import { log } from './logger.js';

const require = createRequire(import.meta.url);
const { version } = require('../../package.json') as { version: string };

export const USER_AGENT = `glassnode-terminal-${version}`;

let clientInstance: GlassnodeAPI | null = null;

/**
 * Create or return cached GlassnodeAPI client.
 * Reads API key from GLASSNODE_API_KEY env var.
 */
export function createClient(): GlassnodeAPI {
  if (clientInstance) return clientInstance;

  const apiKey = process.env['GLASSNODE_API_KEY'];
  if (!apiKey) {
    throw new Error(
      'GLASSNODE_API_KEY environment variable is required.\n' +
        'Set it with: export GLASSNODE_API_KEY=your-key',
    );
  }

  const customFetch: typeof globalThis.fetch = (input, init) => {
    const headers = new Headers(init?.headers);
    headers.set('User-Agent', USER_AGENT);
    return globalThis.fetch(input, { ...init, headers });
  };

  clientInstance = new GlassnodeAPI({
    apiKey,
    // The client calls logger with multiple args, e.g. logger('API call:', url).
    // Join them all so the URL/params actually show up in the log view.
    logger: (...parts: unknown[]) =>
      log('info', parts.map((p) => (typeof p === 'string' ? p : JSON.stringify(p))).join(' ')),
    fetch: customFetch,
  });
  return clientInstance;
}
