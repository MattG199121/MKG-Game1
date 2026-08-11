import type { GameState, Hours, Weekday } from './types';

export const WEEKDAYS: Weekday[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export function formatTime(minutes: number): string {
  const normal = ((minutes % 1440) + 1440) % 1440;
  const hours = Math.floor(normal / 60);
  const mins = normal % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

export function advanceClock(time: GameState['time'], amount: number): GameState['time'] {
  const total = time.minutes + Math.max(0, Math.round(amount));
  const dayDelta = Math.floor(total / 1440);
  return {
    dayNumber: time.dayNumber + dayDelta,
    weekdayIndex: (time.weekdayIndex + dayDelta) % 7,
    minutes: total % 1440,
  };
}

export function isWithinHours(minutes: number, hours: Hours): boolean {
  if (hours.open === hours.close) return true;
  if (hours.open < hours.close) return minutes >= hours.open && minutes < hours.close;
  return minutes >= hours.open || minutes < hours.close;
}

export function formatHours(hours: Hours): string {
  return `${formatTime(hours.open)}–${formatTime(hours.close)}`;
}
