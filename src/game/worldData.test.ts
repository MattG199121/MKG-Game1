import { describe, expect, it } from 'vitest';
import { BUILDINGS, INTERACTIONS } from './worldData';

describe('Shepperton Village Hall map geometry', () => {
  const hall = BUILDINGS.find((building) => building.id === 'hall-building');
  const secondSpin = BUILDINGS.find((building) => building.id === 'second-building');
  const entrance = INTERACTIONS.find((interaction) => interaction.locationId === 'community');

  it('uses the approved north-south footprint behind the pavement', () => {
    expect(hall).toMatchObject({ name: 'Shepperton Village Hall', x: 520, y: 620, width: 150, height: 220 });
    expect(hall!.height).toBeGreaterThan(hall!.width);
    expect(hall!.x).toBeGreaterThanOrEqual(515);
  });

  it('places the interaction point outside the west-facing door', () => {
    expect(entrance?.point).toEqual({ x: 500, y: 730 });
    expect(entrance!.point.x).toBeLessThan(hall!.x);
    expect(entrance!.point.y).toBeGreaterThan(hall!.y);
    expect(entrance!.point.y).toBeLessThan(hall!.y + hall!.height);
  });

  it('keeps a clear gap from Second Spin', () => {
    expect(hall!.x + hall!.width).toBeLessThan(secondSpin!.x);
  });

  it('releases the old western collision area', () => {
    expect(hall!.x).toBeGreaterThan(410);
    expect(hall!.x).toBeGreaterThan(490);
  });
});
