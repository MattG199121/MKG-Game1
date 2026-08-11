import type { CharacterDraft, GameState, SettingsState } from './types';

export const GAME_VERSION = '0.1.0';
export const HOME_POSITION = { x: 240, y: 884 };

export const DEFAULT_SETTINGS: SettingsState = {
  masterVolume: 0.8,
  musicVolume: 0.6,
  effectsVolume: 0.8,
  muted: false,
  reducedMotion: false,
};

export function createNewGame(draft: CharacterDraft): GameState {
  const strengthBonus = Math.max(0, draft.attributes.strength - 1) * 2;
  const backgroundBonuses = {
    local: { cash: 5, reputation: 1, energy: 0 },
    bookish: { cash: 0, reputation: 0, energy: 4 },
    sporty: { cash: 0, reputation: 0, energy: 8 },
    chatty: { cash: 0, reputation: 2, energy: 0 },
  }[draft.background];
  return {
    schemaVersion: 2,
    gameVersion: GAME_VERSION,
    savedAt: new Date().toISOString(),
    player: {
      name: draft.avatarId[0].toUpperCase() + draft.avatarId.slice(1),
      avatarId: draft.avatarId,
      background: draft.background,
      cash: 40 + backgroundBonuses.cash,
      bankBalance: 0,
      health: 100 + strengthBonus,
      maxHealth: 100 + strengthBonus,
      energy: 100,
      maxEnergy: 100 + backgroundBonuses.energy,
      strength: draft.attributes.strength,
      intelligence: draft.attributes.intelligence,
      charm: draft.attributes.charm,
      reputation: backgroundBonuses.reputation,
      homeLevel: 1,
      currentJobId: null,
      position: { ...HOME_POSITION },
      lastSafePosition: { ...HOME_POSITION },
    },
    time: { dayNumber: 1, weekdayIndex: 0, minutes: 8 * 60 },
    inventory: {},
    completedActions: {},
    unlockFlags: [],
    objectives: { activeIndex: 0, completedIds: [] },
    settings: { ...DEFAULT_SETTINGS },
  };
}
