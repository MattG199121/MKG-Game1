import { beforeEach, describe, expect, it } from 'vitest';
import { createNewGame } from './defaultState';
import { GameEngine } from './gameEngine';

const state = () => createNewGame({
  avatarId: 'harry',
  background: 'local',
  attributes: { strength: 4, intelligence: 4, charm: 5 },
});

describe('game transactions', () => {
  let engine: GameEngine;

  beforeEach(() => {
    engine = new GameEngine(state());
  });

  it('applies job requirements and grants shift pay once', () => {
    expect(engine.applyForJob('cafe-assistant').ok).toBe(true);
    const before = engine.getState().player.cash;
    expect(engine.work('cafe-assistant').ok).toBe(true);
    expect(engine.getState().player.cash).toBe(before + 36);
    expect(engine.getState().completedActions['worked:cafe-assistant']).toBe(1);
  });

  it('blocks jobs when requirements are not met', () => {
    engine.getState().player.reputation = 0;
    expect(engine.applyForJob('cafe-lead')).toEqual({ ok: false, message: 'You still need Reputation 4.' });
  });

  it('validates purchases and removes a consumed item exactly once', () => {
    expect(engine.purchaseItem('toastie', -1).ok).toBe(false);
    expect(engine.purchaseItem('toastie').ok).toBe(true);
    expect(engine.getState().inventory.toastie).toBe(1);
    engine.getState().player.energy = 30;
    expect(engine.useItem('toastie').ok).toBe(true);
    expect(engine.getState().inventory.toastie).toBeUndefined();
    expect(engine.useItem('toastie').ok).toBe(false);
  });

  it('prevents negative and over-limit bank transactions', () => {
    expect(engine.bank('deposit', -10).ok).toBe(false);
    expect(engine.bank('deposit', 999).ok).toBe(false);
    expect(engine.bank('deposit', 20).ok).toBe(true);
    expect(engine.getState().player.cash).toBe(25);
    expect(engine.getState().player.bankBalance).toBe(20);
    expect(engine.bank('withdraw', 21).ok).toBe(false);
  });

  it('clamps health and energy when using items', () => {
    engine.purchaseItem('fruit-box');
    engine.getState().player.health = engine.getState().player.maxHealth - 1;
    engine.getState().player.energy = 99;
    engine.useItem('fruit-box');
    expect(engine.getState().player.health).toBe(engine.getState().player.maxHealth);
    expect(engine.getState().player.energy).toBe(engine.getState().player.maxEnergy);
  });

  it('changes attributes, time and objectives through activities', () => {
    const before = engine.getState().player.strength;
    expect(engine.performActivity('gym-session').ok).toBe(true);
    expect(engine.getState().player.strength).toBe(before + 1);
    expect(engine.getState().time.minutes).toBe(9 * 60);
  });

  it('honours location opening hours', () => {
    engine.getState().time.minutes = 22 * 60;
    expect(engine.locationStatus('cafe').ok).toBe(false);
    expect(engine.locationStatus('green').ok).toBe(true);
  });

  it('progresses the first objectives in order', () => {
    engine.markLeftHome();
    expect(engine.getState().objectives.activeIndex).toBe(1);
    engine.visitLocation('shop');
    expect(engine.getState().objectives.activeIndex).toBe(1);
    engine.visitLocation('cafe');
    expect(engine.getState().objectives.activeIndex).toBe(2);
  });

  it('sleep begins the next morning and restores energy', () => {
    engine.getState().time.minutes = 20 * 60;
    engine.getState().player.energy = 5;
    expect(engine.sleep().ok).toBe(true);
    expect(engine.getState().time).toEqual({ dayNumber: 2, weekdayIndex: 1, minutes: 8 * 60 });
    expect(engine.getState().player.energy).toBe(engine.getState().player.maxEnergy);
  });
});
