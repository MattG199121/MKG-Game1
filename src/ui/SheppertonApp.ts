import { ACTIVITIES, ITEMS, JOBS, LOCATIONS, OBJECTIVES, itemById, jobById, locationById } from '../core/content';
import { adjustAllocation, allocationIsComplete, createAllocation, cycleAvatar, type AllocationState } from '../core/character';
import { createNewGame, DEFAULT_SETTINGS } from '../core/defaultState';
import { GameEngine } from '../core/gameEngine';
import { SaveManager } from '../core/saveManager';
import { formatHours, formatTime, WEEKDAYS } from '../core/time';
import type { ActionResult, AttributeKey, CharacterDraft, GameState, SettingsState } from '../core/types';
import { locationPrompt, WorldView } from '../game/WorldScene';
import type { ViewOrientation } from '../game/viewRotation';

const SETTINGS_KEY = 'shepperton-life-rpg.settings';

const html = (value: unknown): string => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

const money = (value: number): string => `£${value.toFixed(2).replace('.00', '')}`;

export class SheppertonApp {
  private readonly saves = new SaveManager(window.localStorage);
  private engine: GameEngine | null = null;
  private world: WorldView | null = null;
  private allocation: AllocationState = createAllocation();
  private draft: CharacterDraft = {
    avatarId: 'matt',
    background: 'local',
    attributes: { strength: 1, intelligence: 1, charm: 1 },
  };
  private settings: SettingsState = this.readSettings();
  private saveTimer: number | null = null;
  private lastSaveLabel = 'Not saved yet';

