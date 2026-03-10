/**
 * Format a unix timestamp (seconds) with resolution based on interval.
 * 10m → "2026-02-08 15:10", 1h → "2026-02-08 04", 24h/1d → "2026-02-08",
 * 1w → "2026-02-08", 1month → "2026-02", 1y → "2026"
 */
export function formatDate(unix: number, interval = '24h'): string {
  const d = new Date(unix * 1000);
  const iso = d.toISOString();
  const date = iso.slice(0, 10);
  const hh = iso.slice(11, 13);
  const mm = iso.slice(14, 16);

  if (interval === '1y') return date.slice(0, 4);
  if (interval === '1month') return date.slice(0, 7);
  if (interval === '1w' || interval === '24h' || interval === '1d') return date;
  if (interval === '1h') return `${date} ${hh}`;
  return `${date} ${hh}:${mm}`;
}

/**
 * Format a number with locale-aware thousand separators
 */
export function formatNumber(n: number): string {
  if (Number.isInteger(n)) {
    return n.toLocaleString('en-US');
  }
  return n.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Format a metric value (number, string, or object)
 */
export function formatValue(v: unknown): string {
  if (typeof v === 'number') return formatNumber(v);
  if (typeof v === 'string') return v;
  if (v !== null && typeof v === 'object') return JSON.stringify(v);
  return String(v ?? '');
}

/**
 * Truncate a string to a max length, adding ellipsis if needed
 */
export function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 2) + '..';
}

/**
 * Convert a metric path like "/market/price_usd_close" to a display name
 * like "market / price usd close"
 */
export function metricDisplayName(path: string): string {
  const clean = path.startsWith('/') ? path.slice(1) : path;
  const parts = clean.split('/');
  if (parts.length === 0) return path;

  const name = parts.pop()!.replace(/_/g, ' ');
  const category = parts.join('/');

  if (category) {
    return `${category} / ${name}`;
  }
  return name;
}

/**
 * Pad a string to a fixed width (right-pad with spaces)
 */
export function padRight(str: string, width: number): string {
  if (str.length >= width) return str.slice(0, width);
  return str + ' '.repeat(width - str.length);
}
