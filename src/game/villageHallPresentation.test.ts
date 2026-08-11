import { describe, expect, it } from 'vitest';
import { BUILDINGS } from './worldData';
import {
  HALL_FOREGROUND_ABOVE_PLAYER_DEPTH,
  HALL_FOREGROUND_BELOW_PLAYER_DEPTH,
  villageHallForegroundDepth,
  villageHallPresentation,
} from './villageHallPresentation';

const hall = BUILDINGS.find((building) => building.id === 'hall-building')!;

describe('Village Hall orientation presentation', () => {
  it.each([
    ['north', 595, 840],
    ['east', 520, 730],
    ['south', 595, 620],
    ['west', 670, 730],
  ] as const)('anchors the %s artwork to the matching near edge of the protected footprint', (orientation, x, y) => {
    const presentation = villageHallPresentation(hall, orientation);
    expect(presentation.anchor).toEqual({ x, y });
    expect(presentation.baseTexture).toBe(`village-hall-${orientation}-base`);
    expect(presentation.foregroundTexture).toBe(`village-hall-${orientation}-foreground`);
  });

  it.each([
    ['north', { x: 595, y: 600 }, { x: 595, y: 880 }],
    ['east', { x: 700, y: 730 }, { x: 480, y: 730 }],
    ['south', { x: 595, y: 860 }, { x: 595, y: 580 }],
    ['west', { x: 480, y: 730 }, { x: 710, y: 730 }],
  ] as const)('puts the foreground above a player behind the Hall and below a player in front for %s-up', (orientation, behind, inFront) => {
    expect(villageHallForegroundDepth(behind, hall, orientation)).toBe(HALL_FOREGROUND_ABOVE_PLAYER_DEPTH);
    expect(villageHallForegroundDepth(inFront, hall, orientation)).toBe(HALL_FOREGROUND_BELOW_PLAYER_DEPTH);
  });
});
