const DURATION_UNITS: Record<string, number> = {
  y: 365 * 86400,
  M: 30 * 86400,
  w: 7 * 86400,
  d: 86400,
  h: 3600,
  m: 60,
  s: 1,
};

function isAllDigits(s: string): boolean {
  return s.length > 0 && /^\d+$/.test(s);
}

function parseRelativeDuration(input: string): number | null {
  input = input.trim();
  if (input.length < 2) return null;

  const unit = input[input.length - 1]!;
  const multiplier = DURATION_UNITS[unit];
  if (multiplier === undefined) return null;

  const numStr = input.slice(0, -1);
  if (!isAllDigits(numStr)) return null;

  const n = parseInt(numStr, 10);
  return n * multiplier;
}

/**
 * Parse a time string into a unix timestamp (seconds).
 * Supports: unix timestamps, relative durations (30d, 1h), ISO dates, RFC 3339.
 */
export function parseTime(input: string): number {
  if (input === 'all') return 0;

  if (isAllDigits(input)) {
    return parseInt(input, 10);
  }

  const durationSeconds = parseRelativeDuration(input);
  if (durationSeconds !== null) {
    return Math.floor(Date.now() / 1000) - durationSeconds;
  }

  // ISO date: YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) {
    const ms = Date.parse(input + 'T00:00:00Z');
    if (!isNaN(ms)) return Math.floor(ms / 1000);
  }

  // RFC 3339 / ISO 8601
  const ms = Date.parse(input);
  if (!isNaN(ms)) return Math.floor(ms / 1000);

  throw new Error(`Unrecognized time format: "${input}"`);
}
