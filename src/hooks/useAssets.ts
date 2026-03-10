import { useState, useEffect, useRef } from 'react';
import type { AssetMetadata } from 'glassnode-api';
import { createClient } from '../lib/api-client.js';
import type { DataPoint } from '../lib/types.js';

interface UseAssetsResult {
  assets: AssetMetadata[];
  loading: boolean;
  error: string | null;
}

export function useAssets(): UseAssetsResult {
  const [assets, setAssets] = useState<AssetMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetched = useRef(false);

  useEffect(() => {
    if (fetched.current) return;
    fetched.current = true;

    const client = createClient();

    // Fetch assets and market caps in parallel, sort by market cap descending
    Promise.all([
      client.getAssetMetadata(),
      client
        .callMetric<DataPoint[]>('/market/marketcap_usd', { a: '*', i: '24h', f: 'json' })
        .catch(() => [] as DataPoint[]),
    ])
      .then(([assetData, mcapData]) => {
        // Build a map of asset symbol → latest market cap value
        // The bulk response with a=* returns objects with asset keys
        const mcapBySymbol = new Map<string, number>();

        if (Array.isArray(mcapData) && mcapData.length > 0) {
          // Get the last data point (most recent)
          const latest = mcapData[mcapData.length - 1]!;
          if (latest.o && typeof latest.o === 'object') {
            // Object-style response: { t, o: { BTC: 1234, ETH: 567, ... } }
            for (const [symbol, value] of Object.entries(latest.o)) {
              if (typeof value === 'number') {
                mcapBySymbol.set(symbol.toUpperCase(), value);
              }
            }
          } else if (typeof latest.v === 'number') {
            // Single value - won't help for sorting multiple assets
          }
        }

        // Sort assets: those with market cap first (descending), then alphabetical
        const sorted = [...assetData].sort((a, b) => {
          const mcapA = mcapBySymbol.get(a.symbol.toUpperCase()) ?? 0;
          const mcapB = mcapBySymbol.get(b.symbol.toUpperCase()) ?? 0;
          if (mcapA !== mcapB) return mcapB - mcapA;
          return a.symbol.localeCompare(b.symbol);
        });

        setAssets(sorted);
        setLoading(false);
      })
      .catch((err: Error) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  return { assets, loading, error };
}
