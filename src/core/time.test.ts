import { describe, expect, it } from 'vitest';
import { advanceClock, formatTime, isWithinHours } from './time';

describe('game clock', () => {
  it('formats noon and midnight correctly', () => {
    expect(formatTime(0)).toBe('00:00');
    expect(formatTime(720)).toBe('12:00');
  });

  it('advances across midnight and increments the weekday', () => {
    expect(advanceClock({ dayNumber: 1, weekdayIndex: 0, minutes: 23 * 60 + 30 }, 90)).toEqual({ dayNumber: 2, weekdayIndex: 1, minutes: 60 });
  });

  it('supports ordinary and overnight opening hours', () => {
    expect(isWithinHours(12 * 60, { open: 9 * 60, close: 17 * 60 })).toBe(true);
    expect(isWithinHours(18 * 60, { open: 9 * 60, close: 17 * 60 })).toBe(false);
    expect(isWithinHours(23 * 60, { open: 22 * 60, close: 2 * 60 })).toBe(true);
  });
});
