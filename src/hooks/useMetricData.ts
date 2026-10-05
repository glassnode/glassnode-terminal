import { useState, useEffect, useMemo } from 'react';
import { createClient } from '../lib/api-client.js';
import { parseTime } from '../lib/time-parse.js';
import type { DataPoint, MetricParams } from '../lib/types.js';

interface UseMetricDataResult {
  data: DataPoint[];
  priceData: DataPoint[];
  loading: boolean;
  error: string | null;
  priceError: string | null;
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
  const [priceError, setPriceError] = useState<string | null>(null);

  // Both requests use the same time range. Overlay toggles do not change it or refetch the metric.
  const queryParams = useMemo(() => metricPath && asset ? {
    a: asset,
    i: params.interval,
    s: String(parseTime(params.since)),
    c: params.currency,
  } : null, [metricPath, asset, params.interval, params.since, params.currency]);

  useEffect(() => {
    let active = true;
    setData([]);
    setError(null);
    setLoading(false);

    if (metricPath && queryParams) {
      setLoading(true);
      Promise.resolve()
        .then(() => createClient().callMetric<DataPoint[]>(metricPath, queryParams))
        .then((result) => {
          if (!active) return;
          setData(Array.isArray(result) ? result : []);
          setLoading(false);
        })
        .catch((err: Error) => {
          if (!active) return;
          setError(err.message);
          setLoading(false);
        });
    }

    // Invalidates late successes/failures on selection changes, clearing, and unmount.
    return () => { active = false; };
  }, [metricPath, queryParams]);

  useEffect(() => {
    let active = true;
    setPriceData([]);
    setPriceError(null);

    if (showPrice && metricPath && metricPath !== '/market/price_usd_close' && queryParams) {
      Promise.resolve()
        .then(() => createClient().callMetric<DataPoint[]>('/market/price_usd_close', queryParams))
        .then((result) => {
          if (active) setPriceData(Array.isArray(result) ? result : []);
        })
        .catch((err: Error) => {
          if (active) setPriceError(err.message);
        });
    }

    return () => { active = false; };
  }, [metricPath, queryParams, showPrice]);

  return { data, priceData, loading, error, priceError };
}
