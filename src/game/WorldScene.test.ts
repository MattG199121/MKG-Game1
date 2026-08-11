import { describe, expect, it } from 'vitest';
import { avatarCounterRotation, screenFacingDirection, screenToWorldDirection, VIEW_ORIENTATIONS, type ViewOrientation } from './viewRotation';

describe('screen-relative movement with a rotated view', () => {
  const expected: Record<ViewOrientation, { x: number; y: number }> = {
    north: { x: 0, y: -1 },
    east: { x: 1, y: 0 },
    south: { x: 0, y: 1 },
    west: { x: -1, y: 0 },
  };

  it.each(Object.entries(expected) as [ViewOrientation, { x: number; y: number }][])('maps screen-up to world %s', (orientation, worldDirection) => {
    expect(screenToWorldDirection(0, -1, orientation)).toEqual(worldDirection);
  });

  it('preserves diagonal magnitude in every orientation', () => {
    for (const orientation of ['north', 'east', 'south', 'west'] as const) {
      const vector = screenToWorldDirection(1, -1, orientation);
      expect(vector.x ** 2 + vector.y ** 2).toBe(2);
    }
  });

  it('keeps opposite inputs cancelled in every orientation', () => {
    for (const orientation of ['north', 'east', 'south', 'west'] as const) {
      expect(screenToWorldDirection(0, 0, orientation)).toEqual({ x: 0, y: 0 });
    }
  });
});

describe('avatar facing with a rotated view', () => {
  it.each(['north', 'east', 'south', 'west'] as const)('counter-rotates the avatar so its artwork stays upright for %s-up', (orientation) => {
    const quarterTurns = VIEW_ORIENTATIONS.indexOf(orientation);
    const cameraRotation = -quarterTurns * Math.PI / 2;
    expect(cameraRotation + avatarCounterRotation(orientation)).toBe(0);
  });

  it.each([
    [0, -1, 'north'],
    [0, 1, 'south'],
    [-1, 0, 'west'],
    [1, 0, 'east'],
  ] as const)('faces %s,%s movement toward screen-%s', (x, y, expected) => {
    expect(screenFacingDirection(x, y)).toBe(expected);
  });

  it('uses the existing vertical-facing rule for perfect diagonals', () => {
    expect(screenFacingDirection(-1, -1)).toBe('north');
    expect(screenFacingDirection(1, -1)).toBe('north');
    expect(screenFacingDirection(-1, 1)).toBe('south');
    expect(screenFacingDirection(1, 1)).toBe('south');
  });

  it('does not replace the retained facing direction while stationary', () => {
    expect(screenFacingDirection(0, 0)).toBeNull();
  });
});
