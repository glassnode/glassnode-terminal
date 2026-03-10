import { GlassnodeAPI } from 'glassnode-api';

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

  clientInstance = new GlassnodeAPI({ apiKey });
  return clientInstance;
}
