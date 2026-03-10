import { parseTime } from '../../src/lib/time-parse.js';

describe('parseTime', () => {
  it('parses unix timestamps', () => {
    expect(parseTime('1704067200')).toBe(1704067200);
  });

  it('parses relative durations', () => {
    const now = Math.floor(Date.now() / 1000);
    const result = parseTime('30d');
    // Should be approximately 30 days ago
    expect(result).toBeGreaterThan(now - 30 * 86400 - 5);
    expect(result).toBeLessThan(now - 30 * 86400 + 5);
  });

  it('parses hours', () => {
    const now = Math.floor(Date.now() / 1000);
    const result = parseTime('1h');
    expect(result).toBeGreaterThan(now - 3600 - 5);
    expect(result).toBeLessThan(now - 3600 + 5);
  });

  it('parses minutes', () => {
    const now = Math.floor(Date.now() / 1000);
    const result = parseTime('10m');
    expect(result).toBeGreaterThan(now - 600 - 5);
    expect(result).toBeLessThan(now - 600 + 5);
  });

  it('parses ISO dates', () => {
    expect(parseTime('2024-01-01')).toBe(1704067200);
  });

  it('parses RFC 3339 dates', () => {
    expect(parseTime('2024-01-01T00:00:00Z')).toBe(1704067200);
  });

  it('throws on unrecognized format', () => {
    expect(() => parseTime('abc')).toThrow('Unrecognized time format');
  });

  it('throws on empty string', () => {
    expect(() => parseTime('')).toThrow('Unrecognized time format');
  });
});
