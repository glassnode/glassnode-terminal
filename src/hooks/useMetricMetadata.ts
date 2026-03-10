import { useState, useEffect, useRef } from 'react';
import type { MetricMetadata } from 'glassnode-api';
import { createClient } from '../lib/api-client.js';

interface UseMetricMetadataResult {
  metadata: MetricMetadata | null;
  supportedAssets: string[];
  loading: boolean;
  error: string | null;
}

/**
 * Fetch metric metadata to discover supported assets for a given metric.
 * Used in metric-first browse mode.
 */
export function useMetricMetadata(metricPath: string | null): UseMetricMetadataResult {
  const [metadata, setMetadata] = useState<MetricMetadata | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef(0);

  useEffect(() => {
    if (!metricPath) {
      setMetadata(null);
      return;
    }

    const requestId = ++abortRef.current;
    setLoading(true);
    setError(null);

    const client = createClient();
    client
      .getMetricMetadata(metricPath)
      .then((result) => {
        if (abortRef.current !== requestId) return;
        setMetadata(result);
        setLoading(false);
      })
      .catch((err: Error) => {
        if (abortRef.current !== requestId) return;
        setError(err.message);
        setLoading(false);
      });
  }, [metricPath]);

  const supportedAssets = metadata?.parameters?.['a'] ?? [];

  return { metadata, supportedAssets, loading, error };
}