  constructor(private readonly root: HTMLElement) {
    this.renderTitle();
    window.addEventListener('pagehide', () => this.persistCurrent());
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.world?.scene.pauseWorld();
        this.persistCurrent();
      } else if (!document.querySelector('.modal-layer')) {
        this.world?.scene.resumeWorld();
      }
    });
  }

  private renderTitle(message = ''): void {
    this.destroyWorld();
    const load = this.saves.load();
    const hasSave = Boolean(load.state);
    const notice = message || load.message || '';
    this.root.innerHTML = `
      <main class="title-screen screen-pad">
        <div class="village-silhouette" aria-hidden="true">
          <span class="house h1"></span><span class="house h2"></span><span class="tree t1"></span><span class="house h3"></span><span class="tree t2"></span>
        </div>
        <section class="title-card">
          <div class="brand-stamp">SL</div>
          <p class="eyebrow">A small village. A whole new life.</p>
          <h1>Shepperton<br><em>Life RPG</em></h1>
          <p class="lead">Work, learn, train and make your mark in a light-hearted Surrey village adventure.</p>
          ${notice ? `<div class="notice ${load.recovered ? 'warning' : ''}">${html(notice)}</div>` : ''}
          <div class="title-actions">
            <button class="button primary large" data-title="new">New Game <span>Start fresh</span></button>
            <button class="button secondary large" data-title="continue" ${hasSave ? '' : 'disabled'}>Continue <span>${hasSave ? `Saved ${this.relativeDate(load.state?.savedAt ?? '')}` : 'No saved game yet'}</span></button>
          </div>
          <div class="small-actions">
            <button class="text-button" data-title="settings">Settings</button>
            <button class="text-button" data-title="credits">Credits</button>
            <button class="text-button danger-text" data-title="reset" ${this.saves.hasSave() ? '' : 'disabled'}>Reset Save</button>
          </div>
          <p class="version">Milestone 1 · v0.1.0 · Local save</p>
        </section>
      </main>`;
    this.root.querySelectorAll<HTMLButtonElement>('[data-title]').forEach((button) => {
      button.addEventListener('click', () => this.handleTitleAction(button.dataset.title ?? ''));
    });
  }

  private handleTitleAction(action: string): void {
    if (action === 'new') this.renderCharacterCreation();
    if (action === 'continue') {
      const result = this.saves.load();
      if (result.state) this.startGame(result.state, result.message);
      else this.renderTitle(result.message ?? 'No valid save was found.');
    }
    if (action === 'settings') this.openSettings();
    if (action === 'credits') this.openCredits();
    if (action === 'reset') this.confirmReset();
  }

  private renderCharacterCreation(): void {
    this.draft.attributes = { ...this.allocation.attributes };
    const stats: { key: AttributeKey; name: string; explanation: string }[] = [
      { key: 'strength', name: 'Strength', explanation: 'More health, physical work and faster gym progress.' },
      { key: 'intelligence', name: 'Intelligence', explanation: 'Study, qualifications and better office work.' },
      { key: 'charm', name: 'Charm', explanation: 'Social opportunities, customers and reputation.' },
    ];
    this.root.innerHTML = `
      <main class="creation-screen screen-pad">
        <header class="creation-header">
          <button class="round-button" data-create="back" aria-label="Back">←</button>
          <div><p class="eyebrow">New Game</p><h1>Create your Shepperton local</h1></div>
          <div class="points-pill"><strong>${this.allocation.remaining}</strong><span>points left</span></div>
        </header>
        <div class="creation-grid">
          <section class="preview-panel">
            <div class="avatar-picker">
              <button data-avatar-direction="-1" aria-label="Previous avatar">←</button>
              <img src="${import.meta.env.BASE_URL}avatars/${this.draft.avatarId}-preview.png" alt="${html(this.avatarName())}" width="36" height="54" />
              <button data-avatar-direction="1" aria-label="Next avatar">→</button>
              <strong>${html(this.avatarName())}</strong>
            </div>
            <p>Choose your character with the arrows.</p>
          </section>
          <section class="form-panel">
            <div class="selected-avatar-name"><span>Your character</span><strong>${html(this.avatarName())}</strong></div>
            <label class="field-label" for="background">Starting background</label>
            <select id="background" class="input" data-appearance="background">
              <option value="local" ${this.draft.background === 'local' ? 'selected' : ''}>Village Regular — £5 and +1 reputation</option>
              <option value="bookish" ${this.draft.background === 'bookish' ? 'selected' : ''}>Quiet Reader — +4 maximum energy</option>
              <option value="sporty" ${this.draft.background === 'sporty' ? 'selected' : ''}>Weekend Athlete — +8 maximum energy</option>
              <option value="chatty" ${this.draft.background === 'chatty' ? 'selected' : ''}>Friendly Face — +2 reputation</option>
            </select>
            <div class="allocation-card">
              <div class="allocation-title"><div><h2>Starting attributes</h2><p>Spend all 10 points. No dice and no hidden rerolls.</p></div><button class="text-button" data-create="reset">Reset</button></div>
              ${stats.map((stat) => `
                <div class="stat-row">
                  <div><strong>${stat.name}</strong><small>${stat.explanation}</small></div>
                  <div class="stepper">
                    <button data-stat="${stat.key}" data-delta="-1" aria-label="Reduce ${stat.name}">−</button>
                    <output>${this.allocation.attributes[stat.key]}</output>
                    <button data-stat="${stat.key}" data-delta="1" aria-label="Increase ${stat.name}">+</button>
                  </div>
                </div>`).join('')}
            </div>
            <p id="create-error" class="form-error" role="alert"></p>
            <button class="button primary full" data-create="confirm" ${allocationIsComplete(this.allocation) ? '' : 'disabled'}>Begin life in Shepperton</button>
          </section>
        </div>
      </main>`;
    this.bindCreationEvents();
  }

  private bindCreationEvents(): void {
    this.root.querySelectorAll<HTMLButtonElement>('[data-avatar-direction]').forEach((button) => {
      button.addEventListener('click', () => {
        this.draft.avatarId = cycleAvatar(this.draft.avatarId, Number(button.dataset.avatarDirection) as -1 | 1);
        this.renderCharacterCreation();
      });
    });
    this.root.querySelectorAll<HTMLSelectElement | HTMLInputElement>('[data-appearance]').forEach((control) => {
      control.addEventListener('change', () => {
        const key = control.dataset.appearance;
        if (key === 'background') this.draft.background = control.value as CharacterDraft['background'];
        this.renderCharacterCreation();
      });
    });
    this.root.querySelectorAll<HTMLButtonElement>('[data-stat]').forEach((button) => {
      button.addEventListener('click', () => {
        this.allocation = adjustAllocation(this.allocation, button.dataset.stat as AttributeKey, Number(button.dataset.delta) as -1 | 1);
        this.renderCharacterCreation();
      });
    });
    this.root.querySelectorAll<HTMLButtonElement>('[data-create]').forEach((button) => {
      button.addEventListener('click', () => {
        const action = button.dataset.create;
        if (action === 'back') this.renderTitle();
        if (action === 'reset') {
          this.allocation = createAllocation();
          this.renderCharacterCreation();
        }
        if (action === 'confirm') this.confirmCharacter();
      });
    });
  }

  private confirmCharacter(): void {
    const error = this.root.querySelector<HTMLElement>('#create-error');
    if (!allocationIsComplete(this.allocation)) {
      if (error) error.textContent = `Spend the remaining ${this.allocation.remaining} points.`;
      return;
    }
    this.draft.attributes = { ...this.allocation.attributes };
    const state = createNewGame(this.draft);
    state.settings = { ...this.settings };
    this.saves.save(state);
    this.startGame(state, 'New game saved. Welcome to Shepperton!');
  }

  private startGame(state: GameState, message = ''): void {
    this.destroyWorld();
    this.engine = new GameEngine(state);
    this.settings = state.settings;
    this.root.innerHTML = this.gameShell();
    const host = this.root.querySelector<HTMLElement>('#world-host');
    if (!host) throw new Error('World host was not created.');
    this.world = new WorldView(host, this.engine, {
      onNearbyLocation: (id) => this.updateInteraction(id),
      onInteract: (id) => this.openLocation(id),
      onLeftHome: () => {
        this.engine?.markLeftHome();
        this.updateHud();
      },
      onViewOrientationChanged: (orientation) => this.updateViewOrientation(orientation),
    });
    this.engine.subscribe((gameState, reason) => {
      if (reason !== 'loaded') {
        this.saves.save(gameState);
        this.lastSaveLabel = formatTime(new Date().getHours() * 60 + new Date().getMinutes());
      }
      this.updateHud();
    });
    this.bindGameControls();
    this.updateHud();
    if (message) this.toast(message, 'success');
    this.saveTimer = window.setInterval(() => this.persistCurrent(), 15000);
  }

  private gameShell(): string {
    return `
      <main class="game-screen">
        <div id="world-host" class="world-host" aria-label="Top-down Shepperton game world"></div>
        <header class="hud">
          <div class="hud-card identity"><div class="avatar-dot"></div><div><strong id="hud-name">Player</strong><span id="hud-job">Unemployed</span></div></div>
          <div class="hud-card resources">
            <div><span>Cash</span><strong id="hud-cash">£0</strong></div>
            <div><span>Bank</span><strong id="hud-bank">£0</strong></div>
            <div><span>Day</span><strong id="hud-day">Monday 1</strong></div>
            <div><span>Time</span><strong id="hud-time">08:00</strong></div>
          </div>
          <button class="view-rotate" data-game="rotate-view" aria-label="Rotate view. North is currently at the top" title="Rotate view"><span>◆</span><b data-view-orientation>N</b></button>
          <button class="hud-menu" data-game="menu" aria-label="Open game menu">☰</button>
        </header>
        <aside class="needs-card">
          <div><span>Health</span><div class="meter"><i id="health-meter"></i></div><b id="health-text">100</b></div>
          <div><span>Energy</span><div class="meter energy"><i id="energy-meter"></i></div><b id="energy-text">100</b></div>
        </aside>
        <section class="objective-card" data-game="objectives" role="button" tabindex="0">
          <span>Current objective</span><strong id="objective-title">Explore</strong><p id="objective-text"></p>
        </section>
        <div id="interaction-prompt" class="interaction-prompt hidden"><span>E</span><b>Enter</b></div>
        <div class="touch-controls" aria-label="Touch movement controls">
          <div class="dpad">
            <button class="up" data-direction="up" aria-label="Move up">▲</button>
            <button class="left" data-direction="left" aria-label="Move left">◀</button>
            <button class="right" data-direction="right" aria-label="Move right">▶</button>
            <button class="down" data-direction="down" aria-label="Move down">▼</button>
          </div>
          <button class="interact-button" data-game="interact" disabled><span>↵</span>Interact</button>
        </div>
        <nav class="quick-nav" aria-label="Game panels">
          <button data-game="inventory">🎒<span>Bag</span></button>
          <button data-game="stats">★<span>Stats</span></button>
          <button data-game="objectives">✓<span>Goals</span></button>
        </nav>
        <div class="rotate-hint"><div>↻</div><strong>Turn your iPad sideways</strong><span>Landscape gives you the best view of Shepperton.</span></div>
      </main>
      <div id="toast-region" class="toast-region" aria-live="assertive"></div>`;
  }

  private bindGameControls(): void {
    const setDirection = (button: HTMLButtonElement, active: boolean) => {
      const direction = button.dataset.direction as keyof WorldView['scene']['touch'];
      if (this.world && direction) this.world.scene.touch[direction] = active;
      button.classList.toggle('pressed', active);
    };
    this.root.querySelectorAll<HTMLButtonElement>('[data-direction]').forEach((button) => {
      button.addEventListener('pointerdown', (event) => {
        event.preventDefault();
        button.setPointerCapture(event.pointerId);
        setDirection(button, true);
      });
      ['pointerup', 'pointercancel', 'lostpointercapture'].forEach((eventName) => button.addEventListener(eventName, () => setDirection(button, false)));
    });
    this.root.querySelectorAll<HTMLElement>('[data-game]').forEach((control) => {
      control.addEventListener('click', () => this.handleGameControl(control.dataset.game ?? ''));
      control.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') this.handleGameControl(control.dataset.game ?? '');
      });
    });
    document.addEventListener('keydown', this.escapeHandler);
  }

  private readonly escapeHandler = (event: KeyboardEvent): void => {
    if (event.key !== 'Escape' || !this.engine) return;
    const modal = this.root.querySelector<HTMLElement>('.modal-layer');
    if (modal) this.closeModal();
    else this.openGameMenu();
  };

  private handleGameControl(action: string): void {
    if (action === 'rotate-view') {
      this.world?.scene.rotateView();
      return;
    }
    if (action === 'interact') this.world?.scene.interact();
    if (action === 'inventory') this.openInventory();
    if (action === 'stats') this.openStats();
    if (action === 'objectives') this.openObjectives();
    if (action === 'menu') this.openGameMenu();
  }

  private updateViewOrientation(orientation: ViewOrientation): void {
    const labels: Record<ViewOrientation, string> = { north: 'N', east: 'E', south: 'S', west: 'W' };
    const names: Record<ViewOrientation, string> = { north: 'North', east: 'East', south: 'South', west: 'West' };
    const indicator = this.root.querySelector<HTMLElement>('[data-view-orientation]');
    const button = indicator?.closest<HTMLButtonElement>('.view-rotate');
    if (indicator) indicator.textContent = labels[orientation];
    if (button) button.setAttribute('aria-label', `Rotate view. ${names[orientation]} is currently at the top`);
  }

  private updateInteraction(locationId: string | null): void {
    const prompt = this.root.querySelector<HTMLElement>('#interaction-prompt');
    const button = this.root.querySelector<HTMLButtonElement>('[data-game="interact"]');
    if (!prompt || !button) return;
    prompt.classList.toggle('hidden', !locationId);
    prompt.dataset.location = locationId ?? '';
    if (locationId) prompt.querySelector('b')!.textContent = locationPrompt(locationId);
    button.disabled = !locationId;
  }

  private openLocation(locationId: string): void {
    if (!this.engine) return;
    const result = this.engine.visitLocation(locationId);
    if (!result.ok) {
      this.toast(result.message, 'warning');
      return;
    }
    this.renderLocationModal(locationId);
  }

  private renderLocationModal(locationId: string): void {
    if (!this.engine) return;
    const location = locationById(locationId);
    if (!location) return;
    this.openModal(`
      <div class="location-hero kind-${location.kind}">
        <span>${this.locationIcon(location.kind)}</span><div><p class="eyebrow">${location.kind}</p><h2>${html(location.name)}</h2><p>${html(location.strapline)}</p></div>
        ${location.hours ? `<div class="hours ${this.engine.isLocationOpen(location.id) ? 'open' : 'closed'}">${this.engine.isLocationOpen(location.id) ? 'Open' : 'Closed'} · ${formatHours(location.hours)}</div>` : ''}
      </div>
      <div id="location-body">${this.locationBody(locationId)}</div>
    `, location.name);
    this.bindLocationActions(locationId);
  }

  private locationBody(locationId: string): string {
    if (!this.engine) return '';
    const state = this.engine.getState();
    const jobs = this.engine.getAvailableJobs(locationId);
    const items = this.engine.getItemsAt(locationId);
    const activities = this.engine.getActivitiesAt(locationId);
    const sections: string[] = [];

    if (locationId === 'home') {
      sections.push(`
        <section class="action-section"><div class="section-heading"><div><h3>Home</h3><p>Rest, save and improve your space.</p></div><span class="level-badge">Level ${state.player.homeLevel}</span></div>
          <div class="action-grid">
            ${this.actionCard('Sleep until 08:00', 'Restore energy and some health. Begins the next day.', 'Free', 'sleep', '🌙')}
            ${this.actionCard('Save game', `Last saved: ${html(this.lastSaveLabel)}`, 'Instant', 'save', '💾')}
            ${this.actionCard('Upgrade your room', '+10 maximum energy. Requires Reputation 2.', state.player.homeLevel >= 2 ? 'Owned' : '£120', 'upgrade-home', '🛋')}
          </div></section>`);
    }
    if (jobs.length) {
      sections.push(`<section class="action-section"><div class="section-heading"><div><h3>Jobs</h3><p>Apply when you meet the requirements, then work one shift at a time.</p></div></div><div class="job-list">${jobs.map((job) => {
        const missing = this.engine!.unmetRequirements(job.requirements);
        const employed = state.player.currentJobId === job.id;
        return `<article class="job-card ${missing.length ? 'locked' : ''}"><div><span class="job-pay">${money(job.pay)} / shift</span><h4>${html(job.name)}</h4><p>${html(job.description)}</p><small>${job.shiftMinutes / 60} hrs · −${job.energyCost} energy · ${formatHours(job.hours)}</small>${missing.length ? `<div class="requirements">Needs ${html(missing.join(' · '))}</div>` : ''}</div><div class="job-actions">${employed ? `<span class="employed">Current job</span><button class="button primary" data-location-action="work" data-id="${job.id}">Work shift</button>` : `<button class="button secondary" data-location-action="apply" data-id="${job.id}" ${missing.length ? 'disabled' : ''}>Apply</button>`}</div></article>`;
      }).join('')}</div></section>`);
    }
    if (items.length) {
      sections.push(`<section class="action-section"><div class="section-heading"><div><h3>For sale</h3><p>Prices and effects are shown before you buy.</p></div></div><div class="shop-grid">${items.map((item) => `<article class="shop-card"><div class="item-icon category-${item.category}">${this.itemIcon(item.category)}</div><div><h4>${html(item.name)}</h4><p>${html(item.description)}</p><small>${item.consumable ? 'Consumable' : 'Permanent'} · Carry ${state.inventory[item.id] ?? 0}/${item.stackLimit}</small></div><button class="price-button" data-location-action="buy" data-id="${item.id}">${money(item.price)}</button></article>`).join('')}</div></section>`);
    }
    if (activities.length) {
      sections.push(`<section class="action-section"><div class="section-heading"><div><h3>Things to do</h3><p>Each action changes time and energy exactly once.</p></div></div><div class="action-grid">${activities.map((activity) => this.actionCard(activity.name, `${activity.description} · ${activity.timeCost} min · −${activity.energyCost} energy`, activity.moneyCost ? money(activity.moneyCost) : 'Free', `activity:${activity.id}`, this.locationIcon(locationById(locationId)?.kind ?? 'social'))).join('')}</div></section>`);
    }
    if (locationId === 'bank') {
      sections.push(`<section class="action-section bank-section"><div class="section-heading"><div><h3>Move money</h3><p>Cash ${money(state.player.cash)} · Bank ${money(state.player.bankBalance)}</p></div></div><div class="bank-controls"><label for="bank-amount">Amount</label><div class="bank-input"><span>£</span><input id="bank-amount" class="input" inputmode="decimal" placeholder="0.00" /></div><div class="quick-amounts">${[10, 20, 50].map((amount) => `<button data-bank-quick="${amount}">£${amount}</button>`).join('')}</div><div class="bank-actions"><button class="button primary" data-location-action="deposit">Deposit</button><button class="button secondary" data-location-action="withdraw">Withdraw</button></div></div></section>`);
    }
    if (locationId === 'station') sections.push(this.infoPanel('🚆', 'Travel expands later', 'The station is open and explorable now. Bus and rail destinations arrive in a future milestone.'));
    if (locationId === 'studio' && !activities.length) sections.push(this.infoPanel('🔒', 'Build your reputation', 'The studio opens to locals with Reputation 5.'));
    return sections.join('') || this.infoPanel('📍', 'Have a look around', 'This location is part of the village and ready for future stories.');
  }

  private bindLocationActions(locationId: string): void {
    this.root.querySelectorAll<HTMLButtonElement>('[data-location-action]').forEach((button) => {
      button.addEventListener('click', () => {
        if (!this.engine) return;
        const action = button.dataset.locationAction ?? '';
        const id = button.dataset.id ?? '';
        let result: ActionResult = { ok: false, message: 'That action is unavailable.' };
        if (action === 'apply') result = this.engine.applyForJob(id);
        if (action === 'work') result = this.engine.work(id);
        if (action === 'buy') result = this.engine.purchaseItem(id);
        if (action === 'sleep') result = this.engine.sleep();
        if (action === 'save') result = this.engine.manualSave();
        if (action === 'upgrade-home') result = this.engine.upgradeHome();
        if (action.startsWith('activity:')) result = this.engine.performActivity(action.replace('activity:', ''));
        if (action === 'deposit' || action === 'withdraw') {
          const amount = Number(this.root.querySelector<HTMLInputElement>('#bank-amount')?.value ?? '');
          result = this.engine.bank(action, amount);
        }
        this.toast(result.message, result.ok ? 'success' : 'warning');
        if (result.ok) {
          this.world?.scene.syncPosition();
          const body = this.root.querySelector<HTMLElement>('#location-body');
          if (body) body.innerHTML = this.locationBody(locationId);
          this.bindLocationActions(locationId);
        }
      });
    });
    this.root.querySelectorAll<HTMLButtonElement>('[data-bank-quick]').forEach((button) => {
      button.addEventListener('click', () => {
        const input = this.root.querySelector<HTMLInputElement>('#bank-amount');
        if (input) input.value = button.dataset.bankQuick ?? '';
      });
    });
  }

  private openInventory(): void {
    if (!this.engine) return;
    const state = this.engine.getState();
    const owned = Object.entries(state.inventory).filter(([, quantity]) => quantity > 0);
    this.openModal(`<div class="modal-heading"><p class="eyebrow">Your things</p><h2>Inventory</h2><p>Consumables can be used once. Permanent items stay with you.</p></div><div class="inventory-list">${owned.length ? owned.map(([id, quantity]) => {
      const item = itemById(id);
      if (!item) return '';
      return `<article class="inventory-item"><div class="item-icon category-${item.category}">${this.itemIcon(item.category)}</div><div><h3>${html(item.name)} <span>×${quantity}</span></h3><p>${html(item.description)}</p></div>${item.consumable ? `<button class="button primary" data-use-item="${item.id}">Use</button>` : '<span class="owned-pill">Owned</span>'}</article>`;
    }).join('') : '<div class="empty-state"><span>🎒</span><h3>Your bag is empty</h3><p>Visit Village Basket or Second Spin to pick up useful items.</p></div>'}</div>`, 'Inventory');
    this.root.querySelectorAll<HTMLButtonElement>('[data-use-item]').forEach((button) => button.addEventListener('click', () => {
      const result = this.engine!.useItem(button.dataset.useItem ?? '');
      this.toast(result.message, result.ok ? 'success' : 'warning');
      if (result.ok) this.openInventory();
    }));
  }

  private openStats(): void {
    if (!this.engine) return;
    const state = this.engine.getState();
    const player = state.player;
    const job = player.currentJobId ? jobById(player.currentJobId) : null;
    this.openModal(`<div class="modal-heading"><p class="eyebrow">${html(player.name)}</p><h2>Life so far</h2><p>${job ? html(job.name) : 'Looking for the right opportunity'} · Home level ${player.homeLevel}</p></div><div class="stats-grid">${(['strength', 'intelligence', 'charm'] as AttributeKey[]).map((key) => `<article><span>${key === 'strength' ? '💪' : key === 'intelligence' ? '💡' : '💬'}</span><strong>${player[key]}</strong><small>${html(key)}</small></article>`).join('')}<article><span>🤝</span><strong>${player.reputation}</strong><small>Reputation</small></article></div><section class="summary-panel"><div><span>Cash</span><b>${money(player.cash)}</b></div><div><span>Bank</span><b>${money(player.bankBalance)}</b></div><div><span>Days lived</span><b>${state.time.dayNumber}</b></div><div><span>Actions</span><b>${Object.values(state.completedActions).reduce((sum, value) => sum + value, 0)}</b></div></section>`, 'Statistics');
  }

  private openObjectives(): void {
    if (!this.engine) return;
    const state = this.engine.getState();
    this.openModal(`<div class="modal-heading"><p class="eyebrow">First-day guide</p><h2>Objectives</h2><p>These teach the main loop without stopping you exploring freely.</p></div><div class="objective-list">${OBJECTIVES.map((objective, index) => {
      const complete = state.objectives.completedIds.includes(objective.id);
      const active = index === state.objectives.activeIndex;
      return `<article class="${complete ? 'complete' : active ? 'active' : ''}"><span>${complete ? '✓' : index + 1}</span><div><h3>${html(objective.title)}</h3><p>${html(objective.description)}</p></div></article>`;
    }).join('')}</div>`, 'Objectives');
  }

  private openGameMenu(): void {
    this.openModal(`<div class="modal-heading"><p class="eyebrow">Paused</p><h2>Shepperton Life RPG</h2><p>Your local save is kept in this browser.</p></div><div class="menu-stack"><button class="button primary full" data-menu="resume">Resume game</button><button class="button secondary full" data-menu="save">Save now</button><button class="button secondary full" data-menu="settings">Settings</button><button class="button ghost full" data-menu="title">Save and return to title</button></div>`, 'Pause menu');
    this.root.querySelectorAll<HTMLButtonElement>('[data-menu]').forEach((button) => button.addEventListener('click', () => {
      const action = button.dataset.menu;
      if (action === 'resume') this.closeModal();
      if (action === 'save') {
        const result = this.engine?.manualSave();
        if (result) this.toast(result.message, 'success');
      }
      if (action === 'settings') this.openSettings();
      if (action === 'title') {
        this.persistCurrent();
        this.renderTitle('Game saved. See you around the village.');
      }
    }));
  }

  private openSettings(): void {
    const settings = this.engine?.getState().settings ?? this.settings;
    this.openModal(`<div class="modal-heading"><p class="eyebrow">Comfort and sound</p><h2>Settings</h2><p>Audio support is prepared; the first milestone remains fully understandable without sound.</p></div><div class="settings-list">${this.rangeSetting('Master volume', 'masterVolume', settings.masterVolume)}${this.rangeSetting('Music volume', 'musicVolume', settings.musicVolume)}${this.rangeSetting('Effects volume', 'effectsVolume', settings.effectsVolume)}<label class="toggle-row"><div><strong>Mute all sound</strong><span>Stored for future audio.</span></div><input type="checkbox" data-setting="muted" ${settings.muted ? 'checked' : ''}><i></i></label><label class="toggle-row"><div><strong>Reduced motion</strong><span>Reduces nonessential interface movement.</span></div><input type="checkbox" data-setting="reducedMotion" ${settings.reducedMotion ? 'checked' : ''}><i></i></label></div><button class="button primary full" data-save-settings>Save settings</button>`, 'Settings');
    this.root.querySelector<HTMLButtonElement>('[data-save-settings]')?.addEventListener('click', () => {
      const updated = { ...settings };
      this.root.querySelectorAll<HTMLInputElement>('[data-setting]').forEach((input) => {
        const key = input.dataset.setting as keyof SettingsState;
        if (input.type === 'checkbox') (updated as unknown as Record<string, boolean>)[key] = input.checked;
        else (updated as unknown as Record<string, number>)[key] = Number(input.value);
      });
      this.settings = updated;
      window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
      if (this.engine) {
        this.engine.getState().settings = { ...updated };
        this.engine.manualSave();
      }
      document.documentElement.classList.toggle('reduced-motion', updated.reducedMotion);
      this.closeModal();
      this.toast('Settings saved.', 'success');
    });
  }

  private openCredits(): void {
    this.openModal(`<div class="modal-heading"><p class="eyebrow">Made from scratch</p><h2>Credits</h2><p>Shepperton Life RPG is an original browser game built with TypeScript, Phaser 3 and Vite.</p></div><div class="credits-panel"><p><strong>Design, code and procedural artwork</strong><br>Original to this project.</p><p><strong>Geography</strong><br>A fictional game-scale village inspired by Shepperton. No proprietary map imagery or private address is used.</p><p><strong>Open-source tools</strong><br>Phaser, Vite, TypeScript and Vitest. Full licence notes are in ATTRIBUTION.md.</p></div>`, 'Credits');
  }

  private confirmReset(): void {
    this.openModal(`<div class="modal-heading danger-heading"><p class="eyebrow">Permanent action</p><h2>Delete your saved life?</h2><p>This removes the local save and its backup from this browser. The repository and game remain unchanged.</p></div><div class="confirm-actions"><button class="button ghost" data-confirm-reset="cancel">Keep my save</button><button class="button danger" data-confirm-reset="yes">Delete save</button></div>`, 'Reset save');
    this.root.querySelector('[data-confirm-reset="cancel"]')?.addEventListener('click', () => this.closeModal());
    this.root.querySelector('[data-confirm-reset="yes"]')?.addEventListener('click', () => {
      this.saves.reset();
      this.closeModal();
      this.renderTitle('Save deleted. A new game will begin from scratch.');
    });
  }

  private openModal(content: string, label: string): void {
    this.root.querySelector('.modal-layer')?.remove();
    this.world?.scene.pauseWorld();
    const layer = document.createElement('div');
    layer.className = 'modal-layer';
    layer.innerHTML = `<section class="modal" role="dialog" aria-modal="true" aria-label="${html(label)}"><button class="modal-close" aria-label="Close">×</button><div class="modal-scroll">${content}</div></section>`;
    this.root.append(layer);
    layer.querySelector<HTMLButtonElement>('.modal-close')?.addEventListener('click', () => this.closeModal());
    layer.addEventListener('pointerdown', (event) => {
      if (event.target === layer) this.closeModal();
    });
    layer.querySelector<HTMLElement>('button, input, select')?.focus();
  }

  private closeModal(): void {
    this.root.querySelector('.modal-layer')?.remove();
    if (this.world) this.world.scene.resumeWorld();
  }

  private updateHud(): void {
    if (!this.engine) return;
    const state = this.engine.getState();
    const player = state.player;
    const set = (id: string, value: string) => {
      const node = this.root.querySelector<HTMLElement>(`#${id}`);
      if (node) node.textContent = value;
    };
    set('hud-name', player.name);
    set('hud-job', player.currentJobId ? jobById(player.currentJobId)?.name ?? 'Employed' : 'Unemployed');
    set('hud-cash', money(player.cash));
    set('hud-bank', money(player.bankBalance));
    set('hud-day', `${WEEKDAYS[state.time.weekdayIndex]} ${state.time.dayNumber}`);
    set('hud-time', formatTime(state.time.minutes));
    set('health-text', `${Math.round(player.health)}/${player.maxHealth}`);
    set('energy-text', `${Math.round(player.energy)}/${player.maxEnergy}`);
    const health = this.root.querySelector<HTMLElement>('#health-meter');
    const energy = this.root.querySelector<HTMLElement>('#energy-meter');
    if (health) health.style.width = `${player.health / player.maxHealth * 100}%`;
    if (energy) energy.style.width = `${player.energy / player.maxEnergy * 100}%`;
    const active = OBJECTIVES[state.objectives.activeIndex];
    set('objective-title', active?.title ?? 'First day complete!');
    set('objective-text', active?.description ?? 'Explore freely and build the life you want.');
  }

  private toast(message: string, type: 'success' | 'warning'): void {
    const region = this.root.querySelector<HTMLElement>('#toast-region') ?? this.root;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span>${type === 'success' ? '✓' : '!'}</span><p>${html(message)}</p>`;
    region.append(toast);
    window.setTimeout(() => toast.remove(), this.settings.reducedMotion ? 3500 : 4200);
  }

  private persistCurrent(): void {
    if (!this.engine) return;
    try {
      this.saves.save(this.engine.getState());
      this.lastSaveLabel = formatTime(new Date().getHours() * 60 + new Date().getMinutes());
    } catch (error) {
      console.error('Save failed', error);
    }
  }

  private destroyWorld(): void {
    document.removeEventListener('keydown', this.escapeHandler);
    if (this.saveTimer !== null) window.clearInterval(this.saveTimer);
    this.saveTimer = null;
    this.world?.destroy();
    this.world = null;
    this.engine = null;
  }

  private readSettings(): SettingsState {
    try {
      const value = JSON.parse(window.localStorage.getItem(SETTINGS_KEY) ?? 'null') as Partial<SettingsState> | null;
      return value ? { ...DEFAULT_SETTINGS, ...value } : { ...DEFAULT_SETTINGS };
    } catch {
      return { ...DEFAULT_SETTINGS };
    }
  }

  private relativeDate(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'recently';
    return date.toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  }

  private avatarName(): string {
    return this.draft.avatarId[0].toUpperCase() + this.draft.avatarId.slice(1);
  }

  private rangeSetting(label: string, key: string, value: number): string {
    return `<label class="range-row"><div><strong>${label}</strong><span>${Math.round(value * 100)}%</span></div><input type="range" min="0" max="1" step="0.1" value="${value}" data-setting="${key}"></label>`;
  }

  private actionCard(name: string, description: string, price: string, action: string, icon: string): string {
    return `<article class="action-card"><span class="action-icon">${icon}</span><div><h4>${html(name)}</h4><p>${html(description)}</p></div><button class="button secondary" data-location-action="${html(action)}">${html(price)}</button></article>`;
  }

  private infoPanel(icon: string, title: string, text: string): string {
    return `<div class="info-panel"><span>${icon}</span><div><h3>${html(title)}</h3><p>${html(text)}</p></div></div>`;
  }

  private locationIcon(kind: (typeof LOCATIONS)[number]['kind']): string {
    return { home: '🏠', work: '💼', shop: '🛍', training: '⚡', bank: '£', travel: '🚆', social: '🤝', locked: '🔒' }[kind];
  }

  private itemIcon(category: (typeof ITEMS)[number]['category']): string {
    return { food: '🥪', drink: '⚡', training: '🏋', home: '💡' }[category];
  }
}

void ACTIVITIES;
void JOBS;
