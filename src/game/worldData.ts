import type { Point } from '../core/types';

export const WORLD_WIDTH = 1600;
export const WORLD_HEIGHT = 1000;

export interface BuildingData {
  id: string;
  name: string;
  locationId?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  wall: number;
  roof: number;
  sign: number;
}

export interface InteractionData {
  locationId: string;
  point: Point;
}

export const BUILDINGS: BuildingData[] = [
  { id: 'station-building', name: 'Shepperton Station', locationId: 'station', x: 80, y: 110, width: 260, height: 105, wall: 0xe6d6b7, roof: 0x315b52, sign: 0xf4c95d },
  { id: 'cafe-building', name: 'The Wonky Teapot', locationId: 'cafe', x: 410, y: 245, width: 180, height: 145, wall: 0xf0cba8, roof: 0xa23e48, sign: 0xf7e7c6 },
  { id: 'shop-building', name: 'Village Basket', locationId: 'shop', x: 625, y: 245, width: 190, height: 145, wall: 0xd8e6c2, roof: 0x3f724d, sign: 0xf4c95d },
  { id: 'office-building', name: 'Thameside Services', locationId: 'office', x: 850, y: 210, width: 220, height: 180, wall: 0xc6d9e9, roof: 0x395d78, sign: 0xffffff },
  { id: 'bank-building', name: 'Elm & Crown Bank', locationId: 'bank', x: 1110, y: 235, width: 220, height: 155, wall: 0xe8dfc8, roof: 0x604f7a, sign: 0xf4c95d },
  { id: 'studio-building', name: 'Lockside Studio', locationId: 'studio', x: 1370, y: 115, width: 175, height: 190, wall: 0xf0c6d7, roof: 0x69445d, sign: 0xffffff },
  { id: 'hall-building', name: 'Shepperton Village Hall', locationId: 'community', x: 520, y: 620, width: 150, height: 220, wall: 0xf3ead5, roof: 0x465650, sign: 0xf7f1df },
  { id: 'second-building', name: 'Second Spin', locationId: 'secondhand', x: 700, y: 665, width: 180, height: 140, wall: 0xd9cbe8, roof: 0x694d84, sign: 0xffffff },
  { id: 'gym-building', name: 'Towpath Fitness', locationId: 'gym', x: 960, y: 640, width: 230, height: 165, wall: 0xc8d6d2, roof: 0x315b52, sign: 0xf4c95d },
  { id: 'library-building', name: 'Learning Room', locationId: 'library', x: 1260, y: 620, width: 250, height: 185, wall: 0xe5d4b6, roof: 0x5e4936, sign: 0xffffff },
  { id: 'home-building', name: 'Rosehip Court', locationId: 'home', x: 120, y: 700, width: 240, height: 160, wall: 0xe8c5b4, roof: 0x844a4a, sign: 0xffffff },
  { id: 'homes-a', name: 'Village Homes', x: 380, y: 40, width: 150, height: 90, wall: 0xdcc8aa, roof: 0x7b5547, sign: 0xffffff },
  { id: 'homes-b', name: 'Village Homes', x: 585, y: 40, width: 150, height: 90, wall: 0xd8c7b8, roof: 0x675a52, sign: 0xffffff },
  { id: 'homes-c', name: 'Village Homes', x: 1120, y: 50, width: 145, height: 95, wall: 0xe4c4aa, roof: 0x814a3d, sign: 0xffffff },
  { id: 'homes-d', name: 'Village Homes', x: 1290, y: 420, width: 205, height: 105, wall: 0xd9c7a6, roof: 0x765042, sign: 0xffffff },
];

export const INTERACTIONS: InteractionData[] = [
  { locationId: 'station', point: { x: 210, y: 235 } },
  { locationId: 'cafe', point: { x: 500, y: 410 } },
  { locationId: 'shop', point: { x: 720, y: 410 } },
  { locationId: 'office', point: { x: 960, y: 410 } },
  { locationId: 'bank', point: { x: 1220, y: 410 } },
  { locationId: 'studio', point: { x: 1350, y: 225 } },
  { locationId: 'community', point: { x: 500, y: 730 } },
  { locationId: 'secondhand', point: { x: 790, y: 825 } },
  { locationId: 'gym', point: { x: 1075, y: 825 } },
  { locationId: 'library', point: { x: 1385, y: 825 } },
  { locationId: 'home', point: { x: 240, y: 884 } },
  { locationId: 'green', point: { x: 210, y: 520 } },
];
