(() => {
'use strict';

const SAVE_KEY = 'lemon-stand-empire-v01';
const CUSTOMER_IDS = Array.from({length: 24}, (_, i) => `customer_${String(i + 1).padStart(3, '0')}`);
const LOCATION_MANAGER_IDS = Array.from({length: 14}, (_, i) => `locmgr_${String(i + 1).padStart(3, '0')}`);
const REGIONAL_MANAGER_IDS = Array.from({length: 10}, (_, i) => `regmgr_${String(i + 1).padStart(3, '0')}`);
const HQ_IDS = Array.from({length: 12}, (_, i) => `hq_${String(i + 1).padStart(3, '0')}`);
const WORKER_IDS = Array.from({length: 16}, (_, i) => `worker_${String(i + 1).padStart(3, '0')}`);

const SKINS = ['#F7D7C4','#E8B996','#C9835E','#9A5C3F','#6E412F','#4A2D22'];
const HAIRS = ['#2B1D19','#5B3522','#8B4A2D','#C97A39','#E0B56A','#D8D3CD'];
const SHIRTS = ['#FFD84D','#2EA85C','#70C7FF','#FF9F43','#355FA8','#7D4AC7','#E95C76','#1B7A75'];
const PANTS = ['#233047','#304358','#37634B','#53483D','#2C2C34','#5E3A62'];
const ACCENTS = ['#2EA85C','#FFD84D','#70C7FF','#FF9F43','#FFFFFF','#1B345A'];

const ARCHETYPE_BY_ICON = {
  '💼':'office','🎓':'student','👨‍👧':'parent','🏃':'runner',
  '📷':'tourist','🧓':'senior','👪':'family','🛍️':'shopper'
};
const ARCHETYPE_LABELS = {
  office:'Office worker',student:'Student',parent:'Parent',runner:'Runner',
  tourist:'Tourist',senior:'Older customer',family:'Family visitor',shopper:'Shopper',
  local:'Local customer',commuter:'Commuter',cyclist:'Cyclist',festival:'Festival visitor'
};
const ARCHETYPE_POOLS = {
  office:[0,4,8,12,16,20],
  student:[1,5,9,13,17,21],
  parent:[2,6,10,14,18,22],
  runner:[3,7,11,15,19,23],
  tourist:[5,10,15,20,1,6],
  senior:[4,9,14,19,0,23],
  family:[2,7,12,17,22,3],
  shopper:[6,11,16,21,1,18]
};

let recentCustomers = [];
let observer = null;
let saveTimer = null;

const hash = value => {
  const s = String(value || '');
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};
const escapeAttr = value => String(value || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

function currentState() {
  try { return window.__LBT_TEST__?.getState?.() || null; } catch { return null; }
}
function persistStateSoon() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    const s = currentState();
    if (!s) return;
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(s)); } catch {}
  }, 80);
}
function poolForRole(role) {
  if (role === 'regionalManager') return REGIONAL_MANAGER_IDS;
  if (role === 'departmentHead' || role === 'hq') return HQ_IDS;
  if (role === 'worker') return WORKER_IDS;
  return LOCATION_MANAGER_IDS;
}
function stableAvatarId(person, role) {
  const pool = poolForRole(role);
  if (person?.avatarId && pool.includes(person.avatarId)) return person.avatarId;
  const seed = person?.id || person?.name || `${role}-${Math.random()}`;
  const id = pool[hash(seed) % pool.length];
  if (person && typeof person === 'object') {
    person.avatarId = id;
    persistStateSoon();
  }
  return id;
}
function ensureSavedAvatarIds() {
  const s = currentState();
  if (!s) return;
  let dirty = false;
  const set = (person, role) => {
    if (!person || person.avatarId) return;
    const pool = poolForRole(role);
    person.avatarId = pool[hash(person.id || person.name || role) % pool.length];
    dirty = true;
  };
  (s.peopleExpansion?.candidates || []).forEach(p => set(p, 'locationManager'));
  (s.peopleExpansion?.managers || []).forEach(p => set(p, p.role || 'locationManager'));
  (s.regionExpansion?.externalCandidates || []).forEach(p => set(p, 'regionalManager'));
  (s.hqExpansion?.candidates || []).forEach(p => set(p, 'hq'));
  Object.values(s.hqExpansion?.heads || {}).forEach(p => set(p, 'departmentHead'));
  if (dirty) persistStateSoon();
}

