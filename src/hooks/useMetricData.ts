import { useState, useEffect, useRef } from 'react';
import { createClient } from '../lib/api-client.js';
import { parseTime } from '../lib/time-parse.js';
import type { DataPoint, MetricParams } from '../lib/types.js';

interface UseMetricDataResult {
  data: DataPoint[];
  priceData: DataPoint[];
  loading: boolean;
  error: string | null;
}

export function useMetricData(
  metricPath: string | null,
  asset: string | null,
  params: MetricParams,
  showPrice?: boolean,
): UseMetricDataResult {
  const [data, setData] = useState<DataPoint[]>([]);
  const [priceData, setPriceData] = useState<DataPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef(0);

  useEffect(() => {
    if (!metricPath || !asset) {
      setData([]);
      setPriceData([]);
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
    const metricPromise = client.callMetric<DataPoint[]>(metricPath, queryParams);

    const fetchPrice = showPrice && metricPath !== '/market/price_usd_close';
    const pricePromise = fetchPrice
      ? client.callMetric<DataPoint[]>('/market/price_usd_close', queryParams)
      : Promise.resolve([]);

    Promise.all([metricPromise, pricePromise])
      .then(([metricResult, priceResult]) => {
        if (abortRef.current !== requestId) return;
        setData(Array.isArray(metricResult) ? metricResult : []);
        setPriceData(Array.isArray(priceResult) ? priceResult : []);
        setLoading(false);
      })
      .catch((err: Error) => {
        if (abortRef.current !== requestId) return;
        setError(err.message);
        setLoading(false);
      });
  }, [metricPath, asset, params.interval, params.since, params.currency, showPrice]);

  return { data, priceData, loading, error };
}
