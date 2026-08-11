import { describe, expect, it } from 'vitest';
import { createNewGame } from './defaultState';
import { BACKUP_KEY, SAVE_KEY, SaveManager, type StorageLike, validateSave } from './saveManager';

class MemoryStorage implements StorageLike {
  readonly values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
  removeItem(key: string) { this.values.delete(key); }
}

const fresh = () => createNewGame({
  name: 'Sam',
  appearance: { body: 'average', skinTone: '#d8a47f', topColour: '#286f78', legColour: '#26364a', head: 'short' },
  background: 'local',
  attributes: { strength: 3, intelligence: 4, charm: 6 },
});

describe('save manager', () => {
  it('round-trips a valid save', () => {
    const storage = new MemoryStorage();
    const manager = new SaveManager(storage);
    manager.save(fresh());
    expect(manager.load().state?.player.name).toBe('Sam');
    expect(validateSave(manager.load().state)).toBe(true);
  });

  it('migrates a simulated version-one save', () => {
    const storage = new MemoryStorage();
    storage.setItem(SAVE_KEY, JSON.stringify({ schemaVersion: 1, timeHours: 13.5, dayNumber: 3, player: { name: 'Old Sam', cash: 9, strength: 2, intelligence: 3, charm: 4 } }));
    const result = new SaveManager(storage).load();
    expect(result.state?.schemaVersion).toBe(2);
    expect(result.state?.time.minutes).toBe(810);
    expect(result.recovered).toBe(true);
  });

  it('recovers a valid backup when the primary save is corrupt', () => {
    const storage = new MemoryStorage();
    storage.setItem(SAVE_KEY, '{broken');
    storage.setItem(BACKUP_KEY, JSON.stringify(fresh()));
    const result = new SaveManager(storage).load();
    expect(result.state?.player.name).toBe('Sam');
    expect(result.recovered).toBe(true);
  });

  it('offers a safe reset for unrecoverable data', () => {
    const storage = new MemoryStorage();
    storage.setItem(SAVE_KEY, '{broken');
    const manager = new SaveManager(storage);
    expect(manager.load().state).toBeNull();
    manager.reset();
    expect(storage.getItem(SAVE_KEY)).toBeNull();
  });
});