function customerAvatarId(archetype, domId) {
  const pool = ARCHETYPE_POOLS[archetype] || [0,1,2,3,4,5];
  const start = hash(`${domId}:${archetype}`) % pool.length;
  let chosen = CUSTOMER_IDS[pool[start] % CUSTOMER_IDS.length];
  for (let i = 0; i < pool.length; i++) {
    const candidate = CUSTOMER_IDS[pool[(start + i) % pool.length] % CUSTOMER_IDS.length];
    if (!recentCustomers.includes(candidate)) { chosen = candidate; break; }
  }
  recentCustomers.push(chosen);
  if (recentCustomers.length > 7) recentCustomers.shift();
  return chosen;
}

function metaFor(id, role='customer', archetype='local') {
  const n = hash(id);
  const senior = archetype === 'senior';
  const skin = SKINS[n % SKINS.length];
  const hair = senior && n % 2 ? '#D8D3CD' : HAIRS[(n >>> 3) % HAIRS.length];
  let shirt = SHIRTS[(n >>> 6) % SHIRTS.length];
  let accent = ACCENTS[(n >>> 9) % ACCENTS.length];
  if (role === 'locationManager') { shirt = (n % 2) ? '#2EA85C' : '#355FA8'; accent = '#FFD84D'; }
  if (role === 'regionalManager') { shirt = (n % 2) ? '#263A67' : '#2E6B4F'; accent = '#FFD84D'; }
  if (role === 'departmentHead' || role === 'hq') { shirt = (n % 2) ? '#334E7A' : '#4C3D75'; accent = '#FFD84D'; }
  if (role === 'worker') { shirt = (n % 2) ? '#FFD84D' : '#2EA85C'; accent = '#355FA8'; }
  return {
    skin, hair, shirt, accent,
    pants: PANTS[(n >>> 12) % PANTS.length],
    hairStyle: (n >>> 15) % 6,
    glasses: ((n >>> 20) % 5) === 0 || archetype === 'senior',
    freckles: ((n >>> 22) % 4) === 0,
    role, archetype
  };
}

function hairSvg(m) {
  const c = m.hair;
  switch (m.hairStyle) {
    case 0: return `<path d="M20 30c0-15 8-24 17-24s17 9 17 24c-4-8-8-11-17-11s-13 3-17 11Z" fill="${c}"/>`;
    case 1: return `<path d="M17 32C17 13 26 5 37 5s21 9 20 29c-5-9-8-13-20-13S23 24 17 32Z" fill="${c}"/><path d="M53 22c8 10 8 29 1 39l-6-4c5-12 4-23-1-32Z" fill="${c}"/>`;
    case 2: return `<path d="M18 31C18 14 27 7 37 7c11 0 18 8 18 23-7-6-12-9-19-9-8 0-13 3-18 10Z" fill="${c}"/><circle cx="20" cy="15" r="6" fill="${c}"/><circle cx="28" cy="10" r="7" fill="${c}"/><circle cx="38" cy="9" r="7" fill="${c}"/><circle cx="48" cy="13" r="7" fill="${c}"/>`;
    case 3: return `<path d="M17 30C19 13 27 5 38 6c12 1 18 10 17 25-8-7-12-10-19-10-8 0-13 3-19 9Z" fill="${c}"/><path d="M22 18 15 11M29 13 24 4M39 12 39 2M49 15 56 7" stroke="${c}" stroke-width="5" stroke-linecap="round"/>`;
    case 4: return `<path d="M18 31C18 13 27 5 38 5c10 0 18 7 18 20-6-4-11-6-17-6-10 0-15 5-21 12Z" fill="${c}"/><path d="M20 24c-5 10-5 25 0 34M54 22c6 11 6 26 0 37" stroke="${c}" stroke-width="7" stroke-linecap="round"/>`;
    default:return `<path d="M18 31C19 14 27 6 38 6c11 0 18 8 18 23-8-6-13-8-20-8s-12 3-18 10Z" fill="${c}"/><path d="M19 15c8 4 18 5 36 0" stroke="${c}" stroke-width="5" stroke-linecap="round"/>`;
  }
}

