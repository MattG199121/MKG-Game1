import type { BuildingData } from './worldData';
import type { ViewOrientation } from './viewRotation';

export const HALL_BASE_DEPTH = 10;
export const HALL_FOREGROUND_BELOW_PLAYER_DEPTH = 40;
export const HALL_FOREGROUND_ABOVE_PLAYER_DEPTH = 60;

export interface HallPresentation {
  anchor: { x: number; y: number };
  baseTexture: string;
  foregroundTexture: string;
  rotation: number;
}

export function villageHallPresentation(building: BuildingData, orientation: ViewOrientation): HallPresentation {
  const centreX = building.x + building.width / 2;
  const centreY = building.y + building.height / 2;
  const anchorByOrientation: Record<ViewOrientation, { x: number; y: number }> = {
    north: { x: centreX, y: building.y + building.height },
    east: { x: building.x, y: centreY },
    south: { x: centreX, y: building.y },
    west: { x: building.x + building.width, y: centreY },
  };

  return {
    anchor: anchorByOrientation[orientation],
    baseTexture: `village-hall-${orientation}-base`,
    foregroundTexture: `village-hall-${orientation}-foreground`,
    rotation: ['north', 'east', 'south', 'west'].indexOf(orientation) * Math.PI / 2,
  };
}

export function villageHallForegroundDepth(
  player: { x: number; y: number },
  building: BuildingData,
  orientation: ViewOrientation,
): number {
  const { anchor } = villageHallPresentation(building, orientation);
  const screenYFromAnchor: Record<ViewOrientation, number> = {
    north: player.y - anchor.y,
    east: -(player.x - anchor.x),
    south: -(player.y - anchor.y),
    west: player.x - anchor.x,
  };
  return screenYFromAnchor[orientation] < 0 ? HALL_FOREGROUND_ABOVE_PLAYER_DEPTH : HALL_FOREGROUND_BELOW_PLAYER_DEPTH;
}
