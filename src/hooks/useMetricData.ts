import { useState, useEffect, useRef } from 'react';
import { createClient } from '../lib/api-client.js';
import { parseTime } from '../lib/time-parse.js';
import type { DataPoint, MetricParams } from '../lib/types.js';

interface UseMetricDataResult {
  data: DataPoint[];
  loading: boolean;
  error: string | null;
}

export function useMetricData(
  metricPath: string | null,
  asset: string | null,
  params: MetricParams,
): UseMetricDataResult {
  const [data, setData] = useState<DataPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef(0);

  useEffect(() => {
    if (!metricPath || !asset) {
      setData([]);
      return;
    }

    const requestId = ++abortRef.current;
    setLoading(true);
    setError(null);

    const queryParams: Record<string, string> = {
      a: asset,
      i: params.interval,
      s: String(parseTime(params.since)),
      c: params.currency,
    };

    const client = createClient();
    client
      .callMetric<DataPoint[]>(metricPath, queryParams)
      .then((result) => {
        if (abortRef.current !== requestId) return;
        setData(Array.isArray(result) ? result : []);
        setLoading(false);
      })
      .catch((err: Error) => {
        if (abortRef.current !== requestId) return;
        setError(err.message);
        setLoading(false);
      });
  }, [metricPath, asset, params.interval, params.since, params.currency]);

  return { data, loading, error };
}