function accessorySvg(m, portrait=false) {
  const y = portrait ? 55 : 57;
  if (m.role === 'locationManager' || m.role === 'worker')
    return `<circle cx="51" cy="${y}" r="4.2" fill="#FFD84D"/><path d="M49 ${y}c3-5 6-3 5 1-1 4-5 5-7 2Z" fill="#2EA85C"/>`;
  if (m.role === 'regionalManager' || m.role === 'departmentHead' || m.role === 'hq')
    return `<path d="M36 54l5 8-5 14-5-14Z" fill="${m.accent}"/><circle cx="53" cy="${y}" r="3.8" fill="#FFD84D"/>`;
  if (m.archetype === 'office') return `<path d="M36 54l4 7-4 12-4-12Z" fill="#244E91"/>`;
  if (m.archetype === 'student') return `<path d="M18 40c-5 5-5 15-2 21M54 40c5 5 5 15 2 21" stroke="#2D3B57" stroke-width="3" fill="none"/><circle cx="16" cy="38" r="5" fill="#2D3B57"/><circle cx="56" cy="38" r="5" fill="#2D3B57"/>`;
  if (m.archetype === 'runner') return `<path d="M22 18h28" stroke="#FFD84D" stroke-width="4"/><rect x="18" y="55" width="36" height="4" rx="2" fill="#FFFFFF99"/>`;
  if (m.archetype === 'tourist') return `<rect x="27" y="62" width="19" height="12" rx="3" fill="#34495E"/><circle cx="36.5" cy="68" r="4" fill="#70C7FF"/><path d="M22 29h29" stroke="#8B5B2B" stroke-width="3"/>`;
  if (m.archetype === 'shopper') return `<path d="M54 63v16h10V63M56 64c0-5 6-5 6 0" stroke="#FF9F43" stroke-width="3" fill="#FFDDAF"/>`;
  if (m.archetype === 'parent' || m.archetype === 'family') return `<circle cx="52" cy="${y}" r="4" fill="#FFD84D"/><path d="M50 ${y}c3-4 5-2 5 1-1 3-4 4-6 2Z" fill="#2EA85C"/>`;
  return '';
}

function characterSvg(id, role='customer', archetype='local', portrait=false) {
  const m = metaFor(id, role, archetype);
  const label = escapeAttr(role === 'customer' ? ARCHETYPE_LABELS[archetype] || 'Customer' : 'Employee');
  const view = portrait ? '0 0 72 76' : '0 0 72 112';
  return `<svg class="lbt-character-svg ${portrait ? 'portrait' : 'full'}" viewBox="${view}" aria-label="${label}" role="img">
    ${portrait ? '' : '<ellipse cx="36" cy="107" rx="19" ry="4" fill="#00000024"/>'}
    ${portrait ? '' : `<g class="lbt-leg lbt-leg-left"><rect x="25" y="77" width="8" height="24" rx="4" fill="${m.pants}"/><rect x="22" y="98" width="12" height="7" rx="3" fill="#27313A"/></g>
    <g class="lbt-leg lbt-leg-right"><rect x="39" y="77" width="8" height="24" rx="4" fill="${m.pants}"/><rect x="39" y="98" width="12" height="7" rx="3" fill="#27313A"/></g>`}
    <g class="lbt-arm lbt-arm-left"><rect x="13" y="52" width="9" height="29" rx="5" fill="${m.skin}" transform="rotate(7 18 53)"/></g>
    <g class="lbt-arm lbt-arm-right"><rect x="50" y="52" width="9" height="29" rx="5" fill="${m.skin}" transform="rotate(-7 54 53)"/></g>
    <path d="M19 51c3-9 10-14 17-14s15 5 18 14l-3 32H21Z" fill="${m.shirt}"/>
    <path d="M26 49c5 4 15 4 20 0" stroke="${m.accent}" stroke-width="3" stroke-linecap="round" opacity=".8"/>
    <circle cx="36" cy="29" r="17" fill="${m.skin}"/>
    <circle cx="20" cy="30" r="3.8" fill="${m.skin}"/><circle cx="52" cy="30" r="3.8" fill="${m.skin}"/>
    ${hairSvg(m)}
    <circle cx="30" cy="30" r="1.7" fill="#25302B"/><circle cx="42" cy="30" r="1.7" fill="#25302B"/>
    ${m.glasses ? '<circle cx="30" cy="30" r="5" fill="none" stroke="#31424D" stroke-width="1.7"/><circle cx="42" cy="30" r="5" fill="none" stroke="#31424D" stroke-width="1.7"/><path d="M35 30h2" stroke="#31424D" stroke-width="1.5"/>' : ''}
    ${m.freckles ? '<circle cx="27" cy="35" r=".7" fill="#A96851"/><circle cx="30" cy="36" r=".7" fill="#A96851"/><circle cx="45" cy="35" r=".7" fill="#A96851"/>' : ''}
    <path d="M31 38c3 3 7 3 10 0" fill="none" stroke="#8E4A45" stroke-width="1.8" stroke-linecap="round"/>
    ${accessorySvg(m, portrait)}
  </svg>`;
}

