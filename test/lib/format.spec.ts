import { formatDate, formatNumber, formatValue, truncate, padRight, metricDisplayName } from '../../src/lib/format.js';

describe('formatDate', () => {
  it('formats unix timestamp as YYYY-MM-DD', () => {
    expect(formatDate(1704067200)).toBe('2024-01-01');
  });

  it('formats another date correctly', () => {
    expect(formatDate(1709251200)).toBe('2024-03-01');
  });
});

describe('formatNumber', () => {
  it('formats integers with commas', () => {
    expect(formatNumber(97234)).toBe('97,234');
  });

  it('formats decimals with 2 places', () => {
    expect(formatNumber(97234.5)).toBe('97,234.50');
  });

  it('formats zero', () => {
    expect(formatNumber(0)).toBe('0');
  });
});

describe('formatValue', () => {
  it('formats numbers', () => {
    expect(formatValue(42)).toBe('42');
  });

  it('formats strings', () => {
    expect(formatValue('hello')).toBe('hello');
  });

  it('formats objects as JSON', () => {
    expect(formatValue({ a: 1 })).toBe('{"a":1}');
  });

  it('formats null', () => {
    expect(formatValue(null)).toBe('');
  });
});

describe('truncate', () => {
  it('returns short strings unchanged', () => {
    expect(truncate('abc', 10)).toBe('abc');
  });

  it('truncates long strings with ellipsis', () => {
    expect(truncate('abcdefghij', 6)).toBe('abcd..');
  });
});

describe('padRight', () => {
  it('pads short strings', () => {
    expect(padRight('ab', 5)).toBe('ab   ');
  });

  it('truncates long strings', () => {
    expect(padRight('abcdef', 4)).toBe('abcd');
  });
});

describe('metricDisplayName', () => {
  it('converts path to display name with category', () => {
    expect(metricDisplayName('/market/price_usd_close')).toBe('market / price usd close');
  });

  it('handles nested categories', () => {
    expect(metricDisplayName('/distribution/balance_exchanges')).toBe('distribution / balance exchanges');
  });

  it('handles path without leading slash', () => {
    expect(metricDisplayName('market/price_usd_close')).toBe('market / price usd close');
  });

  it('handles single segment', () => {
    expect(metricDisplayName('/some_metric')).toBe('some metric');
  });
});
