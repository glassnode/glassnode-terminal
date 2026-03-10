import { useState, useEffect, useRef } from 'react';
import { createClient } from '../lib/api-client.js';

interface UseMetricsResult {
  metrics: string[];
  loading: boolean;
  error: string | null;
}

/**
 * Fetch the full metric list once, cache it, and optionally filter by asset.
 * When in metric-first mode (no asset selected), returns all metrics.
 */
export function useMetrics(): UseMetricsResult {
  const [metrics, setMetrics] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetched = useRef(false);

  useEffect(() => {
    if (fetched.current) return;
    fetched.current = true;

    const client = createClient();
    client
      .getMetricList()
      .then((data) => {
        setMetrics(data);
        setLoading(false);
      })
      .catch((err: Error) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  return { metrics, loading, error };
}
