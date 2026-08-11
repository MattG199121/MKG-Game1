import { ACTIVITIES, ITEMS, JOBS, OBJECTIVES, activityById, itemById, jobById, locationById } from './content';
import { HOME_POSITION } from './defaultState';
import { advanceClock, formatHours, isWithinHours } from './time';
import type { ActionResult, AttributeKey, GameState, Requirement } from './types';

type Listener = (state: GameState, reason: string) => void;

const roundMoney = (value: number) => Math.round(value * 100) / 100;
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export class GameEngine {
  private readonly listeners = new Set<Listener>();
  private busy = false;

  constructor(private state: GameState) {
    this.ensureSafePosition();
  }

  getState(): GameState {
    return this.state;
  }

  replaceState(state: GameState): void {
    this.state = state;
    this.ensureSafePosition();
    this.emit('loaded');
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(reason: string): void {
    this.listeners.forEach((listener) => listener(this.state, reason));
  }

  private transaction(reason: string, action: () => ActionResult): ActionResult {
    if (this.busy) return { ok: false, message: 'That action is already being processed.' };
    this.busy = true;
    try {
      const result = action();
      if (result.ok) {
        this.evaluateUnlocks();
        this.emit(reason);
      }
      return result;
    } finally {
      this.busy = false;
    }
  }

  private requirementMessage(requirement: Requirement): string | null {
    const player = this.state.player;
    if (requirement.attribute && requirement.minimum && player[requirement.attribute] < requirement.minimum) {
      return `${title(requirement.attribute)} ${requirement.minimum}`;
    }
    if (requirement.reputation && player.reputation < requirement.reputation) return `Reputation ${requirement.reputation}`;
    if (requirement.homeLevel && player.homeLevel < requirement.homeLevel) return `Home level ${requirement.homeLevel}`;
    if (requirement.unlockFlag && !this.state.unlockFlags.includes(requirement.unlockFlag)) return requirement.unlockFlag;
    return null;
  }

  unmetRequirements(requirements: Requirement[] = []): string[] {
    return requirements.map((requirement) => this.requirementMessage(requirement)).filter((message): message is string => Boolean(message));
  }

  isLocationOpen(locationId: string): boolean {
    const location = locationById(locationId);
    return !location?.hours || isWithinHours(this.state.time.minutes, location.hours);
  }

  locationStatus(locationId: string): ActionResult {
    const location = locationById(locationId);
    if (!location) return { ok: false, message: 'That place is not available.' };
    if (location.lockedRequirement) {
      const missing = this.unmetRequirements([location.lockedRequirement]);
      if (missing.length) return { ok: false, message: `Locked — requires ${missing.join(' and ')}.` };
    }
    if (location.hours && !this.isLocationOpen(locationId)) return { ok: false, message: `Closed now. Open ${formatHours(location.hours)}.` };
    return { ok: true, message: location.strapline };
  }

  visitLocation(locationId: string): ActionResult {
    const status = this.locationStatus(locationId);
    if (!status.ok) return status;
    this.progressObjective(`visited:${locationId}`);
    this.emit(`visited:${locationId}`);
    return status;
  }

  markLeftHome(): void {
    this.progressObjective('left-home');
  }

  updatePosition(x: number, y: number, safe = true): void {
    this.state.player.position = { x, y };
    if (safe) this.state.player.lastSafePosition = { x, y };
  }

  applyForJob(jobId: string): ActionResult {
    const job = jobById(jobId);
    if (!job) return { ok: false, message: 'That job no longer exists.' };
    const missing = this.unmetRequirements(job.requirements);
    if (missing.length) return { ok: false, message: `You still need ${missing.join(' and ')}.` };
    return this.transaction('job-changed', () => {
      this.state.player.currentJobId = job.id;
      return { ok: true, message: `You are now a ${job.name}. You can start a shift during working hours.` };
    });
  }

  work(jobId: string): ActionResult {
    const job = jobById(jobId);
    if (!job || this.state.player.currentJobId !== job.id) return { ok: false, message: 'Apply for this job before starting a shift.' };
    if (!isWithinHours(this.state.time.minutes, job.hours)) return { ok: false, message: `Shifts start between ${formatHours(job.hours)}.` };
    if (this.state.player.energy < job.energyCost) return { ok: false, message: `You need ${job.energyCost} energy for this shift.` };
    return this.transaction('worked', () => {
      this.state.player.cash = roundMoney(this.state.player.cash + job.pay);
      this.state.player.energy = clamp(this.state.player.energy - job.energyCost, 0, this.state.player.maxEnergy);
      this.state.player.reputation += 1;
      this.state.time = advanceClock(this.state.time, job.shiftMinutes);
      this.recordAction(`worked:${job.id}`);
      this.progressObjective('worked');
      this.handleExhaustion();
      return { ok: true, message: `Shift complete. You earned £${job.pay} and gained 1 reputation.`, saved: true };
    });
  }

  performActivity(activityId: string): ActionResult {
    const activity = activityById(activityId);
    if (!activity) return { ok: false, message: 'That activity is unavailable.' };
    const location = this.locationStatus(activity.locationId);
    if (!location.ok) return location;
    const missing = this.unmetRequirements(activity.requirements);
    if (missing.length) return { ok: false, message: `You still need ${missing.join(' and ')}.` };
    const trainingDiscount = activity.id === 'gym-session' && (this.state.inventory.bands ?? 0) > 0 ? 3 : 0;
    const moneyCost = Math.max(0, activity.moneyCost - trainingDiscount);
    if (this.state.player.cash < moneyCost) return { ok: false, message: `You need £${moneyCost} in cash.` };
    if (this.state.player.energy < activity.energyCost) return { ok: false, message: `You need ${activity.energyCost} energy.` };
    return this.transaction('activity-completed', () => {
      this.state.player.cash = roundMoney(this.state.player.cash - moneyCost);
      this.state.player.energy = clamp(this.state.player.energy - activity.energyCost, 0, this.state.player.maxEnergy);
      this.state.time = advanceClock(this.state.time, activity.timeCost);
      if (activity.attribute && activity.attributeGain) {
        const current = this.state.player[activity.attribute];
        this.state.player[activity.attribute] = clamp(current + activity.attributeGain, 1, 20);
        if (activity.attribute === 'strength') {
          this.state.player.maxHealth += 2;
          this.state.player.health = Math.min(this.state.player.maxHealth, this.state.player.health + 2);
        }
      }
      this.state.player.reputation += activity.reputationGain ?? 0;
      this.recordAction(activity.id);
      if (activity.id === 'gym-session' || activity.id === 'study-session') this.progressObjective('trained-or-studied');
      this.handleExhaustion();
      const discountMessage = trainingDiscount ? ' Your training bands saved £3.' : '';
      return { ok: true, message: `${activity.name} complete. ${activity.description}.${discountMessage}`, saved: true };
    });
  }

  purchaseItem(itemId: string, quantity = 1): ActionResult {
    const item = itemById(itemId);
    if (!item || !Number.isInteger(quantity) || quantity <= 0) return { ok: false, message: 'Choose a valid quantity.' };
    const owned = this.state.inventory[item.id] ?? 0;
    if (owned + quantity > item.stackLimit) return { ok: false, message: `You can carry no more than ${item.stackLimit}.` };
    const total = roundMoney(item.price * quantity);
    if (this.state.player.cash < total) return { ok: false, message: `You need £${total} in cash.` };
    return this.transaction('item-purchased', () => {
      this.state.player.cash = roundMoney(this.state.player.cash - total);
      this.state.inventory[item.id] = owned + quantity;
      this.recordAction(`bought:${item.id}`);
      if (item.category === 'food') this.progressObjective('bought-food');
      return { ok: true, message: `Bought ${quantity} × ${item.name} for £${total}.`, saved: true };
    });
  }

  useItem(itemId: string): ActionResult {
    const item = itemById(itemId);
    const owned = this.state.inventory[itemId] ?? 0;
    if (!item || owned <= 0) return { ok: false, message: 'You do not own that item.' };
    if (!item.consumable || !item.effect) return { ok: false, message: `${item.name} is a permanent item.` };
    return this.transaction('item-used', () => {
      this.state.inventory[itemId] = owned - 1;
      if (this.state.inventory[itemId] === 0) delete this.state.inventory[itemId];
      this.state.player.health = clamp(this.state.player.health + (item.effect?.health ?? 0), 0, this.state.player.maxHealth);
      this.state.player.energy = clamp(this.state.player.energy + (item.effect?.energy ?? 0), 0, this.state.player.maxEnergy);
      this.recordAction(`used:${item.id}`);
      return { ok: true, message: `Used ${item.name}. Health and energy stay within their safe limits.`, saved: true };
    });
  }

  bank(direction: 'deposit' | 'withdraw', amount: number): ActionResult {
    const rounded = roundMoney(amount);
    if (!Number.isFinite(amount) || rounded <= 0) return { ok: false, message: 'Enter an amount greater than £0.' };
    if (direction === 'deposit' && rounded > this.state.player.cash) return { ok: false, message: 'You do not have that much cash.' };
    if (direction === 'withdraw' && rounded > this.state.player.bankBalance) return { ok: false, message: 'Your bank balance is too low.' };
    return this.transaction('bank-transaction', () => {
      const sign = direction === 'deposit' ? 1 : -1;
      this.state.player.cash = roundMoney(this.state.player.cash - rounded * sign);
      this.state.player.bankBalance = roundMoney(this.state.player.bankBalance + rounded * sign);
      this.recordAction(`bank:${direction}`);
      return { ok: true, message: `${direction === 'deposit' ? 'Deposited' : 'Withdrew'} £${rounded.toFixed(2)}.`, saved: true };
    });
  }

  sleep(): ActionResult {
    return this.transaction('slept', () => {
      const nextDay = this.state.time.minutes < 8 * 60 ? 0 : 1;
      this.state.time = advanceClock(this.state.time, nextDay * 1440 + (8 * 60 - this.state.time.minutes));
      this.state.player.energy = this.state.player.maxEnergy;
      this.state.player.health = clamp(this.state.player.health + 15 + this.state.player.homeLevel * 5, 0, this.state.player.maxHealth);
      this.state.player.position = { ...HOME_POSITION };
      this.state.player.lastSafePosition = { ...HOME_POSITION };
      this.recordAction('slept');
      this.progressObjective('slept');
      return { ok: true, message: 'A new morning begins at 08:00. Energy restored.', saved: true };
    });
  }

  upgradeHome(): ActionResult {
    if (this.state.player.homeLevel >= 2) return { ok: false, message: 'The next home upgrade arrives in a later milestone.' };
    if (this.state.player.cash < 120 || this.state.player.reputation < 2) return { ok: false, message: 'You need £120 cash and Reputation 2.' };
    return this.transaction('home-upgraded', () => {
      this.state.player.cash -= 120;
      this.state.player.homeLevel = 2;
      this.state.player.maxEnergy += 10;
      this.state.player.energy = this.state.player.maxEnergy;
      this.state.unlockFlags.push('home-comfort');
      return { ok: true, message: 'Home upgraded. Your maximum energy increased by 10.', saved: true };
    });
  }

  manualSave(): ActionResult {
    this.emit('manual-save');
    return { ok: true, message: 'Game saved.', saved: true };
  }

  getAvailableJobs(locationId: string) {
    return JOBS.filter((job) => job.locationId === locationId);
  }

  getItemsAt(locationId: string) {
    return ITEMS.filter((item) => item.soldAt.includes(locationId));
  }

  getActivitiesAt(locationId: string) {
    return ACTIVITIES.filter((activity) => activity.locationId === locationId);
  }

  progressObjective(event: string): void {
    const active = OBJECTIVES[this.state.objectives.activeIndex];
    if (!active || active.event !== event) return;
    this.state.objectives.completedIds.push(active.id);
    this.state.objectives.activeIndex += 1;
    this.emit('objective-progressed');
  }

  private recordAction(id: string): void {
    this.state.completedActions[id] = (this.state.completedActions[id] ?? 0) + 1;
  }

  private evaluateUnlocks(): void {
    if (this.state.player.reputation >= 5 && !this.state.unlockFlags.includes('studio-access')) this.state.unlockFlags.push('studio-access');
  }

  private handleExhaustion(): void {
    if (this.state.player.energy > 0) return;
    this.state.player.energy = 25;
    this.state.player.health = clamp(this.state.player.health - 10, 1, this.state.player.maxHealth);
    this.state.time = advanceClock(this.state.time, 120);
    this.state.player.position = { ...HOME_POSITION };
    this.state.player.lastSafePosition = { ...HOME_POSITION };
  }

  private ensureSafePosition(): void {
    const position = this.state.player.position;
    if (!Number.isFinite(position.x) || !Number.isFinite(position.y) || position.x < 40 || position.x > 1560 || position.y < 40 || position.y > 960) {
      this.state.player.position = { ...this.state.player.lastSafePosition };
    }
    const safe = this.state.player.position;
    if (!Number.isFinite(safe.x) || !Number.isFinite(safe.y)) {
      this.state.player.position = { ...HOME_POSITION };
      this.state.player.lastSafePosition = { ...HOME_POSITION };
    }
  }
}

function title(value: AttributeKey): string {
  return value[0].toUpperCase() + value.slice(1);
}
