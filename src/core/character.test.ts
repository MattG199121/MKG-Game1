import { describe, expect, it } from 'vitest';
import { adjustAllocation, allocationIsComplete, createAllocation, cycleAvatar } from './character';

describe('avatar selection', () => {
  it('cycles through every avatar in both directions', () => {
    expect(cycleAvatar('harry', 1)).toBe('phil');
    expect(cycleAvatar('phil', 1)).toBe('matt');
    expect(cycleAvatar('matt', 1)).toBe('harry');
    expect(cycleAvatar('harry', -1)).toBe('matt');
  });
});

describe('character allocation', () => {
  it('starts each attribute at one with ten points remaining', () => {
    expect(createAllocation()).toEqual({ attributes: { strength: 1, intelligence: 1, charm: 1 }, remaining: 10 });
  });

  it('enforces the minimum, maximum and point budget', () => {
    let state = createAllocation();
    state = adjustAllocation(state, 'strength', -1);
    expect(state.attributes.strength).toBe(1);
    for (let index = 0; index < 10; index += 1) state = adjustAllocation(state, 'strength', 1);
    expect(state.attributes.strength).toBe(8);
    expect(state.remaining).toBe(3);
  });

  it('requires every point to be spent', () => {
    let state = createAllocation();
    for (let index = 0; index < 7; index += 1) state = adjustAllocation(state, 'strength', 1);
    for (let index = 0; index < 3; index += 1) state = adjustAllocation(state, 'intelligence', 1);
    expect(state.remaining).toBe(0);
    expect(allocationIsComplete(state)).toBe(true);
    expect(adjustAllocation(state, 'charm', 1)).toBe(state);
  });
});
