export type AttributeKey = 'strength' | 'intelligence' | 'charm';
export type Weekday = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';

export interface Point {
  x: number;
  y: number;
}

export type AvatarId = 'harry' | 'phil' | 'matt';

export interface CharacterDraft {
  avatarId: AvatarId;
  background: 'local' | 'bookish' | 'sporty' | 'chatty';
  attributes: Record<AttributeKey, number>;
}

export interface PlayerState {
  name: string;
  avatarId: AvatarId;
  background: CharacterDraft['background'];
  cash: number;
  bankBalance: number;
  health: number;
  maxHealth: number;
  energy: number;
  maxEnergy: number;
  strength: number;
  intelligence: number;
  charm: number;
  reputation: number;
  homeLevel: number;
  currentJobId: string | null;
  position: Point;
  lastSafePosition: Point;
}

export interface SettingsState {
  masterVolume: number;
  musicVolume: number;
  effectsVolume: number;
  muted: boolean;
  reducedMotion: boolean;
}

export interface GameState {
  schemaVersion: 2;
  gameVersion: string;
  savedAt: string;
  player: PlayerState;
  time: {
    dayNumber: number;
    weekdayIndex: number;
    minutes: number;
  };
  inventory: Record<string, number>;
  completedActions: Record<string, number>;
  unlockFlags: string[];
  objectives: {
    activeIndex: number;
    completedIds: string[];
  };
  settings: SettingsState;
}

export interface Requirement {
  attribute?: AttributeKey;
  minimum?: number;
  reputation?: number;
  homeLevel?: number;
  unlockFlag?: string;
}

export interface Hours {
  open: number;
  close: number;
}

export interface JobDefinition {
  id: string;
  name: string;
  locationId: string;
  description: string;
  requirements: Requirement[];
  hours: Hours;
  shiftMinutes: number;
  pay: number;
  energyCost: number;
  nextJobId?: string;
}

export interface ItemDefinition {
  id: string;
  name: string;
  category: 'food' | 'drink' | 'training' | 'home';
  description: string;
  price: number;
  resalePrice?: number;
  stackLimit: number;
  consumable: boolean;
  soldAt: string[];
  effect?: Partial<Record<'health' | 'energy', number>>;
}

export interface ActivityDefinition {
  id: string;
  name: string;
  locationId: string;
  description: string;
  moneyCost: number;
  energyCost: number;
  timeCost: number;
  attribute?: AttributeKey;
  attributeGain?: number;
  reputationGain?: number;
  requirements?: Requirement[];
}

export interface LocationDefinition {
  id: string;
  name: string;
  strapline: string;
  hours?: Hours;
  kind: 'home' | 'work' | 'shop' | 'training' | 'bank' | 'travel' | 'social' | 'locked';
  lockedRequirement?: Requirement;
}

export interface ObjectiveDefinition {
  id: string;
  title: string;
  description: string;
  event: string;
}

export interface ActionResult {
  ok: boolean;
  message: string;
  saved?: boolean;
}
