import type { AttributeKey, AvatarId } from './types';

export const AVATARS: readonly AvatarId[] = ['harry', 'phil', 'matt'];

export function cycleAvatar(current: AvatarId, delta: -1 | 1): AvatarId {
  const index = AVATARS.indexOf(current);
  return AVATARS[(index + delta + AVATARS.length) % AVATARS.length];
}

export const STARTING_ATTRIBUTE = 1;
export const BONUS_POINTS = 10;
export const STARTING_ATTRIBUTE_MAX = 8;

export interface AllocationState {
  attributes: Record<AttributeKey, number>;
  remaining: number;
}

export function createAllocation(): AllocationState {
  return {
    attributes: { strength: 1, intelligence: 1, charm: 1 },
    remaining: BONUS_POINTS,
  };
}

export function adjustAllocation(state: AllocationState, key: AttributeKey, delta: -1 | 1): AllocationState {
  const current = state.attributes[key];
  if (delta === 1 && (state.remaining === 0 || current >= STARTING_ATTRIBUTE_MAX)) return state;
  if (delta === -1 && current <= STARTING_ATTRIBUTE) return state;
  return {
    attributes: { ...state.attributes, [key]: current + delta },
    remaining: state.remaining - delta,
  };
}

export function allocationIsComplete(state: AllocationState): boolean {
  return state.remaining === 0;
}
