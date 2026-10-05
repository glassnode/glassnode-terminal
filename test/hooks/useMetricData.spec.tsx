import React from 'react';
import { Text } from 'ink';
import { render, cleanup } from 'ink-testing-library';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { DataPoint, MetricParams } from '../../src/lib/types.js';

const { callMetric } = vi.hoisted(() => ({ callMetric: vi.fn() }));
vi.mock('../../src/lib/api-client.js', () => ({ createClient: () => ({ callMetric }) }));
const { useMetricData } = await import('../../src/hooks/useMetricData.js');

const params: MetricParams = { interval: '24h', since: '30d', currency: 'usd' };
let state: ReturnType<typeof useMetricData>;
function Probe({ metric = '/addresses/count', asset = 'BTC', showPrice = true }: {
  metric?: string | null; asset?: string | null; showPrice?: boolean;
}) {
  state = useMetricData(metric, asset, params, showPrice);
  return <Text>{JSON.stringify(state)}</Text>;
}
function deferred() {
  let resolve!: (value: DataPoint[]) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<DataPoint[]>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}
async function settle() {
  await new Promise((resolve) => setTimeout(resolve, 30));
}
afterEach(() => { cleanup(); callMetric.mockReset(); });

describe('useMetricData', () => {
  it('shows metric data without waiting for the optional price request', async () => {
    const price = deferred();
    callMetric.mockImplementation((path) => path === '/market/price_usd_close'
      ? price.promise : Promise.resolve([{ t: 1, v: 123 }]));
    render(<Probe />);
    await vi.waitFor(() => expect(state.data).toEqual([{ t: 1, v: 123 }]));
    expect(state.loading).toBe(false);
    price.reject(new Error('price unavailable'));
    await vi.waitFor(() => expect(state.priceError).toBe('price unavailable'));
    expect(state.data).toEqual([{ t: 1, v: 123 }]);
    expect(state.error).toBeNull();
  });

  it.each(['success', 'failure'] as const)('ignores a late %s after selection is cleared', async (outcome) => {
    const metric = deferred();
    callMetric.mockReturnValue(metric.promise);
    const instance = render(<Probe showPrice={false} />);
    await vi.waitFor(() => expect(state.loading).toBe(true));
    instance.rerender(<Probe metric={null} showPrice={false} />);
    await vi.waitFor(() => expect(state.loading).toBe(false));
    if (outcome === 'success') metric.resolve([{ t: 1, v: 123 }]);
    else metric.reject(new Error('old failure'));
    await settle();
    expect(state).toEqual({ data: [], priceData: [], loading: false, error: null, priceError: null });
  });

  it('clears errors when the asset is deselected', async () => {
    callMetric.mockRejectedValue(new Error('metric unavailable'));
    const instance = render(<Probe showPrice={false} />);
    await vi.waitFor(() => expect(state.error).toBe('metric unavailable'));
    instance.rerender(<Probe asset={null} showPrice={false} />);
    await vi.waitFor(() => expect(state.error).toBeNull());
    expect(state.loading).toBe(false);
  });

  it('does not let an old asset response replace the newly selected asset', async () => {
    const old = deferred();
    callMetric.mockImplementation((_path, query) => query.a === 'BTC'
      ? old.promise : Promise.resolve([{ t: 1, v: 456 }]));
    const instance = render(<Probe showPrice={false} />);
    await vi.waitFor(() => expect(callMetric).toHaveBeenCalledTimes(1));
    instance.rerender(<Probe asset="ETH" showPrice={false} />);
    await vi.waitFor(() => expect(state.data).toEqual([{ t: 1, v: 456 }]));
    old.resolve([{ t: 1, v: 123 }]);
    await settle();
    expect(state.data).toEqual([{ t: 1, v: 456 }]);
  });

  it('toggling the price overlay does not refetch the primary metric', async () => {
    callMetric.mockResolvedValue([{ t: 1, v: 123 }]);
    const instance = render(<Probe />);
    await vi.waitFor(() => expect(callMetric).toHaveBeenCalledTimes(2));
    instance.rerender(<Probe showPrice={false} />);
    await vi.waitFor(() => expect(state.priceData).toEqual([]));
    instance.rerender(<Probe />);
    await vi.waitFor(() => expect(callMetric).toHaveBeenCalledTimes(3));
    expect(callMetric.mock.calls.filter(([path]) => path === '/addresses/count')).toHaveLength(1);
  });

  it('ignores a pending overlay failure after hiding the overlay', async () => {
    const price = deferred();
    callMetric.mockImplementation((path) => path === '/market/price_usd_close'
      ? price.promise : Promise.resolve([{ t: 1, v: 123 }]));
    const instance = render(<Probe />);
    await vi.waitFor(() => expect(state.data).toHaveLength(1));
    instance.rerender(<Probe showPrice={false} />);
    await settle();
    price.reject(new Error('old overlay failure'));
    await settle();
    expect(state.priceError).toBeNull();
    expect(state.data).toHaveLength(1);
  });

  it('fetches the price metric only once when it is the primary metric', async () => {
    callMetric.mockResolvedValue([{ t: 1, v: 123 }]);
    render(<Probe metric="/market/price_usd_close" />);
    await vi.waitFor(() => expect(state.loading).toBe(false));
    await vi.waitFor(() => expect(state.data).toHaveLength(1));
    expect(callMetric).toHaveBeenCalledTimes(1);
  });
});
