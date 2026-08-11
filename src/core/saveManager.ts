import { DEFAULT_SETTINGS, GAME_VERSION, HOME_POSITION } from './defaultState';
import type { AvatarId, GameState } from './types';

export const SAVE_KEY = 'shepperton-life-rpg.save.v2';
export const BACKUP_KEY = 'shepperton-life-rpg.save.backup';

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface LoadResult {
  state: GameState | null;
  recovered: boolean;
  message?: string;
}

const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
const record = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const avatarId = (value: unknown): value is AvatarId => value === 'harry' || value === 'phil' || value === 'matt';

export function validateSave(value: unknown): value is GameState {
  if (!record(value) || value.schemaVersion !== 2 || !record(value.player) || !record(value.time)) return false;
  const player = value.player;
  const time = value.time;
  return (
    typeof value.gameVersion === 'string' &&
    typeof value.savedAt === 'string' &&
    typeof player.name === 'string' &&
    player.name.length > 0 &&
    avatarId(player.avatarId) &&
    finite(player.cash) && player.cash >= 0 &&
    finite(player.bankBalance) && player.bankBalance >= 0 &&
    finite(player.health) && finite(player.maxHealth) && player.health >= 0 && player.health <= player.maxHealth &&
    finite(player.energy) && finite(player.maxEnergy) && player.energy >= 0 && player.energy <= player.maxEnergy &&
    finite(player.strength) && finite(player.intelligence) && finite(player.charm) && finite(player.reputation) &&
    record(player.position) && finite(player.position.x) && finite(player.position.y) &&
    record(player.lastSafePosition) && finite(player.lastSafePosition.x) && finite(player.lastSafePosition.y) &&
    finite(time.dayNumber) && time.dayNumber >= 1 && finite(time.weekdayIndex) && finite(time.minutes) &&
    record(value.inventory) && record(value.completedActions) && Array.isArray(value.unlockFlags) &&
    record(value.objectives) && record(value.settings)
  );
}

export function migrateSave(value: unknown): GameState | null {
  if (validateSave(value)) return value;
  if (record(value) && value.schemaVersion === 2 && record(value.player)) {
    const migrated = structuredClone(value) as unknown as GameState;
    migrated.player.avatarId = 'matt';
    migrated.player.name = 'Matt';
    if (validateSave(migrated)) return migrated;
  }
  if (!record(value) || value.schemaVersion !== 1 || !record(value.player)) return null;
  const oldPlayer = value.player;
  if (typeof oldPlayer.name !== 'string') return null;
  const strength = finite(oldPlayer.strength) ? oldPlayer.strength : 1;
  const maxHealth = 100 + Math.max(0, strength - 1) * 2;
  const timeHours = finite(value.timeHours) ? value.timeHours : 8;
  const migrated: GameState = {
    schemaVersion: 2,
    gameVersion: GAME_VERSION,
    savedAt: new Date().toISOString(),
    player: {
      name: 'Matt',
      avatarId: 'matt',
      background: 'local',
      cash: finite(oldPlayer.cash) ? Math.max(0, oldPlayer.cash) : 40,
      bankBalance: finite(oldPlayer.bankBalance) ? Math.max(0, oldPlayer.bankBalance) : 0,
      health: finite(oldPlayer.health) ? Math.min(maxHealth, Math.max(0, oldPlayer.health)) : maxHealth,
      maxHealth,
      energy: finite(oldPlayer.energy) ? Math.min(100, Math.max(0, oldPlayer.energy)) : 100,
      maxEnergy: 100,
      strength,
      intelligence: finite(oldPlayer.intelligence) ? oldPlayer.intelligence : 1,
      charm: finite(oldPlayer.charm) ? oldPlayer.charm : 1,
      reputation: finite(oldPlayer.reputation) ? oldPlayer.reputation : 0,
      homeLevel: 1,
      currentJobId: null,
      position: { ...HOME_POSITION },
      lastSafePosition: { ...HOME_POSITION },
    },
    time: {
      dayNumber: finite(value.dayNumber) ? Math.max(1, Math.floor(value.dayNumber)) : 1,
      weekdayIndex: 0,
      minutes: Math.round(timeHours * 60) % 1440,
    },
    inventory: {},
    completedActions: {},
    unlockFlags: [],
    objectives: { activeIndex: 0, completedIds: [] },
    settings: { ...DEFAULT_SETTINGS },
  };
  return validateSave(migrated) ? migrated : null;
}

export class SaveManager {
  constructor(private readonly storage: StorageLike) {}

  hasSave(): boolean {
    return this.storage.getItem(SAVE_KEY) !== null;
  }

  load(): LoadResult {
    const primary = this.storage.getItem(SAVE_KEY);
    if (!primary) return { state: null, recovered: false };
    try {
      const state = migrateSave(JSON.parse(primary));
      if (state) return { state, recovered: state.schemaVersion === 2 && !validateSave(JSON.parse(primary)), message: 'Your save was updated safely.' };
    } catch {
      // Try the last known valid backup below.
    }
    const backup = this.storage.getItem(BACKUP_KEY);
    if (backup) {
      try {
        const state = migrateSave(JSON.parse(backup));
        if (state) return { state, recovered: true, message: 'The latest save was damaged, so the previous valid save was restored.' };
      } catch {
        // Return a friendly recovery result below.
      }
    }
    return { state: null, recovered: true, message: 'The save could not be read. Start a new game or reset the damaged save.' };
  }

  save(state: GameState): void {
    if (!validateSave(state)) throw new Error('Refused to store invalid game state.');
    const current = this.storage.getItem(SAVE_KEY);
    if (current) {
      try {
        if (migrateSave(JSON.parse(current))) this.storage.setItem(BACKUP_KEY, current);
      } catch {
        // Never replace a valid backup with corrupt data.
      }
    }
    state.savedAt = new Date().toISOString();
    this.storage.setItem(SAVE_KEY, JSON.stringify(state));
  }

  reset(): void {
    this.storage.removeItem(SAVE_KEY);
    this.storage.removeItem(BACKUP_KEY);
  }
}
