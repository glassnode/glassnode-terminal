/**
 * Format a unix timestamp (seconds) as YYYY-MM-DD
 */
export function formatDate(unix: number): string {
  const d = new Date(unix * 1000);
  return d.toISOString().slice(0, 10);
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