function roleForPerson(person) {
  if (!person) return 'locationManager';
  if (person.role === 'regionalManager') return 'regionalManager';
  if (person.role === 'departmentHead') return 'departmentHead';
  return 'locationManager';
}

function lookupPersonFromElement(el) {
  const s = currentState();
  if (!s) return null;
  const host = el.closest('[data-manager],[data-candidate],[data-hq-view]');
  const managerId = host?.dataset.manager;
  const candidateId = host?.dataset.candidate;
  if (managerId) return (s.peopleExpansion?.managers || []).find(p => p.id === managerId) || null;
  if (candidateId) {
    return (s.peopleExpansion?.candidates || []).find(p => p.id === candidateId)
      || (s.regionExpansion?.externalCandidates || []).find(p => p.id === candidateId)
      || (s.hqExpansion?.candidates || []).find(p => p.id === candidateId)
      || Object.values(s.hqExpansion?.heads || {}).find(p => p.id === candidateId)
      || (s.peopleExpansion?.managers || []).find(p => p.id === candidateId)
      || null;
  }
  const name = el.parentElement?.querySelector('strong')?.textContent?.trim();
  if (!name) return null;
  return (s.peopleExpansion?.managers || []).find(p => p.name === name)
    || (s.peopleExpansion?.candidates || []).find(p => p.name === name)
    || Object.values(s.hqExpansion?.heads || {}).find(p => p.name === name)
    || (s.hqExpansion?.candidates || []).find(p => p.name === name)
    || null;
}

function upgradePortrait(el) {
  if (!el || el.dataset.characterReady === '1') return;
  const person = lookupPersonFromElement(el);
  if (!person) return;
  const role = roleForPerson(person);
  const id = stableAvatarId(person, role);
  el.dataset.characterReady = '1';
  el.classList.add('lbt-avatar-portrait');
  el.innerHTML = characterSvg(id, role, 'local', true);
  el.setAttribute('aria-label', `${person.name} avatar`);
}

function archetypeFromCustomer(el) {
  const icon = el.textContent?.trim();
  return ARCHETYPE_BY_ICON[icon] || 'local';
}
function arrangeQueue(area) {
  if (!area) return;
  const queued = [...area.querySelectorAll('.customer.lbt-queued:not(.lbt-exiting):not(.lbt-served)')];
  queued.forEach((c, i) => {
    const row = Math.floor(i / 5);
    const col = i % 5;
    c.style.left = `${Math.max(10, area.clientWidth - 214 - col * 48)}px`;
    c.style.bottom = `${62 + row * 28}px`;
    c.style.zIndex = String(7 + row);
  });
}
function setCustomerMood(customer, text) {
  if (!customer) return;
  const value = String(text || '');
  customer.classList.remove('lbt-happy','lbt-unhappy','lbt-stockout','lbt-impatient');
  if (/Perfect|Great lemonade|Love it|Nice lemonade|Perfect for today/i.test(value)) {
    customer.classList.add('lbt-happy','lbt-served');
    customer.classList.remove('lbt-queued');
    const area = customer.closest('#simArea');
    setTimeout(() => {
      if (!customer.isConnected || !area) return;
      customer.classList.add('lbt-exiting','lbt-walking');
      customer.style.left = `${area.clientWidth + 72}px`;
    }, 180);
  } else if (/Sold out/i.test(value)) {
    customer.classList.add('lbt-stockout','lbt-unhappy');
    customer.classList.remove('lbt-queued');
    setTimeout(() => {
      if (!customer.isConnected) return;
      customer.classList.add('lbt-exiting','lbt-walking');
      customer.style.left = '-78px';
    }, 90);
  } else if (/Waited too long|Queue too long/i.test(value)) {
    customer.classList.add('lbt-impatient','lbt-unhappy');
    customer.classList.remove('lbt-queued');
    setTimeout(() => {
      if (!customer.isConnected) return;
      customer.classList.add('lbt-exiting','lbt-walking');
      customer.style.left = '-78px';
    }, 90);
  } else if (/Too expensive|Too sweet|Too sour|Needs more sugar|Not cold enough|Too icy|Too weak|Not quite/i.test(value)) {
    customer.classList.add('lbt-unhappy');
  }
  arrangeQueue(customer.closest('#simArea'));
}
function upgradeThought(thought) {
  if (!thought) return;
  const area = thought.closest('#simArea');
  const id = thought.dataset.for || '';
  const customer = area?.querySelector(`.customer[data-id="${id}"]`);
  if (customer) setCustomerMood(customer, thought.textContent);
}
function upgradeCustomer(el) {
  if (!el || el.dataset.characterReady === '1') return;
  const archetype = archetypeFromCustomer(el);
  const id = customerAvatarId(archetype, el.dataset.id || Date.now());
  el.dataset.characterReady = '1';
  el.dataset.avatarId = id;
  el.dataset.archetype = archetype;
  el.classList.add('lbt-customer-character','lbt-walking');
  el.setAttribute('aria-label', ARCHETYPE_LABELS[archetype] || 'Customer');
  const depth = hash(`${id}:${el.dataset.id}`) % 3;
  el.style.bottom = `${62 + depth * 4}px`;
  el.style.zIndex = String(6 + depth);
  el.innerHTML = `<span class="lbt-character-wrap">${characterSvg(id, 'customer', archetype, false)}</span>`;
  el.addEventListener('transitionend', event => {
    if (event.propertyName !== 'left' || !el.isConnected || el.classList.contains('lbt-exiting')) return;
    const area = el.closest('#simArea');
    if (!area) return;
    const left = parseFloat(el.style.left || '0');
    if (left < area.clientWidth - 20) {
      el.classList.remove('lbt-walking');
      el.classList.add('lbt-queued');
      arrangeQueue(area);
    }
  });
}

