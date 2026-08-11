export type ViewOrientation = 'north' | 'east' | 'south' | 'west';

export const VIEW_ORIENTATIONS: readonly ViewOrientation[] = ['north', 'east', 'south', 'west'];

export function screenToWorldDirection(x: number, y: number, orientation: ViewOrientation): { x: number; y: number } {
  let result = { x, y };
  if (orientation === 'east') result = { x: -y, y: x };
  if (orientation === 'south') result = { x: -x, y: -y };
  if (orientation === 'west') result = { x: y, y: -x };
  return { x: result.x || 0, y: result.y || 0 };
}
