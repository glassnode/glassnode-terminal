import { describe, it, expect, vi } from 'vitest';

vi.mock('../../src/lib/api-client.js', () => ({ createClient: vi.fn(), createStartupClient: vi.fn(), isX402Enabled: () => false }));
const { sortAssetsByMcap } = await import('../../src/lib/startup-data.js');

const asset = (symbol: string) => ({ id: symbol.toLowerCase(), symbol, name: symbol }) as never;

describe('sortAssetsByMcap', () => {
  it('orders by the latest market cap, treating a null value (no data) like a missing one', () => {
    const sorted = sortAssetsByMcap(
      [asset('ADA'), asset('BTC'), asset('XYZ'), asset('ETH')],
      [
        { bulk: [{ a: 'btc', v: 1 }, { a: 'eth', v: 2 }] },
        // glassnode-api >= 0.30: an asset without a value comes back as v: null.
        { bulk: [{ a: 'btc', v: 900 }, { a: 'eth', v: 400 }, { a: 'xyz', v: null }] },
      ],
    );
    expect(sorted.map((a) => a.symbol)).toEqual(['BTC', 'ETH', 'ADA', 'XYZ']);
  });
});
