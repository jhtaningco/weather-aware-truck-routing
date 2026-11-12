import { describe, expect, it } from 'vitest';
import { formatAvgRisk, formatDistance, formatDuration, formatETA } from './formatters';

describe('formatters', () => {
  describe('formatDuration', () => {
    it('formats hours and minutes correctly', () => {
      expect(formatDuration(3600)).toBe('1h 0m');
      expect(formatDuration(5400)).toBe('1h 30m');
      expect(formatDuration(185)).toBe('3m');
      expect(formatDuration(0)).toBe('0m');
    });

    it('handles negative or fractional seconds gracefully', () => {
      expect(formatDuration(-10)).toBe('0m');
      expect(formatDuration(3659.8)).toBe('1h 1m');
    });
  });

  describe('formatDistance', () => {
    it('formats miles to 1 decimal place', () => {
      expect(formatDistance(125)).toBe('125.0 mi');
      expect(formatDistance(45.67)).toBe('45.7 mi');
      expect(formatDistance(0)).toBe('0.0 mi');
      expect(formatDistance(-5)).toBe('0.0 mi');
    });
  });

  describe('formatETA', () => {
    it('formats ISO-8601 string to friendly month/day/time format', () => {
      const formatted = formatETA('2026-11-12T14:30:00Z');
      expect(formatted).toMatch(/^[A-Z][a-z]{2}\s\d{1,2},\s\d{1,2}:\d{2}\s(AM|PM)$/);
    });

    it('returns raw string if invalid', () => {
      expect(formatETA('invalid-date')).toBe('invalid-date');
    });
  });

  describe('formatAvgRisk', () => {
    it('formats risk to 2 decimals', () => {
      expect(formatAvgRisk(0)).toBe('0.00');
      expect(formatAvgRisk(1.456)).toBe('1.46');
      expect(formatAvgRisk(3.1)).toBe('3.10');
    });
  });
});
