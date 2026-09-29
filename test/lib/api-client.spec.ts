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
    // Long enough to wait out the API's 60 s rate-limit window (via Retry-After).
    expect(startup.config['maxRetryDelay']).toBe(60_000);
    expect(startup.config['fetch']).not.toBe(interactive.config['fetch']);
    expect(startup.config['apiKey']).toBe('test-key');
  });
});

describe('rateLimitAwareFetch', () => {
  const respond = (status: number, headers: Record<string, string>) =>
    vi.fn(async () => new Response('{}', { status, headers }));

  it("exposes the API's x-rate-limit-reset as Retry-After on a 429", async () => {
    const { rateLimitAwareFetch } = await import('../../src/lib/api-client.js');
    const res = await rateLimitAwareFetch(respond(429, { 'x-rate-limit-reset': '37' }))('https://x');
    expect(res.status).toBe(429);
    expect(res.headers.get('retry-after')).toBe('37');
  });

  it('leaves other responses and an existing Retry-After alone', async () => {
    const { rateLimitAwareFetch } = await import('../../src/lib/api-client.js');
    const ok = await rateLimitAwareFetch(respond(200, { 'x-rate-limit-reset': '37' }))('https://x');
    expect(ok.headers.get('retry-after')).toBeNull();
    const own = await rateLimitAwareFetch(respond(429, { 'x-rate-limit-reset': '37', 'retry-after': '5' }))('https://x');
    expect(own.headers.get('retry-after')).toBe('5');
  });
});
