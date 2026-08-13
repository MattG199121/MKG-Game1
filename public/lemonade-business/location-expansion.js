(() => {
  'use strict';

  const SAVE_KEY = 'lemon-stand-empire-v01';
  const DEV_VERSION = 1;
  const LOCATIONS = {
    neighbourhood: { name: 'Neighbourhood', emoji: '🏡', level: 1 },
    park:          { name: 'Park', emoji: '🌳', level: 2 },
    shopping:      { name: 'Shopping District', emoji: '🛍️', level: 3 },
    business:      { name: 'Business District', emoji: '🏢', level: 4 },
    beach:         { name: 'Beachfront', emoji: '🏖️', level: 5 },
    festival:      { name: 'Festival', emoji: '🎪', level: 7 }
  };
  const STAGES = [
    { name: 'Pop-Up Stand', days: 0, investment: 0, traffic: 0, icon: '🧺', desc: 'A basic pitch that still depends entirely on you.' },
    { name: 'Improved Stand', days: 2, investment: 60, traffic: .04, icon: '🪵', desc: 'A better-looking stand with growing local awareness.' },
    { name: 'Established Stand', days: 5, investment: 150, traffic: .08, icon: '🍋', desc: 'A recognisable local operation with repeat demand.' },
    { name: 'Semi-Permanent Operation', days: 10, investment: 350, traffic: .12, icon: '🏪', desc: 'A serious site with equipment and a dependable pitch.' },
    { name: 'Permanent Location', days: 15, investment: 750, traffic: .16, icon: '🏢', desc: 'A stable company location that can later be delegated.' }
  ];
  const PERMANENT_SATISFACTION = 70;

  let panel = null;
  let currentView = 'overview';
  let currentLocation = null;
  let observerQueued = false;

  const money = n => `£${Number(n || 0).toFixed(2)}`;
  const pct = n => `${Math.round(Number(n || 0))}%`;
  const clamp = (n,a,b) => Math.max(a, Math.min(b,n));

  function gameState() {
    try { return window.__LBT_TEST__?.getState?.() || null; }
    catch { return null; }
  }

  function persist(s) {
    if (!s) return;
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(s)); } catch {}
  }

  function defaultSite(id) {
    return {
      id,
      stage: 0,
      permanent: false,
      tradingDays: 0,
      attemptedDays: 0,
      investment: 0,
      revenue: 0,
      profit: 0,
      cups: 0,
      satisfactionTotal: 0,
      satisfactionDays: 0,
      lastDay: 0,
      lastProfit: 0,
      bestProfit: null,
      processed: {}
    };
  }

  function ensureDevelopment(s) {
    if (!s) return null;
    if (!s.locationDevelopment || typeof s.locationDevelopment !== 'object') {
      s.locationDevelopment = { version: DEV_VERSION, sites: {}, boosts: {}, unlocks: [], lastSyncAt: 0 };
    }
    s.locationDevelopment.version = DEV_VERSION;
    s.locationDevelopment.sites ||= {};
    s.locationDevelopment.boosts ||= {};
    s.locationDevelopment.unlocks ||= [];
    Object.keys(LOCATIONS).forEach(id => {
      if (!s.locationDevelopment.sites[id]) s.locationDevelopment.sites[id] = defaultSite(id);
      const site = s.locationDevelopment.sites[id];
      site.processed ||= {};
      site.stage = Number(site.stage || 0);
      site.tradingDays = Number(site.tradingDays || 0);
      site.attemptedDays = Number(site.attemptedDays || 0);
      site.investment = Number(site.investment || 0);
      site.revenue = Number(site.revenue || 0);
      site.profit = Number(site.profit || 0);
      site.cups = Number(site.cups || 0);
      site.satisfactionTotal = Number(site.satisfactionTotal || 0);
      site.satisfactionDays = Number(site.satisfactionDays || 0);
      site.permanent = !!site.permanent;
    });
    return s.locationDevelopment;
  }

  function averageSatisfaction(site) {
    return site.satisfactionDays ? site.satisfactionTotal / site.satisfactionDays : 0;
  }

  function qualifiedStage(site) {
    let q = 0;
    for (let i = 1; i < STAGES.length; i++) {
      const stage = STAGES[i];
      const qualityOK = i < 4 || averageSatisfaction(site) >= PERMANENT_SATISFACTION;
      if (site.tradingDays >= stage.days && site.investment >= stage.investment && qualityOK) q = i;
    }
    return q;
  }

  function recalculateStage(s, site, announce = true) {
    const before = Number(site.stage || 0);
    const after = Math.max(before, qualifiedStage(site));
    site.stage = after;
    site.permanent = after >= 4;
    if (announce && after > before) {
      s.locationDevelopment.unlocks.push({
        id: `${Date.now()}-${site.id}-${after}`,
        location: site.id,
        from: before,
        to: after,
        day: s.day
      });
    }
    return after > before;
  }

  function syncHistory(s) {
    if (!s) return false;
    ensureDevelopment(s);
    let changed = false;
    const history = Array.isArray(s.history) ? s.history : [];
    for (const r of history) {
      if (!r || !r.location || !LOCATIONS[r.location]) continue;
      const site = s.locationDevelopment.sites[r.location];
      const key = `${r.day}:${r.location}`;
      if (site.processed[key]) continue;
      site.processed[key] = true;
      site.attemptedDays++;
      if (Number(r.served || 0) > 0) site.tradingDays++;
      site.revenue += Number(r.revenue || 0);
      site.profit += Number(r.profit || 0);
      site.cups += Number(r.served || 0);
      site.satisfactionTotal += Number(r.satisfaction || 0);
      site.satisfactionDays++;
      site.lastDay = Math.max(site.lastDay, Number(r.day || 0));
      site.lastProfit = Number(r.profit || 0);
      site.bestProfit = site.bestProfit === null ? Number(r.profit || 0) : Math.max(site.bestProfit, Number(r.profit || 0));
      recalculateStage(s, site, true);
      changed = true;
    }
    if (changed) {
      s.locationDevelopment.lastSyncAt = Date.now();
      persist(s);
    }
    return changed;
  }

  function siteFor(s, id) {
    ensureDevelopment(s);
    return s.locationDevelopment.sites[id] || (s.locationDevelopment.sites[id] = defaultSite(id));
  }

  function stageProgress(site) {
    if (site.stage >= 4) return 100;
    const next = STAGES[site.stage + 1];
    const daysPart = next.days ? clamp(site.tradingDays / next.days, 0, 1) : 1;
    const moneyPart = next.investment ? clamp(site.investment / next.investment, 0, 1) : 1;
    const qualityPart = site.stage + 1 < 4 ? 1 : clamp(averageSatisfaction(site) / PERMANENT_SATISFACTION, 0, 1);
    return Math.round((daysPart * .4 + moneyPart * .4 + qualityPart * .2) * 100);
  }

  function nextRequirement(site) {
    if (site.stage >= 4) return null;
    return STAGES[site.stage + 1];
  }

  function applyDevelopmentBoost(s) {
    if (!s || !s.location || !s.event) return;
    ensureDevelopment(s);
    syncHistory(s);
    const site = siteFor(s, s.location);
    const bonus = STAGES[site.stage]?.traffic || 0;
    const key = `${s.day}:${s.location}`;
    if (s.locationDevelopment.boosts[key]) return;
    const base = Number(s.event.traffic || 1);
    s.event.traffic = base * (1 + bonus);
    s.locationDevelopment.boosts[key] = { base, bonus, stage: site.stage, at: Date.now() };
    persist(s);
  }

  function invest(s, id) {
    const site = siteFor(s, id);
    const next = nextRequirement(site);
    if (!next) return;
    const remaining = Math.max(0, next.investment - site.investment);
    if (remaining <= 0) return;
    const amount = Math.min(remaining, 100);
    if (Number(s.cash || 0) < amount) {
      showMiniToast(`You need ${money(amount)} available to invest.`, 'warning');
      return;
    }
    s.cash -= amount;
    site.investment += amount;
    const advanced = recalculateStage(s, site, true);
    persist(s);
    renderPanel(currentView, id);
    decorate();
    showMiniToast(advanced ? `✨ ${LOCATIONS[id].name} advanced to ${STAGES[site.stage].name}.` : `💷 ${money(amount)} invested in ${LOCATIONS[id].name}.`, 'success');
    showPendingUnlock(s);
  }

  function unlockedLocations(s) {
    return Object.keys(LOCATIONS).filter(id => Number(s.level || 1) >= LOCATIONS[id].level);
  }

  function locationHistory(s, id) {
    return (Array.isArray(s.history) ? s.history : []).filter(r => r?.location === id);
  }

  function stageBadge(site) {
    if (site.permanent) return `<span class="ld-badge permanent">PERMANENT</span>`;
    return `<span class="ld-badge">STAGE ${site.stage + 1}/5</span>`;
  }

  function headerHtml(s, title) {
    return `<header class="ld-header">
      <button class="ld-icon" data-ld-action="close" aria-label="Close">←</button>
      <div><small>${s.businessName || 'Lemonade Business'}</small><strong>${title}</strong></div>
      <span class="ld-cash">💷 ${money(s.cash)}</span>
    </header>`;
  }

  function overviewHtml(s, id) {
    const site = siteFor(s, id), loc = LOCATIONS[id], stage = STAGES[site.stage], next = nextRequirement(site);
    const avg = averageSatisfaction(site);
    return `${headerHtml(s, 'Location Development')}
      <div class="ld-scroll">
        <section class="ld-title"><span>LOCATION DEVELOPMENT</span><h1>${loc.emoji} ${loc.name}</h1><p>Build this pitch through real trading and investment until it becomes a permanent company location.</p></section>
        <section class="ld-hero">
          <small>CURRENT STAGE</small><h2>${stage.name}</h2><p>${stage.desc}</p>
          <div class="ld-progress"><i style="width:${stageProgress(site)}%"></i></div>
          <div class="ld-progress-meta"><span>${site.permanent ? 'Permanent company site' : `${stageProgress(site)}% to next milestone`}</span>${stageBadge(site)}</div>
        </section>
        <div class="ld-metrics">
          <article><small>Trading days</small><strong>${site.tradingDays}</strong></article>
          <article><small>Invested</small><strong>${money(site.investment)}</strong></article>
          <article><small>Lifetime profit</small><strong>${money(site.profit)}</strong></article>
          <article><small>Avg satisfaction</small><strong>${site.satisfactionDays ? pct(avg) : '—'}</strong></article>
        </div>
        ${next ? `<section class="ld-card">
          <div class="ld-card-head"><div><small>NEXT MILESTONE</small><h3>${next.name}</h3></div><span class="ld-cost">${money(Math.max(0,next.investment-site.investment))}</span></div>
          ${requirementLine('📅','Trading days',`${Math.min(site.tradingDays,next.days)} / ${next.days}`, site.tradingDays >= next.days)}
          ${requirementLine('💷','Total site investment',`${money(site.investment)} / ${money(next.investment)}`, site.investment >= next.investment)}
          ${site.stage + 1 === 4 ? requirementLine('🙂','Customer experience',`${site.satisfactionDays ? pct(avg) : '—'} / ${PERMANENT_SATISFACTION}%`, avg >= PERMANENT_SATISFACTION) : ''}
        </section>` : `<section class="ld-card ld-success"><div class="ld-big-icon">🏢</div><h3>Permanent Location</h3><p>This site is established in your company portfolio and is ready for the future Location Manager system.</p></section>`}
        <button class="ld-btn primary" data-ld-action="invest" data-location="${id}" ${next && next.investment > site.investment ? '' : 'disabled'}>${next ? `INVEST TOWARD ${next.name.toUpperCase()}` : 'PERMANENT LOCATION ESTABLISHED'}</button>
        <div class="ld-two-actions"><button class="ld-btn ghost" data-ld-view="path" data-location="${id}">VIEW UPGRADE PATH</button><button class="ld-btn ghost" data-ld-view="performance" data-location="${id}">PERFORMANCE</button></div>
      </div>`;
  }

  function requirementLine(icon, label, value, done) {
    return `<div class="ld-requirement"><span class="ld-req-icon">${icon}</span><div><strong>${label}</strong><small>${value}</small></div><b class="${done ? 'done' : ''}">${done ? '✓ READY' : 'NEEDED'}</b></div>`;
  }

  function pathHtml(s, id) {
    const site = siteFor(s,id), loc = LOCATIONS[id];
    return `${headerHtml(s, 'Stand Progress')}<div class="ld-scroll">
      <section class="ld-title"><span>${loc.emoji} ${loc.name.toUpperCase()}</span><h1>Your development path</h1><p>Each stage is earned through hands-on trading and reinvestment.</p></section>
      <section class="ld-card ld-stage-list">${STAGES.map((st,i) => {
        const done = i < site.stage || (i === site.stage && site.permanent);
        const current = i === site.stage && !site.permanent;
        return `<div class="ld-stage-row ${done ? 'done' : ''} ${current ? 'current' : ''}">
          <span class="ld-stage-dot">${done ? '✓' : i+1}</span>
          <div><strong>${st.name}</strong><small>${i===0 ? 'Starting point' : `${st.days} trading days · ${money(st.investment)} total investment${i===4 ? ` · ${PERMANENT_SATISFACTION}% satisfaction` : ''}`}</small></div>
          <span class="ld-stage-state">${done ? 'DONE' : current ? 'CURRENT' : 'LOCKED'}</span>
        </div>`;
      }).join('')}</section>
      <section class="ld-card"><h3>Local commercial bonus</h3><p>Your current ${STAGES[site.stage].name} gives <strong>+${Math.round(STAGES[site.stage].traffic*100)}% local foot traffic</strong> whenever you personally trade at this site.</p></section>
      <button class="ld-btn primary" data-ld-view="overview" data-location="${id}">BACK TO DEVELOPMENT</button>
    </div>`;
  }

  function performanceHtml(s,id) {
    const site = siteFor(s,id), loc=LOCATIONS[id], rows = locationHistory(s,id).slice(-14);
    const maxProfit = Math.max(1, ...rows.map(r => Math.max(0,Number(r.profit||0))));
    return `${headerHtml(s, 'Location Performance')}<div class="ld-scroll">
      <section class="ld-title"><span>${loc.emoji} ${loc.name.toUpperCase()}</span><h1>Performance</h1><p>Real results from the days you have personally traded at this location.</p></section>
      <div class="ld-metrics">
        <article><small>Revenue</small><strong>${money(site.revenue)}</strong></article>
        <article><small>Profit</small><strong>${money(site.profit)}</strong></article>
        <article><small>Cups sold</small><strong>${site.cups}</strong></article>
        <article><small>Best day</small><strong>${site.bestProfit === null ? '—' : money(site.bestProfit)}</strong></article>
      </div>
      <section class="ld-card"><h3>Recent profit</h3>${rows.length ? `<div class="ld-chart">${rows.map(r => `<i style="height:${clamp((Math.max(0,Number(r.profit||0))/maxProfit)*100,8,100)}%" title="Day ${r.day}: ${money(r.profit)}"></i>`).join('')}</div><div class="ld-chart-labels"><span>Older</span><span>Latest</span></div>` : '<p>Complete a day here to start building a location history.</p>'}</section>
      <section class="ld-card"><h3>Development read</h3><p>${commercialRead(site)}</p></section>
      <button class="ld-btn primary" data-ld-view="overview" data-location="${id}">DEVELOP THIS LOCATION</button>
    </div>`;
  }

  function commercialRead(site) {
    if (!site.tradingDays) return 'This site has not traded successfully yet. Run a real business day here to begin development.';
    const avg = averageSatisfaction(site);
    if (avg < 55) return 'Customer experience is holding this location back. Improve recipe, price or service before making a permanent commitment.';
    if (site.profit < 0) return 'The site is losing money overall. Review pitch cost, price and weather before investing heavily.';
    if (site.stage >= 4) return 'This is now a stable permanent company location. The next strategic step is appointing a suitable Location Manager.';
    if (stageProgress(site) >= 80) return 'This site is close to its next development milestone. A little more trading or investment should move it forward.';
    return 'The site is developing steadily. Keep balancing weather, price, recipe and stock while building its trading record.';
  }

  function portfolioHtml(s) {
    const ids = unlockedLocations(s);
    return `${headerHtml(s,'My Locations')}<div class="ld-scroll">
      <section class="ld-title"><span>LOCATION PORTFOLIO</span><h1>Build your first permanent site</h1><p>Unlocked pitches become development opportunities. Permanent sites stay in your company portfolio when you move on.</p></section>
      <div class="ld-portfolio">${ids.map(id => {
        const site=siteFor(s,id), loc=LOCATIONS[id];
        return `<button class="ld-site-card" data-ld-view="overview" data-location="${id}">
          <span class="ld-site-emoji">${loc.emoji}</span><div><strong>${loc.name}</strong><small>${STAGES[site.stage].name} · ${site.tradingDays} trading days</small><div class="ld-mini-progress"><i style="width:${stageProgress(site)}%"></i></div></div>${stageBadge(site)}
        </button>`;
      }).join('')}</div>
      <section class="ld-card"><div class="ld-card-head"><div><small>REGIONAL PROGRESSION</small><h3>Permanent locations</h3></div><span class="ld-cost">${ids.filter(id=>siteFor(s,id).permanent).length} / 5</span></div><p>Regional Management will unlock in a later phase once five permanent locations exist in one region.</p></section>
    </div>`;
  }

  function unlockHtml(s, unlock) {
    const site = siteFor(s,unlock.location), loc=LOCATIONS[unlock.location], stage=STAGES[unlock.to];
    if (unlock.to >= 4) {
      return `<div class="ld-unlock-card"><div class="ld-confetti">✨ 🎉 ✨</div><div class="ld-unlock-circle">${loc.emoji}</div><h2>PERMANENT LOCATION!</h2><p>${loc.name} is now an established company site.</p><div class="ld-unlock-list"><span>🏢 Stable company location</span><span>📈 +${Math.round(stage.traffic*100)}% local foot traffic</span><span>👤 Eligible for a Location Manager next</span></div><button class="ld-btn primary" data-ld-action="dismiss-unlock" data-unlock="${unlock.id}" data-location="${unlock.location}">VIEW LOCATION</button></div>`;
    }
    return `<div class="ld-unlock-card"><div class="ld-confetti">✨</div><div class="ld-unlock-circle">${stage.icon}</div><h2>${stage.name.toUpperCase()}</h2><p>${loc.name} has reached development Stage ${unlock.to + 1}.</p><div class="ld-unlock-list"><span>🚶 +${Math.round(stage.traffic*100)}% local foot traffic</span><span>💷 ${money(site.investment)} invested</span><span>📅 ${site.tradingDays} successful trading days</span></div><button class="ld-btn primary" data-ld-action="dismiss-unlock" data-unlock="${unlock.id}" data-location="${unlock.location}">CONTINUE</button></div>`;
  }

  function renderPanel(view = 'overview', id = null) {
    const s = gameState();
    if (!s) return;
    ensureDevelopment(s);
    syncHistory(s);
    currentView = view;
    currentLocation = id || s.location || 'neighbourhood';
    if (!panel) {
      panel = document.createElement('div');
      panel.id = 'location-development-root';
      document.body.appendChild(panel);
    }
    let html = '';
    if (view === 'portfolio') html = portfolioHtml(s);
    else if (view === 'path') html = pathHtml(s,currentLocation);
    else if (view === 'performance') html = performanceHtml(s,currentLocation);
    else html = overviewHtml(s,currentLocation);
    panel.innerHTML = `<main class="ld-shell">${html}</main>`;
    panel.classList.add('open');
  }

  function closePanel() {
    if (panel) panel.classList.remove('open');
  }

  function showPendingUnlock(s) {
    ensureDevelopment(s);
    const unlock = s.locationDevelopment.unlocks.find(u => !u.seen);
    if (!unlock) return;
    let root = document.getElementById('location-development-unlock-root');
    if (!root) {
      root = document.createElement('div');
      root.id = 'location-development-unlock-root';
      document.body.appendChild(root);
    }
    root.innerHTML = `<div class="ld-unlock-backdrop">${unlockHtml(s,unlock)}</div>`;
  }

  function dismissUnlock(s, unlockId, location) {
    const unlock = s.locationDevelopment.unlocks.find(u=>u.id===unlockId);
    if (unlock) unlock.seen = true;
    persist(s);
    document.getElementById('location-development-unlock-root')?.remove();
    renderPanel('overview',location);
  }

  function showMiniToast(message, tone='default') {
    const existing = document.querySelector('.ld-toast');
    if (existing) existing.remove();
    const el = document.createElement('div');
    el.className = `ld-toast ${tone}`;
    el.textContent = message;
    document.body.appendChild(el);
    requestAnimationFrame(()=>el.classList.add('show'));
    setTimeout(()=>{ el.classList.remove('show'); setTimeout(()=>el.remove(),220); },2200);
  }

  function decorateDashboard(s) {
    const grid = document.querySelector('.dashboard-grid');
    if (!grid || grid.querySelector('[data-ld-entry="portfolio"]')) return;
    const dev = ensureDevelopment(s), permanent = Object.values(dev.sites).filter(x=>x.permanent).length;
    const site = siteFor(s,s.location), loc=LOCATIONS[s.location] || LOCATIONS.neighbourhood;
    const btn = document.createElement('button');
    btn.className = 'dashboard-card ld-dashboard-card';
    btn.dataset.ldEntry = 'portfolio';
    btn.innerHTML = `<span class="big-emoji">${permanent ? '🏢' : '📍'}</span><div><strong>${permanent ? 'My Locations' : 'Develop location'}</strong><small>${loc.name} · ${STAGES[site.stage].name}${permanent ? ` · ${permanent} permanent` : ''}</small></div><span>›</span>`;
    grid.appendChild(btn);
  }

  function decorateLocations(s) {
    document.querySelectorAll('.location-card[data-id]').forEach(card => {
      const id = card.dataset.id;
      if (!LOCATIONS[id] || card.querySelector('.ld-location-chip')) return;
      const site = siteFor(s,id);
      const chip = document.createElement('span');
      chip.className = `ld-location-chip ${site.permanent ? 'permanent' : ''}`;
      chip.dataset.ldEntry = 'site';
      chip.dataset.location = id;
      chip.setAttribute('role','button');
      chip.setAttribute('tabindex','0');
      chip.textContent = site.permanent ? '🏢 PERMANENT' : `${STAGES[site.stage].name.toUpperCase()} · ${stageProgress(site)}%`;
      card.appendChild(chip);
    });
  }

  function decorateConfirm(s) {
    const summary = document.querySelector('.summary-card');
    if (!summary || summary.querySelector('.ld-confirm-site')) return;
    const site = siteFor(s,s.location);
    const line = document.createElement('div');
    line.className = 'summary-line ld-confirm-site';
    line.innerHTML = `<span>📈</span><div><strong>${STAGES[site.stage].name}</strong><small>Local site development: +${Math.round(STAGES[site.stage].traffic*100)}% foot traffic today</small></div>`;
    summary.appendChild(line);
  }

  function decorateResults(s) {
    const shell = document.querySelector('.results-shell');
    if (!shell || shell.querySelector('.ld-result-card')) return;
    syncHistory(s);
    const id = s.lastResult?.location || s.location;
    const site = siteFor(s,id), loc=LOCATIONS[id] || LOCATIONS.neighbourhood;
    const card = document.createElement('section');
    card.className = 'ld-result-card';
    card.innerHTML = `<div><small>LOCATION DEVELOPMENT</small><strong>${loc.emoji} ${STAGES[site.stage].name}</strong><span>${site.tradingDays} successful days · ${stageProgress(site)}% progress</span></div><button data-ld-view="overview" data-location="${id}">VIEW</button>`;
    const target = shell.querySelector('.profit-result') || shell.firstElementChild;
    target.insertAdjacentElement('afterend',card);
  }

  function decorate() {
    const s = gameState();
    if (!s) return;
    ensureDevelopment(s);
    const historyChanged = syncHistory(s);
    if (historyChanged) showPendingUnlock(s);
    decorateDashboard(s);
    decorateLocations(s);
    decorateConfirm(s);
    decorateResults(s);
  }

  document.addEventListener('click', e => {
    const start = e.target.closest('[data-action="start-selling"]');
    if (start) {
      const s = gameState();
      if (s) applyDevelopmentBoost(s);
      return;
    }

    const entry = e.target.closest('[data-ld-entry]');
    if (entry) {
      e.preventDefault();
      e.stopPropagation();
      const s = gameState(); if (!s) return;
      if (entry.dataset.ldEntry === 'portfolio') renderPanel('portfolio');
      else renderPanel('overview', entry.dataset.location || s.location);
      return;
    }

    const view = e.target.closest('[data-ld-view]');
    if (view) {
      e.preventDefault();
      e.stopPropagation();
      renderPanel(view.dataset.ldView, view.dataset.location || currentLocation);
      return;
    }

    const action = e.target.closest('[data-ld-action]');
    if (!action) return;
    e.preventDefault();
    e.stopPropagation();
    const s = gameState(); if (!s) return;
    if (action.dataset.ldAction === 'close') closePanel();
    if (action.dataset.ldAction === 'invest') invest(s, action.dataset.location || currentLocation);
    if (action.dataset.ldAction === 'dismiss-unlock') dismissUnlock(s,action.dataset.unlock,action.dataset.location);
  }, true);

  document.addEventListener('keydown', e => {
    const chip = e.target.closest?.('.ld-location-chip');
    if (chip && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      renderPanel('overview',chip.dataset.location);
    }
  });

  const observer = new MutationObserver(() => {
    if (observerQueued) return;
    observerQueued = true;
    requestAnimationFrame(() => {
      observerQueued = false;
      decorate();
    });
  });

  observer.observe(document.documentElement,{childList:true,subtree:true});
  setTimeout(decorate,700);

  window.__LBT_LOCATION_DEV_TEST__ = {
    stages: STAGES,
    ensureDevelopment,
    qualifiedStage,
    stageProgress,
    syncHistory,
    averageSatisfaction,
    applyDevelopmentBoost
  };
})();