function decorateAll(root=document) {
  ensureSavedAvatarIds();
  root.querySelectorAll?.('.customer').forEach(upgradeCustomer);
  root.querySelectorAll?.('.thought').forEach(upgradeThought);
  root.querySelectorAll?.('.pe-avatar,.hq-avatar,.hq-big-avatar').forEach(upgradePortrait);
}
function onMutations(mutations) {
  let queueArea = null;
  mutations.forEach(m => {
    if (m.type === 'childList') {
      m.addedNodes.forEach(node => {
        if (!(node instanceof Element)) return;
        if (node.matches('.customer')) upgradeCustomer(node);
        if (node.matches('.thought')) upgradeThought(node);
        node.querySelectorAll?.('.customer').forEach(upgradeCustomer);
        node.querySelectorAll?.('.thought').forEach(upgradeThought);
        node.querySelectorAll?.('.pe-avatar,.hq-avatar,.hq-big-avatar').forEach(upgradePortrait);
      });
      if (m.target instanceof Element && m.target.id === 'simArea') queueArea = m.target;
    }
    if (m.type === 'characterData' || m.type === 'attributes') {
      const el = m.target.nodeType === Node.TEXT_NODE ? m.target.parentElement : m.target;
      if (el?.classList?.contains('thought')) upgradeThought(el);
      if (el?.classList?.contains('customer')) queueArea = el.closest('#simArea');
    }
  });
  if (queueArea) requestAnimationFrame(() => arrangeQueue(queueArea));
}

function start() {
  decorateAll();
  if (observer) observer.disconnect();
  observer = new MutationObserver(onMutations);
  observer.observe(document.body, {subtree:true, childList:true, characterData:true, attributes:true, attributeFilter:['style']});
  document.addEventListener('click', () => setTimeout(() => decorateAll(), 40), true);
  window.addEventListener('storage', () => setTimeout(() => decorateAll(), 20));
}

window.LBTCharacters = {
  version: 1,
  customerIds: CUSTOMER_IDS.slice(),
  locationManagerIds: LOCATION_MANAGER_IDS.slice(),
  regionalManagerIds: REGIONAL_MANAGER_IDS.slice(),
  hqIds: HQ_IDS.slice(),
  workerIds: WORKER_IDS.slice(),
  renderPortrait: (id, role='locationManager') => characterSvg(id, role, 'local', true),
  renderGameplay: (id, archetype='local') => characterSvg(id, 'customer', archetype, false),
  ensureSavedAvatarIds
};

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, {once:true});
else start();
})();
