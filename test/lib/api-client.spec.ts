import { describe, it, expect, vi, beforeEach } from 'vitest';

const constructed = vi.hoisted(() => [] as Array<Record<string, unknown>>);
vi.mock('glassnode-api', () => ({
  GlassnodeAPI: class {
    constructor(public config: Record<string, unknown>) {
      constructed.push(config);
    }
  },
}));

describe('api-client startup client', () => {
  beforeEach(() => {
    constructed.length = 0;
    vi.resetModules();
    delete process.env['X402_PRIVATE_KEY'];
    process.env['GLASSNODE_API_KEY'] = 'test-key';
    process.env['GLASSNODE_MODE'] = 'api';
  });

  it('uses a separate client with more retries for the startup metadata burst (API-key mode)', async () => {
    const { initClient, createClient, createStartupClient } = await import('../../src/lib/api-client.js');
    await initClient();
    const interactive = createClient() as unknown as { config: Record<string, unknown> };
    const startup = createStartupClient() as unknown as { config: Record<string, unknown> };
    expect(startup).not.toBe(interactive);
    // Interactive calls keep glassnode-api's default; the startup burst retries rate limits more.
    expect(interactive.config['maxRetries']).toBeUndefined();
    expect(startup.config['maxRetries']).toBe(5);
    expect(startup.config['apiKey']).toBe('test-key');
  });
});
