export type ViewOrientation = 'north' | 'east' | 'south' | 'west';

export const VIEW_ORIENTATIONS: readonly ViewOrientation[] = ['north', 'east', 'south', 'west'];

export type ScreenFacing = 'north' | 'east' | 'south' | 'west';

export function avatarCounterRotation(orientation: ViewOrientation): number {
  return VIEW_ORIENTATIONS.indexOf(orientation) * Math.PI / 2;
}

export function screenFacingDirection(x: number, y: number): ScreenFacing | null {
  if (x === 0 && y === 0) return null;
  if (Math.abs(x) > Math.abs(y)) return x > 0 ? 'east' : 'west';
  return y > 0 ? 'south' : 'north';
}

export function screenToWorldDirection(x: number, y: number, orientation: ViewOrientation): { x: number; y: number } {
  let result = { x, y };
  if (orientation === 'east') result = { x: -y, y: x };
  if (orientation === 'south') result = { x: -x, y: -y };
  if (orientation === 'west') result = { x: y, y: -x };
  return { x: result.x || 0, y: result.y || 0 };
}
