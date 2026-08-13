(() => {
'use strict';

const SAVE_KEY='lemon-stand-empire-v01';
const VERSION=1;
const REGIONS={
  home:{name:'Home Region',emoji:'🏡',playerCost:0,delegatedCost:0,requiredMature:0,templates:['neighbourhood','park','shopping','business','beach','festival']},
  coast:{name:'Coastal Region',emoji:'🌊',playerCost:650,delegatedCost:550,requiredMature:1,templates:['beach','park','neighbourhood','shopping','festival']},
  city:{name:'City Region',emoji:'🏙️',playerCost:950,delegatedCost:800,requiredMature:2,templates:['business','shopping','park','neighbourhood','festival']},
  north:{name:'Northern Region',emoji:'🌲',playerCost:1200,delegatedCost:1000,requiredMature:3,templates:['neighbourhood','park','business','shopping','festival']}
};
const LOC={
  neighbourhood:{name:'Neighbourhood',emoji:'🏡',traffic:1.0,cost:0},
  park:{name:'Park',emoji:'🌳',traffic:1.18,cost:8},
  shopping:{name:'Shopping District',emoji:'🛍️',traffic:1.38,cost:22},
  business:{name:'Business District',emoji:'🏢',traffic:1.28,cost:18},
  beach:{name:'Beachfront',emoji:'🏖️',traffic:1.55,cost:30},
  festival:{name:'Festival',emoji:'🎪',traffic:1.75,cost:35}
};
const STAGES=[
  {name:'Pop-Up Stand',days:0,investment:0},
  {name:'Improved Stand',days:2,investment:80},
  {name:'Established Stand',days:5,investment:200},
  {name:'Semi-Permanent Operation',days:10,investment:450},
  {name:'Permanent Location',days:15,investment:900}
];
const WEIGHTS={trustworthiness:.22,workEthic:.08,sales:.08,leadership:.30,trainability:.08,organisation:.24};
const FIRST=['Alex','Sophie','Daniel','Priya','Marcus','Amelia','Jordan','Chloe','Maya','Lewis','Imani','Oliver'];
const LAST=['Mitchell','Cooper','Shah','Reed','Morgan','Patel','Turner','Bennett','Clarke','Foster','King','Brooks'];
let panel=null, view='regions', currentRegion='home', queued=false;

const money=n=>`£${Number(n||0).toFixed(2)}`;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const round2=n=>Math.round(Number(n||0)*100)/100;
const state=()=>{try{return window.__LBT_TEST__?.getState?.()||null}catch{return null}};
const persist=s=>{try{localStorage.setItem(SAVE_KEY,JSON.stringify(s))}catch{}};
const score=p=>Object.entries(WEIGHTS).reduce((a,[k,w])=>a+Number(p?.[k]||0)*w,0);
const starCount=p=>clamp(Math.round(score(p)/20),1,5);
const stars=p=>'★'.repeat(starCount(p))+'☆'.repeat(5-starCount(p));
const permanentHome=s=>Object.values(s?.locationDevelopment?.sites||{}).filter(x=>x?.permanent).length;
const people=s=>s?.peopleExpansion||{managers:[]};
const regionManager=(s,id)=>people(s).managers.find(m=>m.active!==false&&m.role==='regionalManager'&&m.assignedRegion===id)||null;

function ensure(s){
  if(!s)return null;
  if(!s.regionExpansion||typeof s.regionExpansion!=='object')s.regionExpansion={version:VERSION,regions:{},externalCandidates:[],alerts:[],daily:{},history:[]};
  const x=s.regionExpansion;x.version=VERSION;x.regions||={};x.externalCandidates=Array.isArray(x.externalCandidates)?x.externalCandidates:[];x.alerts=Array.isArray(x.alerts)?x.alerts:[];x.daily||={};x.history=Array.isArray(x.history)?x.history:[];
  Object.keys(REGIONS).forEach(id=>{
    if(!x.regions[id])x.regions[id]={id,name:REGIONS[id].name,unlocked:id==='home',mature:false,mode:id==='home'?'player':null,setupDay:id==='home'?1:null,sites:[],activeSite:null,plan:null};
    const r=x.regions[id];r.sites=Array.isArray(r.sites)?r.sites:[];r.unlocked=!!r.unlocked;
  });
  x.regions.home.mature=permanentHome(s)>=5;
  return x;
}
function matureCount(s){const x=ensure(s);return Object.values(x.regions).filter(r=>r.mature).length}
function canUnlock(s,id){const def=REGIONS[id],r=ensure(s).regions[id];return !r.unlocked&&matureCount(s)>=def.requiredMature}
function remotePermanent(r){return (r.sites||[]).filter(x=>x.permanent).length}
function stageFor(site){
  let stage=0;
  for(let i=1;i<STAGES.length;i++)if(Number(site.tradingDays||0)>=STAGES[i].days&&Number(site.investment||0)>=STAGES[i].investment)stage=i;
  site.stage=Math.max(Number(site.stage||0),stage);site.permanent=site.stage>=4;return site.stage;
}
function makeSite(r,template,index){
  return {id:`${r.id}-site-${index+1}`,template,name:`${LOC[template].name} ${index+1}`,stage:0,permanent:false,tradingDays:0,investment:0,revenue:0,profit:0,cups:0,satisfactionTotal:0,lastProfit:0,plan:r.plan?JSON.parse(JSON.stringify(r.plan)):null,processed:{}};
}
function nextTemplate(r){return REGIONS[r.id].templates[r.sites.length]||REGIONS[r.id].templates.at(-1)}
function beginSite(s,r){
  if(r.sites.length>=5)return toast('This region already has five company locations.','warning');
  const setup=120+r.sites.length*70;
  if(Number(s.cash||0)<setup)return toast(`You need ${money(setup)} to launch the next site.`,'warning');
  s.cash-=setup;
  const site=makeSite(r,nextTemplate(r),r.sites.length);r.sites.push(site);r.activeSite=site.id;
  persist(s);toast(`${site.name} launch started.`,'success');render('region',r.id);
}
function activeSite(r){return r.sites.find(x=>x.id===r.activeSite)||r.sites.find(x=>!x.permanent)||r.sites.at(-1)||null}
function planFromGame(s){return {price:Number(s.price||1.5),recipe:{...(s.recipe||{})},updatedDay:Number(s.day||1)}}
function investSite(s,r){
  const site=activeSite(r);if(!site)return beginSite(s,r);
  stageFor(site);if(site.permanent)return beginSite(s,r);
  const next=STAGES[Math.min(4,site.stage+1)],remaining=Math.max(0,next.investment-site.investment),amount=Math.min(remaining,150);
  if(!remaining)return toast(`Trade more days to reach ${next.name}.`,'warning');
  if(Number(s.cash||0)<amount)return toast(`You need ${money(amount)} available.`,'warning');
  s.cash-=amount;site.investment+=amount;stageFor(site);persist(s);toast(`${money(amount)} invested in ${site.name}.`,'success');render('region',r.id);
}
function roleCandidates(s){return people(s).managers.filter(m=>m.active!==false&&m.role==='locationManager')}
function generateRegionalCandidate(s,i){
  const lvl=Number(s.level||1),lo=clamp(58+lvl,58,72),hi=clamp(90+lvl,90,98);
  const p={id:`rmcand-${Date.now()}-${i}-${Math.random().toString(36).slice(2,6)}`,name:`${FIRST[Math.floor(Math.random()*FIRST.length)]} ${LAST[Math.floor(Math.random()*LAST.length)]}`,role:'regionalManager',experience:'Senior Operations Manager'};
  ['trustworthiness','workEthic','sales','leadership','trainability','organisation'].forEach(k=>p[k]=Math.floor(lo+Math.random()*(hi-lo+1)));
  p.salary=Math.round(14+score(p)*.16);p.signingFee=p.salary*5;return p;
}
function ensureRegionalCandidates(s){
  const x=ensure(s);if(!x.externalCandidates.length)x.externalCandidates=Array.from({length:3},(_,i)=>generateRegionalCandidate(s,i));persist(s);return x.externalCandidates;
}
function appointInternal(s,managerId,regionId){
  const m=people(s).managers.find(x=>x.id===managerId);if(!m||m.role!=='locationManager')return;
  const previous=m.assignedLocation;m.role='regionalManager';m.assignedRegion=regionId;m.assignedLocation=null;m.salary=Math.max(Number(m.salary||10),Math.round(13+score(m)*.13));
  ensure(s).alerts.unshift({day:s.day,title:`${m.name} promoted`,body:`Appointed Regional Manager for ${REGIONS[regionId].name}. ${previous?LOC[previous]?.name||'Their previous site':'A previous site'} now needs Location Manager cover.`});
  persist(s);toast(`${m.name} promoted to Regional Manager.`,'success');render('region',regionId);
}
function hireExternal(s,candidateId,regionId){
  const x=ensure(s),c=x.externalCandidates.find(v=>v.id===candidateId);if(!c)return;
  if(Number(s.cash||0)<c.signingFee)return toast(`You need ${money(c.signingFee)} for senior recruitment.`,'warning');
  s.cash-=c.signingFee;
  const m={...c,id:`rm-${Date.now()}-${Math.random().toString(36).slice(2,6)}`,active:true,assignedRegion:regionId,assignedLocation:null,hireDay:s.day,trainingHistory:[],daysEmployed:0,daysPresent:0};
  s.peopleExpansion.managers.push(m);x.externalCandidates=x.externalCandidates.filter(v=>v.id!==candidateId);persist(s);toast(`${m.name} hired as Regional Manager.`,'success');render('region',regionId);
}
function launchRegion(s,id,mode){
  const x=ensure(s),r=x.regions[id],def=REGIONS[id];if(!canUnlock(s,id))return toast('Mature another region before expanding here.','warning');
  const cost=mode==='delegated'?def.delegatedCost:def.playerCost;
  if(Number(s.cash||0)<cost)return toast(`You need ${money(cost)} to establish this region.`,'warning');
  const homeRM=regionManager(s,'home');if(mode==='delegated'&&!homeRM)return toast('Appoint a Regional Manager before delegated expansion.','warning');
  s.cash-=cost;r.unlocked=true;r.mode=mode;r.setupDay=s.day;r.plan=planFromGame(s);r.mature=false;
  ensure(s).alerts.unshift({day:s.day,title:`${def.name} opened`,body:mode==='delegated'?`${homeRM.name} is leading the initial expansion.`:'You are personally leading the first launch.'});
  beginSiteNoCost(r);persist(s);currentRegion=id;render('region',id);toast(`${def.name} expansion is underway.`,'success');
}
function beginSiteNoCost(r){if(r.sites.length>=5)return;const site=makeSite(r,nextTemplate(r),r.sites.length);r.sites.push(site);r.activeSite=site.id}
function qualityScore(s,site,r){
  const recipe=site.plan?.recipe||r.plan?.recipe||s.recipe||{},price=Number(site.plan?.price||r.plan?.price||s.price||1.5),rm=regionManager(s,r.id)||regionManager(s,'home');
  const balance=1-Math.min(.5,Math.abs(Number(recipe.lemons||3)-3)*.04+Math.abs(Number(recipe.sugar||3)-3)*.035+Math.abs(Number(recipe.ice||3)-3)*.03);
  const priceScore=clamp(1-Math.max(0,price-1.8)*.25,.55,1.05);
  const manager=r.mode==='delegated'&&rm?clamp(.78+(Number(rm.leadership||50)+Number(rm.organisation||50)-100)*.002,.68,1.12):1.02;
  return clamp(balance*priceScore*manager,.45,1.15);
}
function simulateRemoteDay(s,r){
  const site=activeSite(r);if(!site||site.permanent)return null;
  const key=String(s.lastResult?.day||s.day);if(site.processed[key])return null;site.processed[key]=true;
  site.plan=site.plan||r.plan||planFromGame(s);
  const loc=LOC[site.template],q=qualityScore(s,site,r),weather={hot:1.35,sunny:1.2,warm:1,cloudy:.86,rainy:.62,stormy:.4}[s.weather]||1,event=Number(s.event?.traffic||1);
  const rm=regionManager(s,r.id)||regionManager(s,'home'),sales=r.mode==='delegated'&&rm?clamp(.8+(Number(rm.leadership||50)-50)*.002+(Number(rm.organisation||50)-50)*.0015,.7,1.1):1;
  const potential=Math.max(12,Math.round((38+s.day*.35)*loc.traffic*weather*event*sales));
  const sold=Math.max(0,Math.round(potential*clamp(.48+q*.34,.28,.93)));
  const price=Number(site.plan.price||1.5),revenue=sold*price,cost=sold*.54+loc.cost*.55+4+Math.max(0,(.9-q)*sold*.08),profit=revenue-cost,satisfaction=Math.round(clamp(52+q*38,35,98));
  site.tradingDays++;site.revenue+=revenue;site.profit+=profit;site.cups+=sold;site.satisfactionTotal+=satisfaction;site.lastProfit=profit;stageFor(site);
  if(site.permanent){r.activeSite=null;if(remotePermanent(r)>=5)r.mature=true}
  return {day:Number(s.lastResult?.day||s.day),region:r.id,siteId:site.id,template:site.template,sold,revenue:round2(revenue),profit:round2(profit),satisfaction,stage:site.stage};
}
function processRegionDay(s){
  if(!s||s.stage!=='results'||!s.lastResult)return false;const x=ensure(s),day=String(s.lastResult.day||s.day);if(x.daily[day])return false;
  const results=[];Object.values(x.regions).filter(r=>r.unlocked&&r.id!=='home').forEach(r=>{const res=simulateRemoteDay(s,r);if(res)results.push(res)});
  let total=0;results.forEach(res=>{total+=res.profit;s.cash+=res.profit;s.stats.revenue=Number(s.stats.revenue||0)+res.revenue;s.stats.profit=Number(s.stats.profit||0)+res.profit;s.stats.cups=Number(s.stats.cups||0)+res.sold});
  x.daily[day]={day:Number(day),results};x.history.push(...results);s.lastResult.regionExpansion=results;s.lastResult.regionProfit=round2(total);if(s.lastResult.companyProfit!=null)s.lastResult.companyProfit=round2(Number(s.lastResult.companyProfit)+total);
  applyRegionalControl(s);persist(s);return results.length>0;
}
function applyRegionalControl(s){
  const x=ensure(s),day=String(s.lastResult?.day||s.day),tag=`rm-${day}`;if(x.daily[tag])return;x.daily[tag]=true;
  const rm=regionManager(s,'home');const managed=s.lastResult?.managedLocations||[];if(!rm||!managed.length)return;
  const efficiency=clamp(((Number(rm.leadership||50)+Number(rm.organisation||50))-100)/2200,-.04,.06);
  let delta=0;managed.forEach(r=>{const saving=Number(r.expenses||0)*efficiency;r.regionalManagerEffect=round2(saving);r.profit=round2(Number(r.profit||0)+saving);delta+=saving});
  if(delta){s.cash+=delta;s.stats.profit=Number(s.stats.profit||0)+delta;s.lastResult.managedProfit=round2(Number(s.lastResult.managedProfit||0)+delta);s.lastResult.companyProfit=round2(Number(s.lastResult.companyProfit||s.lastResult.profit)+delta)}
}
function updatePlan(s,regionId,field,delta){
  const r=ensure(s).regions[regionId],site=activeSite(r);if(!site)return;site.plan=site.plan||r.plan||planFromGame(s);
  if(field==='price')site.plan.price=clamp(round2(Number(site.plan.price||1.5)+delta),.5,5);
  else site.plan.recipe[field]=clamp(Number(site.plan.recipe[field]||0)+delta,0,7);
  persist(s);render('region',regionId);
}

function header(s,title){return `<header class="re-header"><button class="re-icon" data-re-action="close">←</button><div><small>${s.businessName}</small><strong>${title}</strong></div><span class="re-cash">💷 ${money(s.cash)}</span></header>`}
function matureBadge(r){return r.mature?'<span class="re-badge mature">MATURE</span>':r.unlocked?'<span class="re-badge">ACTIVE</span>':'<span class="re-badge locked">LOCKED</span>'}
function regionsHtml(s){
  const x=ensure(s);return `${header(s,'Company Regions')}<div class="re-scroll"><section class="re-title"><span>COMPANY GROWTH</span><h1>Your regions</h1><p>Build five permanent sites, appoint regional leadership, then move into a new market.</p></section><section class="re-card">${Object.entries(REGIONS).map(([id,d])=>{const r=x.regions[id],count=id==='home'?permanentHome(s):remotePermanent(r),can=canUnlock(s,id);return `<button class="re-region-row" data-re-view="${r.unlocked?'region':can?'setup':'progress'}" data-region="${id}"><span>${d.emoji}</span><div><strong>${d.name}</strong><small>${count} / 5 permanent locations${can?' · Expansion ready':''}</small><i><b style="width:${clamp(count/5*100,0,100)}%"></b></i></div>${r.unlocked?matureBadge(r):can?'<em>READY</em>':'<em class="locked">LOCKED</em>'}<span>›</span></button>`}).join('')}</section></div>`}
function progressHtml(s,id){
  const r=ensure(s).regions[id],count=id==='home'?permanentHome(s):remotePermanent(r);return `${header(s,'Region Progress')}<div class="re-scroll"><section class="re-title"><span>${REGIONS[id].emoji} ${REGIONS[id].name.toUpperCase()}</span><h1>${count} / 5 permanent sites</h1><p>Regional Management becomes strategically important once five locations are established.</p></section><section class="re-hero"><h2>${count<5?`${5-count} more to maturity`:'Region mature'}</h2><div class="re-progress"><i style="width:${count/5*100}%"></i></div></section><button class="re-btn primary" data-re-view="region" data-region="${id}">VIEW REGION</button></div>`}
function managerHtml(s,id){
  const rm=regionManager(s,id),internal=roleCandidates(s),external=ensureRegionalCandidates(s);return `${header(s,'Regional Manager')}<div class="re-scroll"><section class="re-title"><span>${REGIONS[id].name.toUpperCase()}</span><h1>${rm?'Regional leadership':'Appoint regional leadership'}</h1><p>Leadership, Trustworthiness and Organisation matter most in this role.</p></section>${rm?`<section class="re-manager"><span>👤</span><div><strong>${rm.name}</strong><em>${stars(rm)}</em><small>Regional suitability ${Math.round(score(rm))} · ${money(rm.salary)}/day</small></div></section>`:`<section class="re-card"><h3>Internal promotion</h3>${internal.map(m=>`<button class="re-person" data-re-action="promote" data-manager="${m.id}" data-region="${id}"><span>👤</span><div><strong>${m.name}</strong><em>${stars(m)}</em><small>Regional suitability ${Math.round(score(m))}</small></div><b>PROMOTE</b></button>`).join('')||'<p>No Location Managers are available for promotion.</p>'}</section><section class="re-card"><h3>External recruitment</h3>${external.map(c=>`<button class="re-person" data-re-action="hire" data-candidate="${c.id}" data-region="${id}"><span>👔</span><div><strong>${c.name}</strong><em>${stars(c)}</em><small>${money(c.salary)}/day · Signing ${money(c.signingFee)}</small></div><b>HIRE</b></button>`).join('')}</section>`}<button class="re-btn ghost" data-re-view="region" data-region="${id}">BACK TO REGION</button></div>`}
function setupHtml(s,id){
  const d=REGIONS[id],rm=regionManager(s,'home');return `${header(s,'New Region Setup')}<div class="re-scroll"><section class="re-title"><span>${d.emoji} ${d.name.toUpperCase()}</span><h1>How will you expand?</h1><p>Choose direct control or let senior leadership handle the launch.</p></section><button class="re-choice" data-re-action="launch" data-mode="player" data-region="${id}"><strong>👤 Player-led expansion</strong><p>You control the opening plan and development investment.</p><b>${money(d.playerCost)}</b></button><button class="re-choice ${rm?'':'disabled'}" data-re-action="launch" data-mode="delegated" data-region="${id}" ${rm?'':'disabled'}><strong>👥 Delegated expansion</strong><p>${rm?`${rm.name} leads the opening; leadership and organisation influence results.`:'Appoint a Home Regional Manager first.'}</p><b>${money(d.delegatedCost)}</b></button></div>`}
function regionHtml(s,id){
  const r=ensure(s).regions[id],count=id==='home'?permanentHome(s):remotePermanent(r),rm=regionManager(s,id),site=id==='home'?null:activeSite(r);
  return `${header(s,REGIONS[id].name)}<div class="re-scroll"><section class="re-title"><span>${r.mature?'MATURE REGION':'REGION DEVELOPMENT'}</span><h1>${REGIONS[id].emoji} ${REGIONS[id].name}</h1><p>${id==='home'?'Your original locations form the foundation of the company.':'Develop five sites here to create another mature region.'}</p></section><div class="re-metrics"><article><small>Permanent sites</small><strong>${count}</strong></article><article><small>Regional Manager</small><strong>${rm?'✓':'—'}</strong></article></div>${id==='home'?`<section class="re-card"><h3>Regional maturity</h3><div class="re-progress"><i style="width:${count/5*100}%"></i></div><p>${count>=5?'This region can support Regional Management and expansion into another market.':`${5-count} more permanent locations needed.`}</p></section>`:remoteSiteHtml(s,r,site)}<button class="re-btn ${rm?'ghost':'primary'}" data-re-view="manager" data-region="${id}">${rm?'VIEW REGIONAL MANAGER':'APPOINT REGIONAL MANAGER'}</button>${id==='home'&&count>=5?`<button class="re-btn primary" data-re-view="regions">VIEW EXPANSION OPPORTUNITIES</button>`:''}</div>`}
function remoteSiteHtml(s,r,site){
  if(!site)return `<section class="re-card"><h3>Next opportunity</h3><p>Launch the next location in ${REGIONS[r.id].name}.</p></section><button class="re-btn primary" data-re-action="new-site" data-region="${r.id}">LAUNCH NEXT LOCATION</button>`;
  stageFor(site);const st=STAGES[site.stage],next=site.permanent?null:STAGES[site.stage+1],plan=site.plan||r.plan||planFromGame(s);
  return `<section class="re-card"><div class="re-cardhead"><div><small>ACTIVE LOCATION</small><h3>${LOC[site.template].emoji} ${site.name}</h3></div><span class="re-badge">${st.name}</span></div><div class="re-progress"><i style="width:${site.permanent?100:Math.min(100,((site.tradingDays/(next?.days||1))*.5+(site.investment/(next?.investment||1))*.5)*100)}%"></i></div><div class="re-site-stats"><span>📅 ${site.tradingDays} days</span><span>💷 ${money(site.investment)} invested</span><span>📈 ${money(site.profit)} profit</span></div></section>${!site.permanent?`<section class="re-card"><h3>Operating plan</h3>${planRow('price','Selling price',money(plan.price),r.id)}${planRow('lemons','Lemons',plan.recipe.lemons,r.id)}${planRow('sugar','Sugar',plan.recipe.sugar,r.id)}${planRow('ice','Ice',plan.recipe.ice,r.id)}${planRow('water','Water',plan.recipe.water,r.id)}</section><button class="re-btn secondary" data-re-action="invest-site" data-region="${r.id}">INVEST IN LOCATION</button>`:`<button class="re-btn primary" data-re-action="new-site" data-region="${r.id}">${remotePermanent(r)<5?'LAUNCH NEXT LOCATION':'REGION COMPLETE'}</button>`}`;
}
function planRow(field,label,value,region){return `<div class="re-plan"><span>${label}</span><div><button data-re-action="plan" data-field="${field}" data-delta="${field==='price'?-0.1:-1}" data-region="${region}">−</button><strong>${value}</strong><button data-re-action="plan" data-field="${field}" data-delta="${field==='price'?0.1:1}" data-region="${region}">+</button></div></div>`}
function resultsCard(s){
  const rows=s.lastResult?.regionExpansion||[];if(!rows.length)return null;const card=document.createElement('section');card.className='re-results-card';card.innerHTML=`<div><small>REGION EXPANSION</small><strong>${rows.length} remote site${rows.length===1?'':'s'} traded</strong><span>${rows.reduce((a,r)=>a+r.profit,0)>=0?'+':''}${money(rows.reduce((a,r)=>a+r.profit,0))} profit</span></div><button data-re-view="regions">VIEW</button>`;return card;
}
function render(next='regions',id='home'){
  const s=state();if(!s)return;ensure(s);view=next;currentRegion=id||currentRegion||'home';if(!panel){panel=document.createElement('div');panel.id='region-expansion-root';document.body.appendChild(panel)}
  let html=next==='manager'?managerHtml(s,currentRegion):next==='setup'?setupHtml(s,currentRegion):next==='progress'?progressHtml(s,currentRegion):next==='region'?regionHtml(s,currentRegion):regionsHtml(s);
  panel.innerHTML=`<main class="re-shell">${html}</main>`;panel.classList.add('open');
}
function close(){panel?.classList.remove('open')}
function decorate(){
  const s=state();if(!s)return;ensure(s);processRegionDay(s);
  const grid=document.querySelector('.dashboard-grid');if(grid&&!grid.querySelector('[data-re-entry]')&&(permanentHome(s)>=3||matureCount(s)>0)){const b=document.createElement('button');b.className='dashboard-card re-dashboard-card';b.dataset.reEntry='regions';b.innerHTML=`<span class="big-emoji">🗺️</span><div><strong>Regions</strong><small>${permanentHome(s)} / 5 permanent in Home Region${permanentHome(s)>=5?' · Expansion ready':''}</small></div><span>›</span>`;grid.appendChild(b)}
  const shell=document.querySelector('.results-shell');if(shell&&!shell.querySelector('.re-results-card')){const c=resultsCard(s);if(c)(shell.querySelector('.profit-result')||shell.firstElementChild).insertAdjacentElement('afterend',c)}
}
function toast(msg,tone=''){let x=document.querySelector('.re-toast');x?.remove();x=document.createElement('div');x.className=`re-toast ${tone}`;x.textContent=msg;document.body.appendChild(x);requestAnimationFrame(()=>x.classList.add('show'));setTimeout(()=>{x.classList.remove('show');setTimeout(()=>x.remove(),200)},2200)}
document.addEventListener('click',e=>{
  const entry=e.target.closest('[data-re-entry]');if(entry){e.preventDefault();e.stopPropagation();render('regions');return}
  const v=e.target.closest('[data-re-view]');if(v){e.preventDefault();e.stopPropagation();render(v.dataset.reView,v.dataset.region||currentRegion);return}
  const a=e.target.closest('[data-re-action]');if(!a)return;e.preventDefault();e.stopPropagation();const s=state();if(!s)return;const x=ensure(s),rid=a.dataset.region||currentRegion,r=x.regions[rid];
  if(a.dataset.reAction==='close')close();
  else if(a.dataset.reAction==='promote')appointInternal(s,a.dataset.manager,rid);
  else if(a.dataset.reAction==='hire')hireExternal(s,a.dataset.candidate,rid);
  else if(a.dataset.reAction==='launch')launchRegion(s,rid,a.dataset.mode);
  else if(a.dataset.reAction==='new-site')beginSite(s,r);
  else if(a.dataset.reAction==='invest-site')investSite(s,r);
  else if(a.dataset.reAction==='plan')updatePlan(s,rid,a.dataset.field,Number(a.dataset.delta));
},true);
const observer=new MutationObserver(()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;decorate()})});observer.observe(document.documentElement,{childList:true,subtree:true});setTimeout(decorate,1200);
window.__LBT_REGION_TEST__={ensure,matureCount,canUnlock,stageFor,score,simulateRemoteDay,processRegionDay,regionManager,permanentHome};
})();