(() => {
  'use strict';

  const SAVE_KEY = 'lemon-stand-empire-v01';
  const APP_VERSION = 2;
  const $ = (s) => document.querySelector(s);
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const money = (n) => `£${Number(n || 0).toFixed(2)}`;
  const pct = (n) => `${Math.round(n)}%`;
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const deepClone = (v) => JSON.parse(JSON.stringify(v));

  const WEATHER = {
    hot:    { label: 'Sunny & Hot', short: 'Hot',    emoji: '☀️', temp: 29, traffic: 1.45, ideal: { lemons: [3,5], sugar: [2,4], ice: [4,6], water: [4,6] } },
    sunny:  { label: 'Sunny',       short: 'Sunny',  emoji: '☀️', temp: 25, traffic: 1.22, ideal: { lemons: [3,5], sugar: [2,4], ice: [3,5], water: [4,6] } },
    warm:   { label: 'Warm',        short: 'Warm',   emoji: '🌤️', temp: 22, traffic: 1.00, ideal: { lemons: [3,5], sugar: [3,5], ice: [2,4], water: [4,6] } },
    cloudy: { label: 'Cloudy',      short: 'Cloudy', emoji: '☁️', temp: 18, traffic: 0.84, ideal: { lemons: [3,5], sugar: [3,5], ice: [1,3], water: [4,6] } },
    rainy:  { label: 'Rainy',       short: 'Rainy',  emoji: '🌧️', temp: 15, traffic: 0.60, ideal: { lemons: [2,4], sugar: [3,6], ice: [1,2], water: [4,6] } },
    stormy: { label: 'Stormy',      short: 'Stormy', emoji: '⛈️', temp: 14, traffic: 0.35, ideal: { lemons: [2,4], sugar: [4,6], ice: [0,2], water: [4,6] } }
  };

  const SUPPLIES = {
    lemons: { label: 'Lemons', emoji: '🍋', pack: 20, cost: 3.60, unit: 0.18, life: 3, note: 'Freshness & sourness' },
    sugar:  { label: 'Sugar',  emoji: '🧂', pack: 20, cost: 1.60, unit: 0.08, life: 6, note: 'Sweetness' },
    ice:    { label: 'Ice',    emoji: '🧊', pack: 30, cost: 3.00, unit: 0.10, life: 1, note: 'Refreshment' },
    cups:   { label: 'Cups',   emoji: '🥤', pack: 50, cost: 3.00, unit: 0.06, life: null, note: 'Every sale needs one' },
    water:  { label: 'Water',  emoji: '💧', pack: 50, cost: 1.00, unit: 0.02, life: null, note: 'Strength & balance' }
  };

  const EVENTS = [
    { name: 'No special event', desc: 'A normal trading day.', traffic: 1 },
    { name: 'School Trip', desc: 'More young customers nearby.', traffic: 1.25, priceBias: -0.08 },
    { name: 'Street Market', desc: 'Extra local foot traffic today.', traffic: 1.35 },
    { name: 'Roadworks', desc: 'Fewer people pass the stand.', traffic: 0.72 },
    { name: 'Heat Wave Buzz', desc: 'Everyone is talking about cold drinks.', traffic: 1.28 },
    { name: 'Charity Run', desc: 'A burst of thirsty runners is expected.', traffic: 1.22 }
  ];

  const LOCATIONS = {
    neighbourhood: { name: 'Neighbourhood', emoji: '🏡', level: 1, fee: 0,  traffic: 1.00, description: 'Medium traffic · Free pitch', scene: 'neighbourhood' },
    park:          { name: 'Park', emoji: '🌳', level: 2, fee: 8,  traffic: 1.18, description: 'High traffic · Great in sunshine', scene: 'park' },
    shopping:      { name: 'Shopping District', emoji: '🛍️', level: 3, fee: 22, traffic: 1.38, description: 'Very high traffic · Higher pitch fee', scene: 'shopping' },
    business:      { name: 'Business District', emoji: '🏢', level: 4, fee: 18, traffic: 1.28, description: 'Strong lunch rush · Price tolerant', scene: 'business' },
    beach:         { name: 'Beachfront', emoji: '🏖️', level: 5, fee: 30, traffic: 1.55, description: 'Excellent on hot, sunny days', scene: 'beach', hotBonus: 1.25 },
    festival:      { name: 'Festival', emoji: '🎪', level: 7, fee: 35, traffic: 1.75, description: 'Huge demand · Premium pitch', scene: 'festival' }
  };

  const UPGRADES = {
    speed:   { name: 'Better Stand', icon: '🧰', category: 'Stand', base: 65, max: 5, benefit: (l) => `Serve ${10 + l * 12}% faster` },
    cooler:  { name: 'Premium Cooler', icon: '🧊', category: 'Equipment', base: 55, max: 4, benefit: (l) => `Ice lasts ${1 + l} day${l ? 's' : ''}` },
    sign:    { name: 'Local Advertising', icon: '📣', category: 'Advertising', base: 40, max: 5, benefit: (l) => `+${l * 7}% noticing chance` },
    storage: { name: 'Storage Crates', icon: '📦', category: 'Storage', base: 50, max: 5, benefit: (l) => `+${l * 60} stock capacity` },
    recipe:  { name: 'Recipe Notebook', icon: '🍋', category: 'Recipe', base: 45, max: 4, benefit: (l) => `+${l * 4}% recipe quality` },
    awning:  { name: 'Weather Awning', icon: '☂️', category: 'Stand', base: 60, max: 3, benefit: (l) => `Cuts bad-weather loss by ${l * 25}%` },
    staff:   { name: 'Part-time Helper', icon: '👥', category: 'Staff', base: 110, max: 3, benefit: (l) => l ? `Queue capacity +${l * 2}` : 'Unlock faster service' }
  };

  const ACHIEVEMENTS = [
    { id: 'firstSale', icon: '🏆', name: 'First Sale', desc: 'Make your first sale', test: (s) => s.stats.cups >= 1, progress: (s) => [Math.min(s.stats.cups,1),1] },
    { id: 'cups100', icon: '🥤', name: '100 Cups Sold', desc: 'Sell 100 cups', test: (s) => s.stats.cups >= 100, progress: (s) => [Math.min(s.stats.cups,100),100] },
    { id: 'revenue1000', icon: '💷', name: '£1,000 Revenue', desc: 'Earn £1,000 lifetime revenue', test: (s) => s.stats.revenue >= 1000, progress: (s) => [Math.min(s.stats.revenue,1000),1000] },
    { id: 'perfectDay', icon: '🌟', name: 'Perfect Day', desc: '95%+ satisfaction and no stockouts', test: (s) => s.history.some(h => h.satisfaction >= 95 && h.stockouts === 0), progress: () => [0,1] },
    { id: 'customerFavourite', icon: '❤️', name: 'Customer Favourite', desc: 'Reach 90 reputation', test: (s) => s.reputation >= 90, progress: (s) => [Math.min(s.reputation,90),90] },
    { id: 'mogul', icon: '👑', name: 'Business Mogul', desc: 'Earn £5,000 lifetime profit', test: (s) => s.stats.profit >= 5000, progress: (s) => [Math.min(s.stats.profit,5000),5000] }
  ];

  const LEVEL_THRESHOLDS = [0, 150, 360, 650, 1050, 1550, 2200, 3000, 4000, 5200, 6700];

  let state = null;
  let timer = null;
  let sim = null;
  let ui = {
    splash: true,
    screen: 'menu',
    supplyCart: Object.fromEntries(Object.keys(SUPPLIES).map(k => [k, 0])),
    selectedUpgrade: 'speed',
    speed: 1,
    daySnapshot: null,
    savedSummary: null
  };

  function rollWeather() {
    const r = Math.random();
    return r < .12 ? 'hot' : r < .37 ? 'sunny' : r < .67 ? 'warm' : r < .84 ? 'cloudy' : r < .96 ? 'rainy' : 'stormy';
  }
  function rollTemp(key) { return WEATHER[key].temp + Math.floor(Math.random() * 5) - 2; }
  function levelFromXP(xp) {
    let level = 1;
    for (let i = 1; i < LEVEL_THRESHOLDS.length; i++) if (xp >= LEVEL_THRESHOLDS[i]) level = i + 1;
    return level;
  }
  function nextLevelXP(level) { return LEVEL_THRESHOLDS[Math.min(level, LEVEL_THRESHOLDS.length - 1)] || LEVEL_THRESHOLDS.at(-1); }
  function currentLevelFloor(level) { return LEVEL_THRESHOLDS[Math.max(0, level - 1)] || 0; }

  function newState(name = 'Sunny Squeeze') {
    const weather = rollWeather();
    return {
      version: APP_VERSION,
      businessName: name.trim() || 'Sunny Squeeze',
      stage: 'planning',
      day: 1,
      cash: 40,
      reputation: 50,
      xp: 0,
      level: 1,
      weather,
      temperature: rollTemp(weather),
      event: pick(EVENTS),
      location: 'neighbourhood',
      recipe: { lemons: 3, sugar: 3, ice: 3, water: 5 },
      price: 1.50,
      inventory: Object.fromEntries(Object.keys(SUPPLIES).map(k => [k, []])),
      upgrades: Object.fromEntries(Object.keys(UPGRADES).map(k => [k, 0])),
      stats: {
        cups: 0, revenue: 0, profit: 0, days: 0, waste: 0,
        bestProfit: null, worstProfit: null, highestCash: 40, profitableDays: 0,
        customers: 0, customersLost: 0, repeatCustomers: 0,
        priceComplaints: 0, recipeComplaints: 0, satisfactionTotal: 0
      },
      history: [],
      achievements: {},
      settings: { sound: true, music: true, animations: true, notifications: false, reducedMotion: false },
      lastResult: null,
      pendingLevelUp: null,
      newAchievements: [],
      interruptedRefund: 0
    };
  }

  function patchStats(stats = {}, cash = 0) {
    return {
      cups: Number(stats.cups || 0), revenue: Number(stats.revenue || 0), profit: Number(stats.profit || 0),
      days: Number(stats.days || 0), waste: Number(stats.waste || 0), bestProfit: stats.bestProfit ?? null,
      worstProfit: stats.worstProfit ?? null, highestCash: Number(stats.highestCash ?? cash), profitableDays: Number(stats.profitableDays || 0),
      customers: Number(stats.customers || 0), customersLost: Number(stats.customersLost || 0), repeatCustomers: Number(stats.repeatCustomers || 0),
      priceComplaints: Number(stats.priceComplaints || 0), recipeComplaints: Number(stats.recipeComplaints || 0), satisfactionTotal: Number(stats.satisfactionTotal || 0)
    };
  }

  function migrate(raw) {
    if (!raw || typeof raw !== 'object') return null;
    if (raw.version >= 2) {
      const base = newState(raw.businessName || 'Sunny Squeeze');
      const merged = { ...base, ...raw };
      merged.recipe = { ...base.recipe, ...(raw.recipe || {}) };
      merged.inventory = { ...base.inventory, ...(raw.inventory || {}) };
      Object.keys(SUPPLIES).forEach(k => { if (!Array.isArray(merged.inventory[k])) merged.inventory[k] = []; });
      merged.upgrades = { ...base.upgrades, ...(raw.upgrades || {}) };
      Object.keys(UPGRADES).forEach(k => merged.upgrades[k] = Number(merged.upgrades[k] || 0));
      merged.stats = patchStats(raw.stats, merged.cash);
      merged.settings = { ...base.settings, ...(raw.settings || {}) };
      merged.history = Array.isArray(raw.history) ? raw.history : [];
      merged.achievements = raw.achievements || {};
      merged.level = levelFromXP(Number(merged.xp || 0));
      if (!LOCATIONS[merged.location]) merged.location = 'neighbourhood';
      return merged;
    }

    const base = newState('Sunny Squeeze');
    base.day = Number(raw.day || 1);
    base.cash = Number(raw.cash ?? 22);
    base.reputation = Number(raw.reputation ?? 50);
    base.weather = WEATHER[raw.weather] ? raw.weather : rollWeather();
    base.temperature = rollTemp(base.weather);
    base.event = raw.event || pick(EVENTS);
    base.recipe = { ...base.recipe, ...(raw.recipe || {}) };
    base.price = Number(raw.price || 1.5);
    Object.keys(raw.inventory || {}).forEach(k => { if (base.inventory[k] && Array.isArray(raw.inventory[k])) base.inventory[k] = raw.inventory[k]; });
    base.inventory.water = base.inventory.water.length ? base.inventory.water : [{ qty: 50, bought: base.day }];
    Object.keys(raw.upgrades || {}).forEach(k => { if (k in base.upgrades) base.upgrades[k] = raw.upgrades[k] ? 1 : 0; });
    base.stats = patchStats(raw.stats, base.cash);
    base.lastResult = raw.lastResult || null;
    if (raw.lastResult) base.history = [raw.lastResult];
    base.xp = Math.max(0, base.stats.cups * 2 + base.stats.days * 20);
    base.level = levelFromXP(base.xp);
    base.stage = raw.stage === 'results' ? 'results' : raw.stage === 'trading' ? 'trading' : 'planning';
    return base;
  }

  function save() {
    if (!state) return;
    state.version = APP_VERSION;
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  }
  function load() {
    try { return migrate(JSON.parse(localStorage.getItem(SAVE_KEY))); }
    catch { return null; }
  }
  function hasSave() { return !!localStorage.getItem(SAVE_KEY); }

  function qty(id) { return (state.inventory[id] || []).reduce((s, b) => s + Number(b.qty || 0), 0); }
  function cap() { return 160 + state.upgrades.storage * 60; }
  function used() { return Object.keys(SUPPLIES).reduce((s, id) => s + qty(id), 0); }
  function coolerLife() { return 1 + state.upgrades.cooler; }

  function makeable() {
    const r = state.recipe;
    return Math.max(0, Math.floor(Math.min(
      r.lemons ? qty('lemons') / r.lemons : 9999,
      r.sugar ? qty('sugar') / r.sugar : 9999,
      r.ice ? qty('ice') / r.ice : 9999,
      r.water ? qty('water') / r.water : 9999,
      qty('cups')
    )));
  }

  function consume(id, n) {
    let left = n;
    for (const b of state.inventory[id]) {
      const take = Math.min(left, b.qty);
      b.qty -= take;
      left -= take;
      if (left <= 0) break;
    }
    state.inventory[id] = state.inventory[id].filter(b => b.qty > 0);
  }

  function recipeCostPerCup() {
    return state.recipe.lemons * SUPPLIES.lemons.unit +
      state.recipe.sugar * SUPPLIES.sugar.unit +
      state.recipe.ice * SUPPLIES.ice.unit +
      state.recipe.water * SUPPLIES.water.unit + SUPPLIES.cups.unit;
  }

  function scoreOne(v, range) {
    const [lo, hi] = range;
    return v >= lo && v <= hi ? 1 : Math.max(.25, 1 - Math.min(Math.abs(v - lo), Math.abs(v - hi)) * .2);
  }

  function recipeScore() {
    const w = WEATHER[state.weather], r = state.recipe;
    let q = scoreOne(r.lemons, w.ideal.lemons) * .30 +
      scoreOne(r.sugar, w.ideal.sugar) * .25 +
      scoreOne(r.ice, w.ideal.ice) * .25 +
      scoreOne(r.water, w.ideal.water) * .20;
    q += state.upgrades.recipe * .04;
    return clamp(q, .20, 1.15);
  }

  function idealPrice() {
    const w = WEATHER[state.weather];
    const loc = LOCATIONS[state.location];
    let base = 1.32 + (w.traffic - 1) * .30 + (loc.traffic - 1) * .32;
    if (state.location === 'business') base += .12;
    return clamp(base, 1.05, 2.25);
  }

  function priceScore(price = state.price) {
    const ideal = idealPrice();
    return clamp(1.10 - Math.max(0, price - ideal) * .56 - Math.max(0, ideal - price) * .10, .15, 1.16);
  }

  function suggestedRange() {
    const i = idealPrice();
    return [Math.max(.5, i - .22), i + .26];
  }

  function trafficBase() {
    let weatherFactor = WEATHER[state.weather].traffic;
    if (state.upgrades.awning && weatherFactor < 1) {
      const recover = Math.min(.75, state.upgrades.awning * .25);
      weatherFactor += (1 - weatherFactor) * recover;
    }
    const loc = LOCATIONS[state.location];
    let locFactor = loc.traffic;
    if (loc.hotBonus && ['hot', 'sunny'].includes(state.weather)) locFactor *= loc.hotBonus;
    return Math.round((50 + state.day * .7) * weatherFactor * state.event.traffic * locFactor);
  }

  function demandEffect() { return Math.round((WEATHER[state.weather].traffic - 1) * 100); }
  function locationUnlocked(id) { return state.level >= LOCATIONS[id].level; }
  function upgradeCost(id) { const u = UPGRADES[id], level = state.upgrades[id]; return Math.round(u.base * Math.pow(1.62, level)); }
  function xpProgress() {
    const floor = currentLevelFloor(state.level), next = nextLevelXP(state.level);
    if (state.level >= LEVEL_THRESHOLDS.length) return { value: 100, text: 'MAX LEVEL' };
    const value = ((state.xp - floor) / Math.max(1, next - floor)) * 100;
    return { value: clamp(value, 0, 100), text: `${state.xp - floor} / ${next - floor} XP` };
  }

  function recipeDescriptors() {
    const sweet = state.recipe.sugar <= 2 ? 'Light' : state.recipe.sugar <= 4 ? 'Balanced' : 'Sweet';
    const refresh = state.recipe.ice <= 1 ? 'Mild' : state.recipe.ice <= 3 ? 'Refreshing' : 'Extra cold';
    const strengthRatio = state.recipe.lemons / Math.max(1, state.recipe.water);
    const strength = strengthRatio < .55 ? 'Light' : strengthRatio < .9 ? 'Balanced' : 'Strong';
    return { sweet, refresh, strength };
  }

  function inventoryStatus(id) {
    const q = qty(id);
    const need = id === 'cups' ? 1 : state.recipe[id] || 1;
    const cups = Math.floor(q / Math.max(1, need));
    if (q === 0) return { text: 'OUT', className: 'danger' };
    if (cups < 8) return { text: 'LOW STOCK', className: 'warning' };
    return { text: 'READY', className: 'success' };
  }

  function inventoryWarnings() {
    return Object.keys(SUPPLIES).filter(id => inventoryStatus(id).className !== 'success');
  }

  function addBatch(id, units) {
    if (units <= 0) return;
    state.inventory[id].push({ qty: units, bought: state.day });
  }

  function cartTotal() {
    return Object.entries(ui.supplyCart).reduce((s, [id, count]) => s + SUPPLIES[id].cost * count, 0);
  }
  function cartUnits() {
    return Object.entries(ui.supplyCart).reduce((s, [id, count]) => s + SUPPLIES[id].pack * count, 0);
  }

  function evaluateAchievements() {
    const newly = [];
    ACHIEVEMENTS.forEach(a => {
      if (!state.achievements[a.id] && a.test(state)) {
        state.achievements[a.id] = { day: state.day, at: Date.now() };
        newly.push(a.id);
      }
    });
    state.newAchievements = newly;
  }

  function achievementById(id) { return ACHIEVEMENTS.find(a => a.id === id); }

  function toast(message, tone = 'default') {
    const root = $('#toast-root');
    if (!root) return;
    const el = document.createElement('div');
    el.className = `toast toast-${tone}`;
    el.textContent = message;
    root.appendChild(el);
    setTimeout(() => el.classList.add('show'), 10);
    setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 220); }, 2200);
  }

  function clearOverlay() { const root = $('#overlay-root'); if (root) root.innerHTML = ''; }
  function overlay(html) { const root = $('#overlay-root'); if (root) root.innerHTML = `<div class="modal-backdrop">${html}</div>`; }

  function showConfirm(title, body, yesText, onYes) {
    overlay(`<section class="modal-card compact"><div class="modal-icon">⚠️</div><h2>${title}</h2><p>${body}</p><div class="modal-actions"><button class="btn ghost" data-action="close-overlay">CANCEL</button><button class="btn danger-btn" id="confirmDanger">${yesText}</button></div></section>`);
    setTimeout(() => { const b = $('#confirmDanger'); if (b) b.onclick = () => { clearOverlay(); onYes(); }; }, 0);
  }

  function saveRepairInterrupted(s) {
    if (s?.stage === 'trading') {
      s.cash += Number(s.interruptedRefund || 0);
      s.interruptedRefund = 0;
      s.stage = 'planning';
      localStorage.setItem(SAVE_KEY, JSON.stringify(s));
      return true;
    }
    return false;
  }

  function header() {
    return `<header class="game-header">
      <div class="header-pill">${WEATHER[state.weather].emoji}<span>Day ${state.day}</span></div>
      <div class="header-pill money-pill">💷<strong>${money(state.cash)}</strong></div>
      <div class="header-pill">⭐<span>Lv ${state.level}</span></div>
    </header>`;
  }

  function bottomNav(active) {
    const items = [
      ['home','🏠','Home'], ['profile','🧾','Business'], ['shop','🛒','Shop'], ['stats','📊','Stats'], ['settings','⚙️','Settings']
    ];
    return `<nav class="bottom-nav" aria-label="Primary navigation">${items.map(([id, icon, label]) =>
      `<button class="nav-item ${active === id ? 'active' : ''}" data-nav="${id}"><span>${icon}</span><small>${label}</small></button>`).join('')}</nav>`;
  }

  function frame(content, active = 'home') {
    return `<main class="app-shell">${header()}<div class="screen-scroll">${content}</div>${bottomNav(active)}</main>`;
  }

  function subHeader(title, back = 'plan') {
    return `<div class="sub-header"><button class="icon-btn" data-nav="${back}" aria-label="Back">←</button><h1>${title}</h1><div class="sub-spacer"></div></div>`;
  }

  function statusBadge(text, kind = 'success') { return `<span class="status-badge ${kind}">${text}</span>`; }
  function metric(icon, label, value, extra = '') { return `<div class="metric-card"><span class="metric-icon">${icon}</span><div><small>${label}</small><strong>${value}</strong>${extra ? `<em>${extra}</em>` : ''}</div></div>`; }

  function splashScreen() {
    return `<main class="splash-screen"><div class="sun-orb"></div><div class="splash-logo">🍋</div><h1>LEMONADE<br><span>BUSINESS TYCOON</span></h1><p>Build the stand. Perfect the recipe. Grow the business.</p><div class="loading-pill">🍋 Loading your business…</div></main>`;
  }

  function menuScreen() {
    const saved = load();
    return `<main class="menu-screen"><div class="menu-sun"></div><section class="menu-brand"><div class="logo-badge">🍋</div><p class="eyebrow">LEMONADE</p><h1>BUSINESS TYCOON</h1><p>Make smart choices. Serve happy customers. Grow every day.</p></section><section class="menu-actions">
      <button class="btn primary tall" data-action="continue" ${saved ? '' : 'disabled'}>${saved ? `CONTINUE · DAY ${saved.day}` : 'CONTINUE · NO SAVE'}</button>
      <button class="btn secondary tall" data-action="new-game">NEW GAME</button>
      <button class="btn ghost tall" data-action="menu-how">HOW TO PLAY</button>
      <button class="btn ghost tall" data-action="menu-settings">SETTINGS</button>
    </section><p class="version-note">v2.0 · Local save · Canva UI integration</p></main>`;
  }

  function newGameScreen() {
    return `<main class="standalone-screen"><div class="sub-header standalone"><button class="icon-btn" data-nav="menu">←</button><h1>New Business</h1><div></div></div><section class="setup-card"><div class="setup-art">🍋</div><h2>Name your stand</h2><p>You can change this later.</p><label class="input-label">Business name<input id="businessName" maxlength="28" value="Sunny Squeeze" /></label><div class="choice-card selected"><div><strong>Classic</strong><span>Balanced starter cash and demand</span></div>${statusBadge('RECOMMENDED','success')}</div><div class="cash-card"><span>Starter cash</span><strong>£40.00</strong><small>Enough to buy your first ingredients.</small></div><button class="btn primary tall" data-action="create-business">START BUSINESS</button></section></main>`;
  }

  function dashboardScreen() {
    const last = state.lastResult;
    const warn = inventoryWarnings();
    const loc = LOCATIONS[state.location];
    return frame(`<section class="greeting"><span class="eyebrow">GOOD MORNING 👋</span><h1>${state.businessName}</h1><p>Your business is ready for another day.</p></section>
      <section class="profit-hero"><small>YESTERDAY'S PROFIT</small><strong class="${last && last.profit < 0 ? 'negative-text' : ''}">${last ? `${last.profit >= 0 ? '+' : ''}${money(last.profit)}` : '—'}</strong><span>${last ? `Revenue ${money(last.revenue)} · Expenses ${money(last.expenses || 0)}` : 'Complete your first day to see results.'}</span></section>
      <div class="dashboard-grid">
        <button class="dashboard-card weather-card" data-nav="weather"><span class="big-emoji">${WEATHER[state.weather].emoji}</span><div><strong>${WEATHER[state.weather].short} ${state.temperature}°C</strong><small>${demandEffect() >= 0 ? 'Strong' : 'Lower'} demand · ${demandEffect() >= 0 ? '+' : ''}${demandEffect()}%</small></div><span>›</span></button>
        <button class="dashboard-card" data-nav="locations"><span class="big-emoji">${loc.emoji}</span><div><strong>${loc.name}</strong><small>${loc.fee ? `${money(loc.fee)} pitch fee` : 'Free pitch'}</small></div><span>›</span></button>
        <button class="dashboard-card ${warn.length ? 'warning-card' : ''}" data-nav="inventory"><span class="big-emoji">${warn.length ? '⚠️' : '✅'}</span><div><strong>${warn.length ? 'Low stock' : 'Inventory ready'}</strong><small>${warn.length ? `${warn.slice(0,2).map(k => SUPPLIES[k].label).join(' and ')} need attention` : `${makeable()} cups possible`}</small></div><span class="count-badge">${warn.length || '✓'}</span></button>
      </div><button class="btn primary tall sticky-cta" data-nav="plan">PLAN NEXT DAY</button>`, 'home');
  }

  function planScreen() {
    const warning = inventoryWarnings().length > 0;
    const d = recipeDescriptors();
    const loc = LOCATIONS[state.location];
    const ready = makeable() > 0 && state.cash >= loc.fee;
    return frame(`<section class="page-title"><h1>Plan Day ${state.day}</h1><p>Complete the essentials, then start selling.</p></section><div class="plan-list">
      ${planRow('weather', '☀️', 'Weather', `${WEATHER[state.weather].short} · ${state.temperature}°C`, 'READY', 'success')}
      ${planRow('locations', '📍', 'Location', loc.name, 'SELECTED', 'success')}
      ${planRow('recipe', '🥤', 'Recipe', `${d.sweet} · ${d.refresh}`, 'READY', 'success')}
      ${planRow('price', '💷', 'Price', `${money(state.price)} per cup`, 'SET', 'success')}
      ${planRow('inventory', '🧊', 'Inventory', warning ? `${SUPPLIES[inventoryWarnings()[0]].label} needs attention` : `${makeable()} cups possible`, warning ? 'LOW' : 'READY', warning ? 'warning' : 'success')}
      </div><div class="readiness ${ready ? 'ready' : 'not-ready'}">${ready ? '✓ Ready to sell' : '⚠ Buy enough stock and cover the pitch fee first.'}</div><button class="btn primary tall sticky-cta" data-action="open-confirm" ${ready ? '' : 'disabled'}>START DAY</button>`, 'home');
  }

  function planRow(nav, icon, title, value, badge, kind) {
    return `<button class="plan-row" data-nav="${nav}"><span class="plan-icon">${icon}</span><div><strong>${title}</strong><small>${value}</small></div>${statusBadge(badge, kind)}<span class="chev">›</span></button>`;
  }

  function weatherScreen() {
    const w = WEATHER[state.weather];
    const boost = demandEffect();
    const times = [12,14,16].map((t, i) => ({ t, temp: state.temperature + (i === 1 ? 1 : i === 2 ? -1 : -2) }));
    return `<main class="app-shell sub-page">${subHeader('Weather','plan')}<div class="screen-scroll no-nav"><section class="weather-hero ${state.weather}"><span>Day ${state.day}</span><div class="weather-main"><div class="weather-symbol">${w.emoji}</div><div><h2>${w.label}</h2><strong>${state.temperature}°C</strong><p>${state.weather === 'rainy' || state.weather === 'stormy' ? 'Demand will be harder today.' : 'A good day to sell something cold.'}</p></div></div></section><section class="info-card demand"><span>📈</span><div><strong>Demand ${boost >= 0 ? 'boost' : 'effect'}</strong><p>${boost >= 0 ? 'More people are likely to buy lemonade today.' : 'Fewer people are likely to stop today.'}</p></div><b>${boost >= 0 ? '+' : ''}${boost}%</b></section><section class="card"><h3>Forecast</h3><div class="forecast-row">${times.map(x => `<div><small>${x.t > 12 ? x.t - 12 : x.t}${x.t >= 12 ? 'pm' : 'am'}</small><span>${w.emoji}</span><strong>${x.temp}°</strong></div>`).join('')}</div></section><section class="card"><h3>Today's event</h3><strong>${state.event.name}</strong><p>${state.event.desc}</p></section><button class="btn primary tall" data-nav="plan">USE THIS FORECAST</button></div></main>`;
  }

  function locationsScreen() {
    return `<main class="app-shell sub-page">${subHeader('Choose Location','plan')}<div class="screen-scroll no-nav"><section class="page-title compact"><p>Where will you sell?</p></section><div class="location-list">${Object.entries(LOCATIONS).map(([id, loc]) => {
      const unlocked = locationUnlocked(id), selected = state.location === id;
      return `<button class="location-card ${selected ? 'selected' : ''} ${unlocked ? '' : 'locked'}" data-action="choose-location" data-id="${id}" ${unlocked ? '' : 'disabled'}><div class="location-art scene-${loc.scene}"><span>${loc.emoji}</span></div><div class="location-copy"><div><strong>${loc.name}</strong>${selected ? statusBadge('SELECTED','success') : ''}</div><p>${loc.description}</p><small>${unlocked ? (loc.fee ? `${money(loc.fee)} / day` : 'FREE') : `Unlocks at Level ${loc.level}`}</small></div><span class="location-lock">${unlocked ? '›' : '🔒'}</span></button>`;
    }).join('')}</div><button class="btn primary tall" data-nav="plan">SELECT LOCATION</button></div></main>`;
  }

  function recipeScreen() {
    const d = recipeDescriptors();
    const score = Math.round(recipeScore() * 100);
    return `<main class="app-shell sub-page">${subHeader('Recipe','plan')}<div class="screen-scroll no-nav"><section class="recipe-title"><div><h2>Perfect your lemonade</h2><p>Cost <strong>${money(recipeCostPerCup())}</strong> per cup</p></div><div class="lemon-cup">🍋🥤</div></section><div class="recipe-controls">${['lemons','sugar','ice','water'].map(k => recipeControl(k)).join('')}</div><section class="card result-card"><h3>Recipe result</h3><div class="result-bars"><label>Sweetness <span>${d.sweet}</span><i><b style="width:${clamp(state.recipe.sugar/6*100,8,100)}%"></b></i></label><label>Refreshment <span>${d.refresh}</span><i><b style="width:${clamp(state.recipe.ice/6*100,8,100)}%"></b></i></label><label>Strength <span>${d.strength}</span><i><b style="width:${clamp(state.recipe.lemons/Math.max(1,state.recipe.water)*70,8,100)}%"></b></i></label></div><div class="quality-score"><span>Quality for today's weather</span><strong>${score}%</strong></div></section><button class="btn primary tall" data-nav="plan">SAVE RECIPE</button></div></main>`;
  }

  function recipeControl(id) {
    const s = SUPPLIES[id];
    return `<section class="recipe-row"><div class="ingredient-icon">${s.emoji}</div><div class="ingredient-copy"><strong>${s.label}</strong><small>${s.note}</small></div><div class="stepper"><button data-action="recipe-step" data-key="${id}" data-delta="-1">−</button><strong>${state.recipe[id]}</strong><button data-action="recipe-step" data-key="${id}" data-delta="1">+</button></div></section>`;
  }

  function priceScreen() {
    const [lo, hi] = suggestedRange();
    const cost = recipeCostPerCup(), margin = state.price - cost;
    const score = priceScore();
    let reaction = score > .9 ? 'Good value for today 🙂' : score > .65 ? 'A little pricey 😐' : 'Too expensive for many customers 😬';
    return `<main class="app-shell sub-page">${subHeader('Selling Price','plan')}<div class="screen-scroll no-nav"><section class="page-title"><h2>Set your price</h2><p>Higher prices improve margin but may reduce demand.</p></section><section class="price-card"><small>PRICE PER CUP</small><div class="price-stepper"><button data-action="price-step" data-delta="-0.1">−</button><strong>${money(state.price)}</strong><button data-action="price-step" data-delta="0.1">+</button></div><input id="priceRange" type="range" min="0.5" max="5" step="0.1" value="${state.price}" aria-label="Price per cup" /></section><div class="two-metrics">${metric('🧾','Cost',money(cost))}${metric('📈','Margin',money(margin))}</div><section class="reaction-card"><div class="reaction-face">${score > .9 ? '🙂' : score > .65 ? '😐' : '😬'}</div><div><small>Customer reaction</small><strong>${reaction}</strong></div></section><section class="tip-card"><span>💡</span><p>Suggested range <strong>${money(lo)} – ${money(hi)}</strong> based on location and weather.</p></section><button class="btn primary tall" data-nav="plan">SAVE PRICE</button></div></main>`;
  }

  function inventoryScreen() {
    return frame(`<section class="page-title"><h1>Inventory</h1><p>${used()} / ${cap()} storage units used · ${makeable()} cups possible</p></section><div class="inventory-list">${Object.keys(SUPPLIES).map(id => inventoryCard(id)).join('')}</div><button class="btn primary tall sticky-cta" data-nav="supplies">BUY STOCK</button>`, 'profile');
  }

  function inventoryCard(id) {
    const s = SUPPLIES[id], q = qty(id), st = inventoryStatus(id);
    const perDay = id === 'cups' ? 1 : state.recipe[id] || 1;
    const days = Math.floor(q / Math.max(1, perDay * 12));
    let shelf = s.life === null ? 'Keeps well' : id === 'ice' ? `Lasts ${coolerLife()} day${coolerLife() === 1 ? '' : 's'}` : `${s.life} day shelf life`;
    return `<section class="inventory-card ${st.className}"><div class="inventory-icon">${s.emoji}</div><div class="inventory-copy"><div><strong>${s.label}</strong>${statusBadge(st.text, st.className)}</div><p>${q} left · ${days < 1 ? '< 1 day' : `${days} day${days === 1 ? '' : 's'}`}</p><small>${shelf}</small></div><div class="unit-cost"><strong>${money(s.unit)}</strong><small>unit</small></div></section>`;
  }

  function suppliesScreen() {
    const total = cartTotal(), remaining = state.cash - total;
    return `<main class="app-shell sub-page">${subHeader('Buy Supplies','inventory')}<div class="screen-scroll no-nav"><section class="cash-banner"><div><small>Cash available</small><strong>${money(state.cash)}</strong></div><span>🛒</span></section><section class="page-title compact"><h2>Restock for tomorrow</h2></section><div class="supply-list">${Object.entries(SUPPLIES).map(([id,s]) => `<section class="supply-row"><div class="ingredient-icon">${s.emoji}</div><div><strong>${s.label}</strong><small>${money(s.unit)} each · Pack ${s.pack}</small></div><div class="stepper"><button data-action="cart-step" data-key="${id}" data-delta="-1">−</button><strong>${ui.supplyCart[id]}</strong><button data-action="cart-step" data-key="${id}" data-delta="1">+</button></div></section>`).join('')}</div><section class="basket-card"><div><span>Basket total</span><strong>${money(total)}</strong></div><small>Cash after purchase: <b class="${remaining < 0 ? 'negative-text' : ''}">${money(remaining)}</b></small><small>Storage after purchase: ${used() + cartUnits()} / ${cap()}</small></section><button class="btn primary tall" data-action="buy-supplies" ${total <= 0 || remaining < 0 || used() + cartUnits() > cap() ? 'disabled' : ''}>BUY SUPPLIES</button></div></main>`;
  }

  function confirmScreen() {
    const loc = LOCATIONS[state.location], d = recipeDescriptors();
    const operating = loc.fee + Math.min(20, makeable()) * recipeCostPerCup();
    return `<main class="app-shell sub-page">${subHeader('Ready to Sell','plan')}<div class="screen-scroll no-nav"><section class="ready-hero"><div class="ready-check">✓</div><span>Day ${state.day}</span><h2>Everything looks ready</h2></section><section class="summary-card"><h3>TODAY</h3><div class="summary-line"><span>${WEATHER[state.weather].emoji}</span><div><strong>${WEATHER[state.weather].short} · ${state.temperature}°C</strong><small>${state.event.name}</small></div></div><div class="summary-line"><span>${loc.emoji}</span><div><strong>${loc.name}</strong><small>${loc.fee ? `${money(loc.fee)} pitch fee` : 'Free pitch'}</small></div></div></section><div class="two-metrics">${metric('💷','Price per cup',money(state.price))}${metric('😋','Recipe quality',`${Math.round(recipeScore()*100)}%`,`${d.sweet} · ${d.refresh}`)}${metric('🥤','Stock ready',`${makeable()} cups`)}${metric('🧾','Est. operating cost',money(operating))}</div><button class="btn primary tall start-selling" data-action="start-selling">START SELLING</button><button class="btn ghost tall" data-nav="plan">GO BACK</button></div></main>`;
  }

  function startSelling() {
    if (makeable() < 1) { toast('Buy enough stock to make at least one cup.', 'warning'); ui.screen = 'inventory'; render(); return; }
    const fee = LOCATIONS[state.location].fee;
    if (state.cash < fee) { toast('You cannot afford this location pitch fee.', 'warning'); ui.screen = 'locations'; render(); return; }
    ui.daySnapshot = deepClone(state);
    state.cash -= fee;
    state.interruptedRefund = fee;
    state.stage = 'trading';
    save();
    ui.screen = 'live';
    ui.speed = 1;
    render();
    beginSimulation();
  }

  function tradingScreen() {
    const loc = LOCATIONS[state.location];
    return `<main class="live-shell"><header class="live-header"><div>${WEATHER[state.weather].emoji} Day ${state.day} · <span id="sim-clock">12:00pm</span></div><strong>💷 <span id="sim-cash">${money(state.cash)}</span></strong><span>⭐ Lv ${state.level}</span></header><section class="live-metrics">${liveMetric('sim-served','0','Cups sold')}${liveMetric('sim-revenue','£0.00','Revenue')}${liveMetric('sim-happy','—','Happiness')}${liveMetric('sim-stock',makeable(),'Stock left')}</section><section id="simArea" class="sim-area scene-${loc.scene} ${state.settings.reducedMotion ? 'reduced' : ''}"><div class="sky-decor">${WEATHER[state.weather].emoji}</div><div class="scene-label">${loc.emoji} ${loc.name}</div><div class="walkway"></div><div class="lemon-stand level-${Math.min(5,state.level)}"><div class="awning"></div><div class="sign">LEMONADE<br><span>${money(state.price)}</span></div><div class="counter">🍋 🥤</div></div><div id="stock-warning" class="stock-warning hidden">⚠️ Running low</div></section><div class="day-progress"><i id="dayProgress" style="width:0%"></i></div><section class="live-controls"><button class="round-control" data-action="pause">⏸<small>Pause</small></button><div class="speed-group"><button class="speed-btn active" data-action="speed" data-speed="1">1×</button><button class="speed-btn" data-action="speed" data-speed="2">2×</button><button class="speed-btn" data-action="speed" data-speed="3">3×</button></div></section></main>`;
  }

  function liveMetric(id, value, label) { return `<div><strong id="${id}">${value}</strong><small>${label}</small></div>`; }

  function beginSimulation() {
    if (timer) clearTimeout(timer);
    sim = {
      elapsed: 0, duration: 42, passed: 0, noticed: 0, considered: 0, queued: 0, served: 0,
      lostQueue: 0, rejectedPrice: 0, rejectedRecipe: 0, stockouts: 0, revenue: 0,
      feedback: [], queue: [], nextId: 1, paused: false, satisfactionAccumulator: 0, repeatCustomers: 0
    };
    scheduleTick(true);
  }

  function scheduleTick(immediate = false) {
    if (!sim || state?.stage !== 'trading') return;
    if (timer) clearTimeout(timer);
    timer = setTimeout(tick, immediate ? 10 : Math.max(120, 700 / ui.speed));
  }

  function tick() {
    if (!sim || state.stage !== 'trading') return;
    if (sim.paused) return;
    sim.elapsed++;
    const target = trafficBase();
    const spawnChance = clamp(target / sim.duration * .58, .35, 1.8);
    const count = (Math.random() < spawnChance ? 1 : 0) + (Math.random() < Math.max(0, spawnChance - 1) ? 1 : 0);
    for (let i = 0; i < count; i++) spawnCustomer();
    serveQueue();
    updateSimUI();
    if (sim.elapsed >= sim.duration) finishDay(); else scheduleTick();
  }

  function customerType() { return pick(['💼','🎓','👨‍👧','🏃','📷','🧓','👪','🛍️']); }

  function spawnCustomer() {
    const id = sim.nextId++, icon = customerType();
    sim.passed++;
    const noticeChance = clamp(.48 + state.upgrades.sign * .07 + (state.reputation - 50) / 350, .2, .93);
    if (Math.random() > noticeChance) { animateCustomer(id, icon, '', false); return; }
    sim.noticed++;
    const pScore = priceScore() + (state.event.priceBias || 0), qScore = recipeScore();
    if (Math.random() > clamp(.35 + pScore * .46, .2, .92)) {
      sim.rejectedPrice++;
      const msg = 'Too expensive'; sim.feedback.push(msg); animateCustomer(id, icon, `💷 ${msg}`, false); return;
    }
    sim.considered++;
    if (Math.random() > clamp(.35 + qScore * .50, .2, .95)) {
      sim.rejectedRecipe++;
      const msg = recipeFeedback(false); sim.feedback.push(msg); animateCustomer(id, icon, msg, false); return;
    }
    if (makeable() < 1) {
      sim.stockouts++;
      sim.feedback.push('Sold out'); animateCustomer(id, icon, '🥤 Sold out!', false); return;
    }
    const maxQ = 4 + state.upgrades.speed + state.upgrades.staff * 2;
    if (sim.queue.length >= maxQ) {
      sim.lostQueue++;
      sim.feedback.push('Queue is too long'); animateCustomer(id, icon, '😕 Queue too long', false); return;
    }
    const isRepeat = Math.random() < clamp((state.reputation - 35) / 180, .03, .35);
    if (isRepeat) sim.repeatCustomers++;
    sim.queued++;
    sim.queue.push({ id, icon, wait: 0, repeat: isRepeat });
    animateCustomer(id, icon, isRepeat ? '❤️ Back again!' : '', true);
  }

  function serveQueue() {
    if (!sim.queue.length) return;
    sim.queue.forEach(x => x.wait++);
    const impatienceLimit = 7 + state.upgrades.staff + state.upgrades.speed;
    const impat = sim.queue.findIndex(x => x.wait > impatienceLimit && Math.random() < .20);
    if (impat >= 0) {
      const [c] = sim.queue.splice(impat, 1); sim.lostQueue++;
      setThought(c.id, '⌛ Waited too long'); removeCustomer(c.id, 650);
    }
    const interval = Math.max(1, 3 - Math.floor((state.upgrades.speed + state.upgrades.staff) / 2));
    if (sim.elapsed % interval !== 0 || !sim.queue.length) return;
    const c = sim.queue.shift();
    if (makeable() < 1) { sim.stockouts++; setThought(c.id, '🥤 Sold out!'); removeCustomer(c.id, 650); return; }
    consume('lemons', state.recipe.lemons); consume('sugar', state.recipe.sugar); consume('ice', state.recipe.ice); consume('water', state.recipe.water); consume('cups', 1);
    sim.served++; sim.revenue += state.price;
    const quality = clamp(recipeScore() * 78 + priceScore() * 18 + (Math.random() * 8 - 4), 0, 100);
    sim.satisfactionAccumulator += quality;
    const fb = recipeFeedback(true); sim.feedback.push(fb);
    setThought(c.id, fb); moveToStand(c.id); playSaleTone(); setTimeout(() => removeCustomer(c.id, 350), 850);
  }

  function recipeFeedback(good) {
    const q = recipeScore(), w = WEATHER[state.weather].ideal, r = state.recipe;
    if (good && q > .95) return pick(['😍 Perfect!', '😋 Great lemonade!', '☀️ Perfect for today!', '❤️ Love it!']);
    if (r.sugar < w.sugar[0]) return '🧂 Needs more sugar';
    if (r.sugar > w.sugar[1]) return '😬 Too sweet';
    if (r.lemons > w.lemons[1]) return '🍋 Too sour';
    if (r.ice < w.ice[0]) return '🧊 Not cold enough';
    if (r.ice > w.ice[1]) return '🥶 Too icy';
    if (r.water > w.water[1]) return '💧 Too weak';
    return good ? '🙂 Nice lemonade!' : '🤔 Not quite for me';
  }

  function animateCustomer(id, icon, msg, queue) {
    const area = $('#simArea'); if (!area) return;
    const c = document.createElement('div'); c.className = 'customer'; c.dataset.id = id; c.textContent = icon; c.style.left = '-52px';
    area.appendChild(c);
    const target = queue ? Math.max(18, area.clientWidth - 245 - Math.random() * 90) : area.clientWidth + 20;
    requestAnimationFrame(() => c.style.left = `${target}px`);
    if (msg) setThought(id, msg);
    if (!queue) setTimeout(() => removeCustomer(id), state.settings.reducedMotion ? 300 : 1250);
  }

  function setThought(id, msg) {
    const area = $('#simArea'); if (!area || !msg) return;
    const c = area.querySelector(`.customer[data-id="${id}"]`); if (!c) return;
    let t = area.querySelector(`.thought[data-for="${id}"]`);
    if (!t) { t = document.createElement('div'); t.className = 'thought'; t.dataset.for = id; area.appendChild(t); }
    t.textContent = msg;
    const left = parseFloat(c.style.left) || 20;
    t.style.left = `${clamp(left - 28, 6, area.clientWidth - 158)}px`;
  }
  function moveToStand(id) { const area = $('#simArea'), c = area?.querySelector(`.customer[data-id="${id}"]`); if (c) c.style.left = `${Math.max(10, area.clientWidth - 165)}px`; }
  function removeCustomer(id, delay = 0) { setTimeout(() => { document.querySelector(`.customer[data-id="${id}"]`)?.remove(); document.querySelector(`.thought[data-for="${id}"]`)?.remove(); }, delay); }

  function updateSimUI() {
    const ratio = Math.min(1, sim.elapsed / sim.duration);
    const progress = $('#dayProgress'); if (progress) progress.style.width = `${ratio * 100}%`;
    const timeMinutes = Math.round(ratio * 300); const hour24 = 12 + Math.floor(timeMinutes / 60); const mins = timeMinutes % 60;
    const clock = $('#sim-clock'); if (clock) clock.textContent = `${hour24 > 12 ? hour24 - 12 : hour24}:${String(mins).padStart(2,'0')}pm`;
    const avg = sim.served ? sim.satisfactionAccumulator / sim.served : 0;
    const values = { '#sim-served': sim.served, '#sim-revenue': money(sim.revenue), '#sim-happy': sim.served ? pct(avg) : '—', '#sim-stock': makeable(), '#sim-cash': money(state.cash + sim.revenue) };
    Object.entries(values).forEach(([sel, value]) => { const el = $(sel); if (el) el.textContent = value; });
    const warning = $('#stock-warning');
    if (warning && makeable() <= 8 && makeable() > 0) { warning.textContent = `⚠️ Running low · ${makeable()} cups left`; warning.classList.remove('hidden'); }
    if (warning && makeable() === 0) { warning.textContent = '❗ Stock has run out'; warning.classList.remove('hidden'); }
  }

  function finishDay() {
    if (timer) clearTimeout(timer); timer = null;
    const loc = LOCATIONS[state.location];
    const satisfaction = Math.round(clamp(sim.served ? sim.satisfactionAccumulator / sim.served : recipeScore() * 70 + priceScore() * 20, 0, 100));
    const repChange = satisfaction >= 90 ? 4 : satisfaction >= 78 ? 2 : satisfaction >= 62 ? 1 : satisfaction < 40 ? -3 : satisfaction < 52 ? -1 : 0;
    state.reputation = clamp(state.reputation + repChange, 0, 100);
    const ingredients = sim.served * recipeCostPerCup();
    const expenses = ingredients + loc.fee;
    const profit = sim.revenue - expenses;
    state.cash += sim.revenue;
    state.interruptedRefund = 0;
    const result = {
      day: state.day, weather: state.weather, temperature: state.temperature, event: state.event.name,
      location: state.location, passed: sim.passed, noticed: sim.noticed, considered: sim.considered, queued: sim.queued,
      served: sim.served, lostQueue: sim.lostQueue, rejectedPrice: sim.rejectedPrice, rejectedRecipe: sim.rejectedRecipe,
      stockouts: sim.stockouts, revenue: sim.revenue, ingredientCost: ingredients, pitchFee: loc.fee, expenses, profit,
      satisfaction, repChange, feedback: sim.feedback.slice(-8), repeatCustomers: sim.repeatCustomers, waste: { lemons:0,sugar:0,ice:0,cups:0,water:0 }
    };
    state.lastResult = result;
    state.history.push(result); if (state.history.length > 120) state.history.shift();
    state.stats.cups += sim.served; state.stats.revenue += sim.revenue; state.stats.profit += profit; state.stats.days++;
    if (profit > 0) state.stats.profitableDays++;
    state.stats.bestProfit = state.stats.bestProfit === null ? profit : Math.max(state.stats.bestProfit, profit);
    state.stats.worstProfit = state.stats.worstProfit === null ? profit : Math.min(state.stats.worstProfit, profit);
    state.stats.highestCash = Math.max(state.stats.highestCash, state.cash);
    state.stats.customers += sim.passed; state.stats.customersLost += sim.lostQueue + sim.rejectedPrice + sim.rejectedRecipe + sim.stockouts;
    state.stats.repeatCustomers += sim.repeatCustomers; state.stats.priceComplaints += sim.rejectedPrice; state.stats.recipeComplaints += sim.rejectedRecipe;
    state.stats.satisfactionTotal += satisfaction;
    const oldLevel = state.level;
    state.xp += Math.max(12, sim.served * 2 + Math.round(satisfaction / 6) + Math.max(0, repChange * 4));
    state.level = levelFromXP(state.xp);
    state.pendingLevelUp = state.level > oldLevel ? { from: oldLevel, to: state.level } : null;
    evaluateAchievements();
    state.stage = 'results'; ui.screen = 'results'; sim = null; ui.daySnapshot = null; save(); render();
  }

  function resultsScreen() {
    const r = state.lastResult;
    const levelUp = state.pendingLevelUp;
    const newly = state.newAchievements.map(achievementById).filter(Boolean);
    const oldLocs = levelUp ? Object.values(LOCATIONS).filter(l => l.level > levelUp.from && l.level <= levelUp.to) : [];
    return `<main class="results-shell"><section class="results-top"><span>DAY ${r.day} COMPLETE</span><small>${WEATHER[r.weather].emoji} ${WEATHER[r.weather].short} · ${LOCATIONS[r.location].name}</small></section><section class="profit-result"><small>TODAY'S PROFIT</small><strong class="${r.profit < 0 ? 'negative-text' : ''}">${r.profit >= 0 ? '+' : ''}${money(r.profit)}</strong><span>${compareYesterday(r.profit)}</span></section><section class="results-grid">${metric('💷','Revenue',money(r.revenue))}${metric('🧾','Expenses',money(r.expenses))}${metric('🥤','Cups sold',r.served)}${metric('🙂','Customers',r.passed)}${metric('😍','Satisfaction',pct(r.satisfaction))}${metric('⭐','Reputation',`${r.repChange >= 0 ? '+' : ''}${r.repChange}`)}${metric('🚶','Customers lost',r.lostQueue + r.rejectedPrice + r.rejectedRecipe + r.stockouts)}</section>${levelUp ? `<section class="celebration-card"><div>✨🎉✨</div><h2>BUSINESS LEVEL ${levelUp.to}!</h2><p>Your lemonade business is growing.</p>${oldLocs.length ? `<div class="unlock-row">${oldLocs.map(l => `<span>${l.emoji} ${l.name}</span>`).join('')}</div>` : ''}</section>` : ''}${newly.length ? `<section class="achievement-unlock"><small>ACHIEVEMENT EARNED</small>${newly.map(a => `<div>${a.icon}<strong>${a.name}</strong></div>`).join('')}</section>` : ''}<button class="btn primary tall" data-action="view-insights">CONTINUE</button></main>`;
  }

  function compareYesterday(profit) {
    const prev = state.history.at(-2);
    if (!prev || !prev.profit) return 'Your first result is in!';
    const diff = ((profit - prev.profit) / Math.max(1, Math.abs(prev.profit))) * 100;
    return `${Math.abs(Math.round(diff))}% ${diff >= 0 ? 'better' : 'lower'} than yesterday`;
  }

  function insightsScreen() {
    const r = state.lastResult, insights = [];
    if (r.rejectedPrice > Math.max(2, r.served * .18)) insights.push(['💷','Your price was slightly high','Try 10–20p lower when foot traffic is average.']);
    else insights.push(['💷','Your price worked well','Customers were comfortable with today’s value.']);
    if (WEATHER[r.weather].traffic > 1) insights.push(['☀️','Weather boosted demand','Warm, bright conditions brought more customers.']);
    else insights.push(['☁️','Weather held demand back','A cheaper pitch or stronger advertising may help.']);
    if (r.rejectedRecipe > Math.max(2, r.served * .15)) insights.push(['🍋','Recipe needs adjustment',recipeFeedback(false).replace(/^[^ ]+ /,'') + '.']);
    else insights.push(['😋','Customers liked your recipe','Taste feedback was positive overall.']);
    if (r.stockouts || makeable() < 5) insights.push(['🥤','Stock limited your potential','Restock before the next busy period.']);
    else insights.push(['✅','Stock held up well','You had enough ingredients through the day.']);
    return `<main class="app-shell sub-page">${subHeader('Daily Insights','results')}<div class="screen-scroll no-nav"><section class="page-title"><span class="eyebrow">DAY ${r.day}</span><h2>What worked today</h2></section><div class="insights-list">${insights.map(i => `<section><span>${i[0]}</span><div><strong>${i[1]}</strong><p>${i[2]}</p></div></section>`).join('')}</div><button class="btn primary tall" data-action="plan-tomorrow">PLAN TOMORROW</button></div></main>`;
  }

  function advanceDay() {
    const waste = { lemons:0,sugar:0,ice:0,cups:0,water:0 };
    Object.entries(SUPPLIES).forEach(([id, d]) => {
      if (d.life === null) return;
      const life = id === 'ice' ? coolerLife() : d.life;
      state.inventory[id] = state.inventory[id].filter(b => {
        if (state.day + 1 - b.bought >= life) { waste[id] += b.qty; return false; }
        return true;
      });
    });
    const wasted = Object.values(waste).reduce((a,b) => a+b,0);
    state.stats.waste += wasted;
    if (state.lastResult) state.lastResult.waste = waste;
    state.day++;
    state.weather = rollWeather(); state.temperature = rollTemp(state.weather); state.event = pick(EVENTS);
    state.stage = 'planning'; state.pendingLevelUp = null; state.newAchievements = []; state.interruptedRefund = 0;
    save(); ui.screen = 'home'; render(); if (wasted) toast(`${wasted} perishable stock units expired overnight.`, 'warning');
  }

  function shopScreen() {
    return frame(`<section class="page-title"><h1>Upgrade Shop</h1><p>Invest today to earn more tomorrow.</p></section><div class="upgrade-list">${Object.entries(UPGRADES).map(([id,u]) => {
      const l = state.upgrades[id], maxed = l >= u.max, cost = maxed ? null : upgradeCost(id);
      return `<button class="upgrade-card" data-action="upgrade-details" data-id="${id}"><div class="upgrade-icon">${u.icon}</div><div class="upgrade-copy"><small>${u.category}</small><strong>${u.name}</strong><span>Level ${l} · ${u.benefit(l)}</span></div><div class="upgrade-price">${maxed ? statusBadge('MAX','success') : `<strong>${money(cost)}</strong><small>${state.cash >= cost ? 'Available' : 'Save more'}</small>`}</div><span>›</span></button>`;
    }).join('')}</div>`, 'shop');
  }

  function upgradeDetailsScreen() {
    const id = ui.selectedUpgrade, u = UPGRADES[id], l = state.upgrades[id], maxed = l >= u.max, cost = maxed ? 0 : upgradeCost(id);
    return `<main class="app-shell sub-page">${subHeader('Upgrade Details','shop')}<div class="screen-scroll no-nav"><section class="upgrade-hero"><span>${u.icon}</span><h2>${u.name}</h2><p>${maxed ? `Level ${l} · Maximum` : `Level ${l} → Level ${l+1}`}</p></section><section class="benefit-card"><small>BENEFIT</small><strong>${maxed ? u.benefit(l) : u.benefit(l+1)}</strong><p>Current: ${u.benefit(l)}</p></section>${!maxed ? `<section class="upgrade-cost"><span>UPGRADE COST</span><strong>${money(cost)}</strong><small>Cash available ${money(state.cash)}</small></section><button class="btn primary tall" data-action="buy-upgrade" data-id="${id}" ${state.cash < cost ? 'disabled' : ''}>UPGRADE</button>` : `<button class="btn ghost tall" data-nav="shop">MAXIMUM LEVEL REACHED</button>`}</div></main>`;
  }

  function statsScreen() {
    const s = state.stats; const avgSat = s.days ? s.satisfactionTotal / s.days : 0;
    return frame(`<section class="page-title"><h1>Statistics</h1><p>Your business at a glance.</p></section><div class="stats-grid">${metric('💷','Total revenue',money(s.revenue))}${metric('📈','Total profit',money(s.profit))}${metric('🥤','Cups sold',s.cups)}${metric('🏆','Best day',s.bestProfit === null ? '—' : money(s.bestProfit))}${metric('🙂','Customers',s.customers)}${metric('😍','Satisfaction',s.days ? pct(avgSat) : '—')}${metric('⭐','Reputation',`${state.reputation}`)}${metric('📅','Days trading',s.days)}</div><div class="stats-links"><button data-nav="profit">📈<span><strong>Profit History</strong><small>Daily performance chart</small></span>›</button><button data-nav="customers">🙂<span><strong>Customer Stats</strong><small>Feedback and loyalty</small></span>›</button><button data-nav="achievements">🏆<span><strong>Achievements</strong><small>${Object.keys(state.achievements).length} unlocked</small></span>›</button></div>`, 'stats');
  }

  function profitScreen() {
    const history = state.history.slice(-14);
    const max = Math.max(1, ...history.map(h => Math.abs(h.profit)));
    const avg = history.length ? history.reduce((s,h)=>s+h.profit,0)/history.length : 0;
    const best = history.length ? Math.max(...history.map(h=>h.profit)) : 0;
    const bars = history.length ? history.map(h => `<div class="bar-wrap" title="Day ${h.day}: ${money(h.profit)}"><i class="profit-bar ${h.profit < 0 ? 'loss' : ''}" style="height:${Math.max(6, Math.abs(h.profit)/max*100)}%"></i><small>${h.day}</small></div>`).join('') : '<p class="empty-state">Complete a day to build your profit chart.</p>';
    return `<main class="app-shell sub-page">${subHeader('Profit History','stats')}<div class="screen-scroll no-nav"><section class="chart-card"><div class="chart-head"><span>${history.length} days</span><strong>Profit by day</strong></div><div class="profit-chart">${bars}</div></section><div class="two-metrics">${metric('📊','Average profit',money(avg))}${metric('🏆','Best day',money(best))}</div><section class="tip-card"><span>📈</span><p>${profitTrend()}</p></section></div></main>`;
  }

  function profitTrend() {
    if (state.history.length < 2) return 'Keep trading to build a useful trend.';
    const h = state.history.slice(-7), first = h[0].profit, last = h.at(-1).profit;
    return `Profit has ${last >= first ? 'increased' : 'decreased'} by ${money(Math.abs(last-first))} across the recent period.`;
  }

  function customersScreen() {
    const s = state.stats, avg = s.days ? s.satisfactionTotal / s.days : 0;
    const mentionsTotal = Math.max(1, s.priceComplaints + s.recipeComplaints + s.cups);
    return `<main class="app-shell sub-page">${subHeader('Customer Stats','stats')}<div class="screen-scroll no-nav"><section class="customer-hero"><small>TOTAL CUSTOMERS</small><strong>${s.customers}</strong><span>${s.days ? pct(avg) : '—'} average satisfaction</span></section><div class="two-metrics customer-metrics">${metric('🔁','Repeat customers',s.repeatCustomers)}${metric('🚶','Customers lost',s.customersLost)}${metric('💷','Price complaints',s.priceComplaints)}${metric('🍋','Recipe complaints',s.recipeComplaints)}</div><section class="card"><h3>What people mention</h3>${mentionBar('Great taste', Math.round((s.cups-s.recipeComplaints)/mentionsTotal*100))}${mentionBar('Good value', Math.round((s.cups-s.priceComplaints)/mentionsTotal*100))}${mentionBar('Price concern', Math.round(s.priceComplaints/mentionsTotal*100))}${mentionBar('Recipe concern', Math.round(s.recipeComplaints/mentionsTotal*100))}</section></div></main>`;
  }
  function mentionBar(label, value) { return `<div class="mention"><div><span>${label}</span><strong>${clamp(value,0,100)}%</strong></div><i><b style="width:${clamp(value,0,100)}%"></b></i></div>`; }

  function achievementsScreen() {
    return `<main class="app-shell sub-page">${subHeader('Achievements','stats')}<div class="screen-scroll no-nav"><section class="page-title compact"><p>${Object.keys(state.achievements).length} / ${ACHIEVEMENTS.length} unlocked</p></section><div class="achievement-list">${ACHIEVEMENTS.map(a => {
      const unlocked = !!state.achievements[a.id]; const [v,max] = a.progress(state); const progress = unlocked ? 100 : clamp(v/max*100,0,100);
      return `<section class="achievement-card ${unlocked ? 'unlocked' : ''}"><div class="achievement-icon">${a.icon}</div><div><strong>${a.name}</strong><p>${a.desc}</p><i><b style="width:${progress}%"></b></i></div><span>${unlocked ? '✓' : progress ? `${Math.round(progress)}%` : '🔒'}</span></section>`;
    }).join('')}</div></div></main>`;
  }

  function profileScreen() {
    const xp = xpProgress();
    return frame(`<section class="business-profile"><div class="profile-stand"><div class="mini-stand level-${Math.min(5,state.level)}">🍋</div></div><h1>${state.businessName}</h1><p>Your lemonade business</p><span class="level-badge">BUSINESS LEVEL · ${state.level}</span><div class="xp-bar"><i style="width:${xp.value}%"></i></div><small>${xp.text}</small></section><div class="profile-stats">${metric('📅','Days trading',state.stats.days)}${metric('💷','Cash',money(state.cash))}${metric('📈','Lifetime profit',money(state.stats.profit))}${metric('⭐','Reputation',`${state.reputation}`)}</div><div class="business-actions"><button data-nav="plan">📋<span><strong>Plan Day</strong><small>Weather, location, recipe and price</small></span>›</button><button data-nav="inventory">📦<span><strong>Inventory</strong><small>${makeable()} cups possible</small></span>›</button><button data-nav="shop">⬆️<span><strong>Upgrades</strong><small>Improve your business</small></span>›</button></div>`, 'profile');
  }

  function settingsScreen() {
    return frame(`<section class="page-title"><h1>Settings</h1><p>Game Settings</p></section><div class="settings-list">${settingRow('sound','🔊','Sound effects')}${settingRow('music','🎵','Music')}${settingRow('animations','✨','Animations')}${settingRow('notifications','🔔','Notifications')}${settingRow('reducedMotion','👁️','Reduced motion','Accessibility')}</div><section class="settings-section"><h3>Game data</h3><button class="settings-button" data-nav="how">❓ <span>How to Play</span> ›</button><button class="settings-button" data-action="credits">🍋 <span>Credits</span> ›</button><button class="settings-button danger-line" data-action="reset-game">🗑️ <span>Reset Game</span> ›</button><button class="settings-button" data-action="main-menu">↩️ <span>Main Menu</span> ›</button></section>`, 'settings');
  }

  function settingRow(key, icon, label, kicker='') {
    const on = !!state.settings[key];
    return `<button class="setting-row" data-action="toggle-setting" data-key="${key}"><span>${icon}</span><div><strong>${label}</strong>${kicker ? `<small>${kicker}</small>` : ''}</div><i class="toggle ${on ? 'on' : ''}"><b></b></i><em>${on ? 'ON' : 'OFF'}</em></button>`;
  }

  function howScreen(inGame = true) {
    const steps = [
      ['🛒','1. Buy ingredients','Keep enough stock for the day.'],['🥤','2. Create your recipe','Balance sweet, sour and refreshing.'],['💷','3. Choose your price','Find the best margin customers accept.'],['📍','4. Pick a location','Match foot traffic to the weather.'],['▶️','5. Start the day','Watch sales and customer reactions.'],['💬','6. Learn from customers','Use feedback to improve tomorrow.'],['⬆️','7. Upgrade','Reinvest profit to grow faster.']
    ];
    const body = `<section class="tutorial-hero"><div>🍋</div><h2>Build a better stand every day</h2></section><div class="tutorial-list">${steps.map(s=>`<section><span>${s[0]}</span><div><strong>${s[1]}</strong><p>${s[2]}</p></div></section>`).join('')}</div>`;
    if (!inGame) return `<main class="standalone-screen tutorial-page">${subHeader('How to Play','menu')}<div class="screen-scroll no-nav">${body}<button class="btn primary tall" data-nav="menu">GOT IT</button></div></main>`;
    return `<main class="app-shell sub-page">${subHeader('How to Play','settings')}<div class="screen-scroll no-nav">${body}</div></main>`;
  }

  function standaloneSettingsScreen() {
    return `<main class="standalone-screen"><div class="sub-header standalone"><button class="icon-btn" data-nav="menu">←</button><h1>Settings</h1><div></div></div><section class="setup-card"><div class="setup-art">⚙️</div><h2>Game preferences</h2><p>Sound, music, animation and accessibility settings are stored inside each business save.</p><p class="muted-block">Start or continue a business to edit its settings.</p><button class="btn primary tall" data-nav="menu">BACK TO MENU</button></section></main>`;
  }

  function savedScreen() {
    const s = ui.savedSummary;
    return `<main class="standalone-screen saved-screen"><section class="saved-card"><div class="saved-check">✅</div><h1>Business Saved</h1><p>Your progress is stored on this device.</p><div class="saved-summary"><div><span>Business</span><strong>${s.businessName}</strong></div><div><span>Day</span><strong>${s.day}</strong></div><div><span>Cash</span><strong>${money(s.cash)}</strong></div><div><span>Level</span><strong>${s.level}</strong></div></div><button class="btn primary tall" data-action="continue">CONTINUE PLAYING</button><button class="btn ghost tall" data-nav="menu">RETURN TO MENU</button></section></main>`;
  }

  function pauseGame() {
    if (!sim) return;
    sim.paused = true;
    overlay(`<section class="modal-card pause-card"><div class="pause-icon">⏸️</div><h2>Game Paused</h2><button class="btn primary tall" data-action="resume">RESUME</button><button class="btn ghost tall" data-action="pause-settings">SETTINGS</button><button class="btn ghost tall" data-action="restart-day">RESTART DAY</button><button class="btn ghost tall" data-action="save-exit">SAVE & EXIT</button><button class="btn danger-btn tall" data-action="live-main-menu">MAIN MENU</button></section>`);
  }

  function pauseSettings() {
    overlay(`<section class="modal-card pause-card"><h2>Quick Settings</h2>${['sound','animations','reducedMotion'].map(k => `<button class="quick-setting" data-action="toggle-setting-live" data-key="${k}"><span>${k === 'sound' ? '🔊 Sound' : k === 'animations' ? '✨ Animations' : '👁️ Reduced motion'}</span><strong>${state.settings[k] ? 'ON' : 'OFF'}</strong></button>`).join('')}<button class="btn primary tall" data-action="back-pause">BACK</button></section>`);
  }

  function restorePreDayAndExit(showSaved = true) {
    if (ui.daySnapshot) state = deepClone(ui.daySnapshot);
    else { state.cash += Number(state.interruptedRefund || 0); state.interruptedRefund = 0; state.stage = 'planning'; }
    if (timer) clearTimeout(timer); timer = null; sim = null; clearOverlay(); state.stage = 'planning'; save();
    ui.savedSummary = { businessName: state.businessName, day: state.day, cash: state.cash, level: state.level };
    ui.daySnapshot = null; state = null; ui.screen = showSaved ? 'saved' : 'menu'; render();
  }

  function playSaleTone() {
    if (!state.settings.sound || typeof AudioContext === 'undefined' && typeof webkitAudioContext === 'undefined') return;
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext; const ctx = new Ctx(); const osc = ctx.createOscillator(); const gain = ctx.createGain();
      osc.frequency.value = 660; gain.gain.value = .025; osc.connect(gain); gain.connect(ctx.destination); osc.start(); osc.stop(ctx.currentTime + .06); osc.onended = () => ctx.close();
    } catch {}
  }

  function creditsModal() {
    overlay(`<section class="modal-card compact"><div class="modal-icon">🍋</div><h2>Lemonade Business Tycoon</h2><p>Original browser tycoon game. UI implementation follows the connected 40-page Canva mobile design system. All game artwork is browser-native CSS, emoji and original interface work.</p><button class="btn primary tall" data-action="close-overlay">CLOSE</button></section>`);
  }

  function render() {
    const app = $('#app'); if (!app) return;
    clearOverlay();
    if (ui.splash) { app.innerHTML = splashScreen(); return; }
    if (!state) {
      if (ui.screen === 'newgame') app.innerHTML = newGameScreen();
      else if (ui.screen === 'how') app.innerHTML = howScreen(false);
      else if (ui.screen === 'menusettings') app.innerHTML = standaloneSettingsScreen();
      else if (ui.screen === 'saved' && ui.savedSummary) app.innerHTML = savedScreen();
      else app.innerHTML = menuScreen();
      return;
    }
    if (state.stage === 'trading') { app.innerHTML = tradingScreen(); return; }
    if (state.stage === 'results' && ui.screen !== 'insights') { app.innerHTML = resultsScreen(); return; }
    const screens = {
      home: dashboardScreen, plan: planScreen, weather: weatherScreen, locations: locationsScreen,
      recipe: recipeScreen, price: priceScreen, inventory: inventoryScreen, supplies: suppliesScreen,
      confirm: confirmScreen, insights: insightsScreen, shop: shopScreen, upgrade: upgradeDetailsScreen,
      stats: statsScreen, profit: profitScreen, customers: customersScreen, achievements: achievementsScreen,
      profile: profileScreen, settings: settingsScreen, how: () => howScreen(true)
    };
    app.innerHTML = (screens[ui.screen] || dashboardScreen)();
  }

  function navigate(screen) {
    if (!state) {
      ui.screen = screen === 'menu' ? 'menu' : screen;
      render(); return;
    }
    if (state.stage === 'results' && screen !== 'insights') { ui.screen = 'results'; render(); return; }
    ui.screen = screen; render();
  }

  document.addEventListener('click', (e) => {
    const nav = e.target.closest('[data-nav]'); if (nav) { navigate(nav.dataset.nav); return; }
    const el = e.target.closest('[data-action]'); if (!el) return;
    const action = el.dataset.action;

    if (action === 'continue') {
      const s = load(); if (!s) { toast('No saved business found.', 'warning'); return; }
      const interrupted = saveRepairInterrupted(s); state = s; state = load(); ui.screen = state.stage === 'results' ? 'results' : 'home'; render(); if (interrupted) toast('Interrupted trading was safely returned to planning.', 'warning'); return;
    }
    if (action === 'new-game') { ui.screen = 'newgame'; render(); return; }
    if (action === 'menu-how') { ui.screen = 'how'; render(); return; }
    if (action === 'menu-settings') { ui.screen = 'menusettings'; render(); return; }
    if (action === 'create-business') {
      if (hasSave() && !window.confirm('Start a new business and replace the current local save?')) return;
      const input = $('#businessName'); state = newState(input?.value || 'Sunny Squeeze'); save(); ui.screen = 'home'; render(); toast('Business created! Buy stock and plan Day 1.', 'success'); return;
    }
    if (!state) return;

    if (action === 'recipe-step') { const k = el.dataset.key, d = Number(el.dataset.delta); state.recipe[k] = clamp(Number(state.recipe[k] || 0) + d, k === 'water' ? 1 : 0, 7); save(); render(); return; }
    if (action === 'price-step') { state.price = clamp(Math.round((state.price + Number(el.dataset.delta)) * 10) / 10, .5, 5); save(); render(); return; }
    if (action === 'choose-location') {
      const id = el.dataset.id; if (!locationUnlocked(id)) return;
      state.location = id; save(); render(); toast(`${LOCATIONS[id].name} selected.`, 'success'); return;
    }
    if (action === 'cart-step') { const k = el.dataset.key, d = Number(el.dataset.delta); ui.supplyCart[k] = clamp((ui.supplyCart[k] || 0) + d, 0, 20); render(); return; }
    if (action === 'buy-supplies') {
      const total = cartTotal(), units = cartUnits();
      if (total <= 0) return;
      if (state.cash < total) { toast('Insufficient funds.', 'warning'); return; }
      if (used() + units > cap()) { toast('Not enough storage space.', 'warning'); return; }
      Object.entries(ui.supplyCart).forEach(([id,count]) => { if (count) addBatch(id, SUPPLIES[id].pack * count); });
      state.cash -= total; state.stats.highestCash = Math.max(state.stats.highestCash, state.cash); ui.supplyCart = Object.fromEntries(Object.keys(SUPPLIES).map(k => [k,0])); save(); ui.screen = 'inventory'; render(); toast('✅ Purchase successful · Supplies added', 'success'); return;
    }
    if (action === 'open-confirm') { if (makeable() < 1) { toast('Buy stock first.', 'warning'); return; } ui.screen = 'confirm'; render(); return; }
    if (action === 'start-selling') { startSelling(); return; }
    if (action === 'speed') { ui.speed = Number(el.dataset.speed || 1); document.querySelectorAll('.speed-btn').forEach(b => b.classList.toggle('active', Number(b.dataset.speed) === ui.speed)); return; }
    if (action === 'pause') { pauseGame(); return; }
    if (action === 'resume') { clearOverlay(); if (sim) { sim.paused = false; scheduleTick(); } return; }
    if (action === 'back-pause') { pauseGame(); return; }
    if (action === 'pause-settings') { pauseSettings(); return; }
    if (action === 'toggle-setting-live') { const k = el.dataset.key; state.settings[k] = !state.settings[k]; save(); pauseSettings(); return; }
    if (action === 'restart-day') { if (ui.daySnapshot) { state = deepClone(ui.daySnapshot); if (timer) clearTimeout(timer); timer = null; sim = null; clearOverlay(); save(); ui.screen = 'confirm'; render(); toast('Day reset to the pre-selling state.', 'success'); } return; }
    if (action === 'save-exit') { restorePreDayAndExit(true); return; }
    if (action === 'live-main-menu') { restorePreDayAndExit(false); return; }
    if (action === 'view-insights') { ui.screen = 'insights'; render(); return; }
    if (action === 'plan-tomorrow') { advanceDay(); return; }
    if (action === 'upgrade-details') { ui.selectedUpgrade = el.dataset.id; ui.screen = 'upgrade'; render(); return; }
    if (action === 'buy-upgrade') {
      const id = el.dataset.id, u = UPGRADES[id], l = state.upgrades[id]; if (l >= u.max) return;
      const cost = upgradeCost(id); if (state.cash < cost) { toast('Insufficient funds.', 'warning'); return; }
      state.cash -= cost; state.upgrades[id]++; save(); render(); toast(`⬆️ ${u.name} upgraded to Level ${state.upgrades[id]}.`, 'success'); return;
    }
    if (action === 'toggle-setting') { const k = el.dataset.key; state.settings[k] = !state.settings[k]; save(); render(); return; }
    if (action === 'credits') { creditsModal(); return; }
    if (action === 'close-overlay') { clearOverlay(); if (sim?.paused) { sim.paused = false; scheduleTick(); } return; }
    if (action === 'reset-game') { showConfirm('Reset this business?', 'This permanently deletes the local save and all progression on this device.', 'RESET GAME', () => { localStorage.removeItem(SAVE_KEY); state = null; ui.screen = 'menu'; render(); toast('Game reset.', 'warning'); }); return; }
    if (action === 'main-menu') { save(); state = null; ui.screen = 'menu'; render(); return; }
  });

  document.addEventListener('change', (e) => {
    if (e.target?.id === 'priceRange' && state) {
      state.price = clamp(Number(e.target.value), .5, 5); save(); render();
    }
  });

  window.__LBT_TEST__ = {
    newState, migrate, levelFromXP, recipeCostPerCup: () => recipeCostPerCup(), recipeScore: () => recipeScore(), priceScore: () => priceScore(),
    makeable: () => makeable(), trafficBase: () => trafficBase(), getState: () => state, setState: (s) => { state = migrate(s); },
    evaluateAchievements: () => evaluateAchievements(), advanceDay: () => advanceDay()
  };

  render();
  setTimeout(() => { ui.splash = false; render(); }, 550);
})();
