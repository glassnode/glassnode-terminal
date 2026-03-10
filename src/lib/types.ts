export enum Pane {
  Left = 'left',
  Middle = 'middle',
  Data = 'data',
}

export type BrowseMode = 'asset-first' | 'metric-first';

export interface MetricParams {
  interval: string;
  since: string;
  currency: string;
}

export interface DataPoint {
  t: number;
  v?: number | string;
  o?: Record<string, unknown>;
}

export type MetricListItem =
  | { type: 'group-header'; label: string }
  | { type: 'tag-header'; label: string }
  | { type: 'metric'; path: string; displayName: string };

export const INTERVALS = ['10m', '1h', '24h', '1w', '1month'] as const;
export const SINCE_OPTIONS = ['1d', '7d', '30d', '90d', '1y'] as const;
export const CURRENCIES = ['usd', 'native'] as const;

export const DEFAULT_PARAMS: MetricParams = {
  interval: '24h',
  since: '30d',
  currency: 'usd',
};
