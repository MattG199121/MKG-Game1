(() => {
'use strict';

const SAVE_KEY='lemon-stand-empire-v01';
const VERSION=1;
const LOCATIONS={
  neighbourhood:{name:'Neighbourhood',emoji:'🏡',fee:0,traffic:1.00},
  park:{name:'Park',emoji:'🌳',fee:8,traffic:1.18},
  shopping:{name:'Shopping District',emoji:'🛍️',fee:22,traffic:1.38},
  business:{name:'Business District',emoji:'🏢',fee:18,traffic:1.28},
  beach:{name:'Beachfront',emoji:'🏖️',fee:30,traffic:1.55,hotBonus:1.25},
  festival:{name:'Festival',emoji:'🎪',fee:35,traffic:1.75}
};
const WEATHER={hot:1.45,sunny:1.22,warm:1,cloudy:.84,rainy:.60,stormy:.35};
const UNITS={lemons:.18,sugar:.08,ice:.10,cups:.06,water:.02};
const IDEALS={
  hot:{lemons:[3,5],sugar:[2,4],ice:[4,6],water:[4,6]},sunny:{lemons:[3,5],sugar:[2,4],ice:[3,5],water:[4,6]},
  warm:{lemons:[3,5],sugar:[3,5],ice:[2,4],water:[4,6]},cloudy:{lemons:[3,5],sugar:[3,5],ice:[1,3],water:[4,6]},
  rainy:{lemons:[2,4],sugar:[3,6],ice:[1,2],water:[4,6]},stormy:{lemons:[2,4],sugar:[4,6],ice:[0,2],water:[4,6]}
};

let panel=null;
let view='portfolio';
let selectedLocation=null;
let queued=false;

const money=n=>`£${Number(n||0).toFixed(2)}`;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const round2=n=>Math.round(Number(n||0)*100)/100;
const pct=n=>`${Math.round(Number(n||0))}%`;

function state(){try{return window.__LBT_TEST__?.getState?.()||null}catch{return null}}
function persist(s){try{localStorage.setItem(SAVE_KEY,JSON.stringify(s))}catch{}}
function people(s){return s?.peopleExpansion||{managers:[],managerDayEffects:{}}}
function managerFor(s,id){return (people(s).managers||[]).find(m=>m.assignedLocation===id&&m.active!==false)||null}
function ensure(s){
  if(!s)return null;
  if(!s.companyExpansion||typeof s.companyExpansion!=='object')s.companyExpansion={version:VERSION,plans:{},daily:{},history:[],interventions:{}};
  const c=s.companyExpansion;c.version=VERSION;c.plans||={};c.daily||={};c.history=Array.isArray(c.history)?c.history:[];c.interventions||={};
  return c;
}
function permanentIds(s){const sites=s?.locationDevelopment?.sites||{};return Object.keys(sites).filter(id=>sites[id]?.permanent)}
function managedIds(s){return permanentIds(s).filter(id=>managerFor(s,id))}
function copyRecipe(r={}){return {lemons:Number(r.lemons||3),sugar:Number(r.sugar||3),ice:Number(r.ice||3),water:Number(r.water||5)}}
function saveOperatingPlan(s,id){
  if(!s||!LOCATIONS[id])return;
  const c=ensure(s);
  c.plans[id]={location:id,price:Number(s.price||1.5),recipe:copyRecipe(s.recipe),updatedDay:Number(s.day||1),source:'player'};
  persist(s);
}
function planFor(s,id){
  const c=ensure(s);
  if(!c.plans[id])c.plans[id]={location:id,price:Number(s.price||1.5),recipe:copyRecipe(s.recipe),updatedDay:Number(s.day||1),source:'default'};
  return c.plans[id];
}
function recipeCost(recipe){return recipe.lemons*UNITS.lemons+recipe.sugar*UNITS.sugar+recipe.ice*UNITS.ice+recipe.water*UNITS.water+UNITS.cups}
function scoreIngredient(v,range){if(v>=range[0]&&v<=range[1])return 1;const d=v<range[0]?range[0]-v:v-range[1];return clamp(1-d*.18,.25,1)}
function recipeScore(weather,recipe){const ideal=IDEALS[weather]||IDEALS.warm;return ['lemons','sugar','ice','water'].reduce((sum,k)=>sum+scoreIngredient(recipe[k],ideal[k]),0)/4}
function suggestedPrice(s,id){
  const loc=LOCATIONS[id],w=WEATHER[s.weather]||1;
  return 1.25+(loc.traffic-1)*.55+(w-1)*.30+Math.max(0,(Number(s.reputation||50)-50)*.006);
}
function eventBase(s){
  const currentKey=`${s.day}:${s.location}`;
  const locBoost=s.locationDevelopment?.boosts?.[currentKey];
  if(locBoost&&Number.isFinite(Number(locBoost.base)))return Number(locBoost.base);
  let v=Number(s.event?.traffic||1);
  const pe=s.peopleExpansion?.managerDayEffects?.[currentKey];
  if(pe&&pe.bonus)v=v/(1+Number(pe.bonus||0));
  return v;
}
function deterministicNoise(day,id,salt=0){
  let h=2166136261;const text=`${day}:${id}:${salt}`;for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619)}
  return ((h>>>0)%10000)/10000;
}
function managerPresent(s,m,id){
  const existing=s.peopleExpansion?.managerDayEffects?.[`${s.day}:${id}`];
  if(existing)return !existing.absent;
  const risk=Number(m.workEthic||50)<55?clamp((55-Number(m.workEthic||50))/300,0,.12):0;
  return deterministicNoise(s.day,id,91)>=risk;
}
function simulateManagedLocation(s,id){
  const loc=LOCATIONS[id],m=managerFor(s,id),plan=planFor(s,id);if(!loc||!m)return null;
  const present=managerPresent(s,m,id);
  const weather=WEATHER[s.weather]||1;
  let locationFactor=loc.traffic;if(loc.hotBonus&&['hot','sunny'].includes(s.weather))locationFactor*=loc.hotBonus;
  const stageBonus=.16; // permanent location commercial visibility
  const eventFactor=eventBase(s);
  const repFactor=.88+Number(s.reputation||50)/420;
  const leadership=present?clamp(.9+(Number(m.leadership||50)-50)*.0025,.78,1.12):.82;
  const work=present?clamp(.9+(Number(m.workEthic||50)-50)*.0025,.78,1.12):.72;
  const demandBase=(48+Number(s.day||1)*.65)*weather*locationFactor*eventFactor*(1+stageBonus)*repFactor*leadership*work;
  const potential=Math.max(6,Math.round(demandBase*(.9+deterministicNoise(s.day,id,1)*.22)));
  const recipeQ=recipeScore(s.weather,plan.recipe);
  const idealPrice=suggestedPrice(s,id);
  const priceDelta=Math.max(0,Number(plan.price)-idealPrice);
  const priceAcceptance=clamp(1-priceDelta*.44,.40,1);
  const salesSkill=present?clamp(.82+(Number(m.sales||50)-50)*.004,.65,1.18):.72;
  const conversion=clamp((.48+recipeQ*.34)*priceAcceptance*salesSkill,.22,.96);
  const organisation=present?Number(m.organisation||50):35;
  const stockCapacity=Math.round(54+Number(s.upgrades?.storage||0)*18+organisation*.42);
  const stockReliability=clamp(.72+organisation*.0032,.72,1.04);
  const available=Math.max(10,Math.round(stockCapacity*stockReliability));
  const wanted=Math.round(potential*conversion);
  const sold=Math.max(0,Math.min(available,wanted));
  const lostStock=Math.max(0,wanted-sold);
  const revenue=sold*Number(plan.price||1.5);
  const baseIngredient=recipeCost(plan.recipe)*sold;
  const wasteRate=clamp(.13-(organisation-50)*.0015,.025,.22);
  const waste=baseIngredient*wasteRate;
  const operating=4+loc.fee*.65;
  const expenses=baseIngredient+waste+operating;
  const profit=revenue-expenses;
  const satisfaction=clamp(Math.round(55+recipeQ*28+priceAcceptance*10+(Number(m.leadership||50)-50)*.10+(present?3:-8)),20,99);
  return {day:Number(s.day||1),location:id,managerId:m.id,managerName:m.name,present,potential,sold,lostStock,revenue:round2(revenue),ingredientCost:round2(baseIngredient),wasteCost:round2(waste),operatingCost:round2(operating),expenses:round2(expenses),profit:round2(profit),satisfaction,price:Number(plan.price),recipe:copyRecipe(plan.recipe),weather:s.weather,event:s.event?.name||'Normal day'};
}
function applyManagedResult(s,r){
  if(!r)return;
  const c=ensure(s);c.daily[String(r.day)] ||= {day:r.day,locations:[],processed:false};
  c.daily[String(r.day)].locations.push(r);c.history.push(r);if(c.history.length>300)c.history.shift();
  s.cash=Number(s.cash||0)+r.profit;
  s.stats.revenue=Number(s.stats.revenue||0)+r.revenue;
  s.stats.profit=Number(s.stats.profit||0)+r.profit;
  s.stats.cups=Number(s.stats.cups||0)+r.sold;
  s.stats.customers=Number(s.stats.customers||0)+r.potential;
  s.stats.customersLost=Number(s.stats.customersLost||0)+Math.max(0,r.potential-r.sold);
  s.stats.satisfactionTotal=Number(s.stats.satisfactionTotal||0)+r.satisfaction;
  s.stats.highestCash=Math.max(Number(s.stats.highestCash||0),Number(s.cash||0));
  const site=s.locationDevelopment?.sites?.[r.location];
  if(site){site.attemptedDays=Number(site.attemptedDays||0)+1;site.tradingDays=Number(site.tradingDays||0)+1;site.revenue=Number(site.revenue||0)+r.revenue;site.profit=Number(site.profit||0)+r.profit;site.cups=Number(site.cups||0)+r.sold;site.satisfactionTotal=Number(site.satisfactionTotal||0)+r.satisfaction;site.satisfactionDays=Number(site.satisfactionDays||0)+1;site.lastDay=r.day;site.lastProfit=r.profit;site.bestProfit=site.bestProfit===null?r.profit:Math.max(Number(site.bestProfit||0),r.profit)}
}
function runManagedDay(s){
  if(!s||s.stage!=='results'||!s.lastResult)return false;
  const day=Number(s.lastResult.day||s.day),c=ensure(s);const d=c.daily[String(day)];if(d?.processed)return false;
  c.daily[String(day)]={day,locations:[],processed:true};
  const personal=s.lastResult.location;
  managedIds(s).filter(id=>id!==personal).forEach(id=>applyManagedResult(s,simulateManagedLocation(s,id)));
  const results=c.daily[String(day)].locations;
  const managedProfit=results.reduce((a,r)=>a+r.profit,0),managedRevenue=results.reduce((a,r)=>a+r.revenue,0);
  s.lastResult.managedLocations=results.map(r=>({...r}));s.lastResult.managedProfit=round2(managedProfit);s.lastResult.managedRevenue=round2(managedRevenue);s.lastResult.companyProfit=round2(Number(s.lastResult.profit||0)+managedProfit);s.lastResult.companyRevenue=round2(Number(s.lastResult.revenue||0)+managedRevenue);
  persist(s);return results.length>0;
}
function header(s,title){return `<header class="ce-header"><button class="ce-icon" data-ce-action="close">←</button><div><small>${s.businessName}</small><strong>${title}</strong></div><span class="ce-cash">💷 ${money(s.cash)}</span></header>`}
function latestResult(s,id){const h=ensure(s).history.filter(r=>r.location===id);return h[h.length-1]||null}
function portfolioHtml(s){
  const ids=permanentIds(s),managed=managedIds(s),today=s.lastResult?.managedLocations||[];const todayProfit=today.reduce((a,r)=>a+r.profit,0);
  return `${header(s,'Company Locations')}<div class="ce-scroll"><section class="ce-title"><span>COMPANY LOCATIONS</span><h1>Your growing business</h1><p>Permanent locations stay in your portfolio. Managers can run the routine trading while you develop the next site.</p></section>
  <section class="ce-hero"><div><small>TODAY ACROSS MANAGED SITES</small><h2>${managed.length} managed location${managed.length===1?'':'s'}</h2></div><strong>${today.length?`${todayProfit>=0?'+':''}${money(todayProfit)}`:'—'}</strong></section>
  <div class="ce-metrics"><article><small>Permanent sites</small><strong>${ids.length}</strong></article><article><small>Managed sites</small><strong>${managed.length}</strong></article></div>
  <section class="ce-card">${ids.map(id=>siteRow(s,id)).join('')||'<p>No permanent locations yet.</p>'}</section>
  <button class="ce-btn primary" data-ce-view="compare">COMPARE LOCATIONS</button></div>`;
}
function siteRow(s,id){const loc=LOCATIONS[id],m=managerFor(s,id),r=latestResult(s,id);return `<button class="ce-site-row" data-ce-view="site" data-location="${id}"><span class="ce-loc-icon">${loc.emoji}</span><div><strong>${loc.name}</strong><small>${m?`${m.name} managing`:'Personal control'}${r?` · Last ${r.profit>=0?'+':''}${money(r.profit)}`:''}</small></div><em class="${m?'managed':'personal'}">${m?'MANAGED':'YOU'}</em><span>›</span></button>`}
function siteHtml(s,id){
  const loc=LOCATIONS[id],m=managerFor(s,id),plan=planFor(s,id),r=latestResult(s,id);selectedLocation=id;
  return `${header(s,'Managed Location')}<div class="ce-scroll"><section class="ce-title"><span>${loc.emoji} ${loc.name.toUpperCase()}</span><h1>${m?'Delegated operation':'Personal control'}</h1><p>${m?`${m.name} runs the routine day using the operating plan you last set here.`:'You currently run this location personally.'}</p></section>
  ${m?`<section class="ce-manager"><span>👤</span><div><small>LOCATION MANAGER</small><strong>${m.name}</strong><em>${'★'.repeat(Math.max(1,Math.round(((m.sales*.24+m.organisation*.24+m.workEthic*.18+m.trustworthiness*.12+m.leadership*.10+m.trainability*.12))/20)))} </em></div><button data-pe-view="manager" data-manager="${m.id}">VIEW</button></section>`:''}
  <div class="ce-metrics"><article><small>Latest revenue</small><strong>${r?money(r.revenue):'—'}</strong></article><article><small>Latest profit</small><strong>${r?money(r.profit):'—'}</strong></article><article><small>Cups sold</small><strong>${r?r.sold:'—'}</strong></article><article><small>Satisfaction</small><strong>${r?pct(r.satisfaction):'—'}</strong></article></div>
  <section class="ce-card"><h3>Operating plan</h3><div class="ce-plan-row"><span>💷</span><div><strong>${money(plan.price)} per cup</strong><small>Saved location selling price</small></div></div><div class="ce-plan-row"><span>🥤</span><div><strong>${plan.recipe.lemons} lemon · ${plan.recipe.sugar} sugar · ${plan.recipe.ice} ice · ${plan.recipe.water} water</strong><small>Saved recipe used for manager simulation</small></div></div></section>
  ${m?`<section class="ce-card"><h3>Manager influence</h3>${managerInfluence(m)}</section><div class="ce-note">Weather, events, location traffic, recipe quality, price, ingredient costs and manager characteristics all affect delegated results.</div>`:''}
  <button class="ce-btn primary" data-ce-action="personal-control" data-location="${id}">TAKE PERSONAL CONTROL</button><button class="ce-btn ghost" data-ce-view="portfolio">BACK TO LOCATIONS</button></div>`;
}
function managerInfluence(m){return `<div class="ce-influence"><span>💷</span><div><strong>Sales Ability ${m.sales}</strong><small>Conversion and selling strength</small></div></div><div class="ce-influence"><span>📦</span><div><strong>Organisation ${m.organisation}</strong><small>Stock capacity and waste control</small></div></div><div class="ce-influence"><span>⚡</span><div><strong>Work Ethic ${m.workEthic}</strong><small>Attendance and consistency</small></div></div><div class="ce-influence"><span>👥</span><div><strong>Leadership ${m.leadership}</strong><small>Team effectiveness and customer experience</small></div></div>`}
function compareHtml(s){
  const ids=permanentIds(s);return `${header(s,'Location Comparison')}<div class="ce-scroll"><section class="ce-title"><span>COMPANY PERFORMANCE</span><h1>Compare locations</h1><p>Use real location performance to decide where to intervene, invest or develop management talent.</p></section><section class="ce-card">${ids.map(id=>{const r=latestResult(s,id),m=managerFor(s,id);return `<button class="ce-compare-row" data-ce-view="site" data-location="${id}"><span>${LOCATIONS[id].emoji}</span><div><strong>${LOCATIONS[id].name}</strong><small>${m?m.name:'Personal control'}${r?` · ${pct(r.satisfaction)} satisfaction`:''}</small></div><b>${r?`${r.profit>=0?'+':''}${money(r.profit)}`:'—'}</b></button>`}).join('')}</section>${companyChart(s)}<button class="ce-btn ghost" data-ce-view="portfolio">BACK</button></div>`;
}
function companyChart(s){const h=ensure(s).history.slice(-14);if(!h.length)return `<section class="ce-card"><h3>Company history</h3><p>Delegated performance will appear after managers complete trading days.</p></section>`;const by={};h.forEach(r=>by[r.day]=(by[r.day]||0)+r.profit);const vals=Object.values(by),max=Math.max(1,...vals.map(x=>Math.max(0,x)));return `<section class="ce-card"><h3>Managed profit history</h3><div class="ce-chart">${vals.map(v=>`<i style="height:${clamp(Math.max(0,v)/max*100,8,100)}%"></i>`).join('')}</div><div class="ce-chart-label"><span>Earlier</span><span>Latest</span></div></section>`}
function resultSummaryHtml(s){
  const r=s.lastResult,managed=r?.managedLocations||[];return `${header(s,'Company Results')}<div class="ce-scroll"><section class="ce-title"><span>DAY ${r.day} COMPLETE</span><h1>Across your company</h1><p>Your personal trading day plus every delegated permanent location.</p></section><section class="ce-company-profit"><small>COMPANY PROFIT</small><strong>${r.companyProfit>=0?'+':''}${money(r.companyProfit??r.profit)}</strong><span>Personal ${r.profit>=0?'+':''}${money(r.profit)}${managed.length?` · Managed ${r.managedProfit>=0?'+':''}${money(r.managedProfit)}`:''}</span></section><section class="ce-card"><div class="ce-result-row"><span>${LOCATIONS[r.location]?.emoji||'🍋'}</span><div><strong>${LOCATIONS[r.location]?.name||'Your location'} · You</strong><small>${r.served} cups · ${pct(r.satisfaction)}</small></div><b>${r.profit>=0?'+':''}${money(r.profit)}</b></div>${managed.map(x=>`<div class="ce-result-row"><span>${LOCATIONS[x.location].emoji}</span><div><strong>${LOCATIONS[x.location].name} · ${x.managerName}</strong><small>${x.sold} cups · ${pct(x.satisfaction)}</small></div><b>${x.profit>=0?'+':''}${money(x.profit)}</b></div>`).join('')}</section><button class="ce-btn primary" data-ce-action="close">CONTINUE</button></div>`;
}
function render(next='portfolio',id=null){const s=state();if(!s)return;ensure(s);runManagedDay(s);view=next;selectedLocation=id||selectedLocation||s.location;if(!panel){panel=document.createElement('div');panel.id='company-expansion-root';document.body.appendChild(panel)}let html;if(next==='site')html=siteHtml(s,selectedLocation);else if(next==='compare')html=compareHtml(s);else if(next==='results')html=resultSummaryHtml(s);else html=portfolioHtml(s);panel.innerHTML=`<main class="ce-shell">${html}</main>`;panel.classList.add('open')}
function close(){panel?.classList.remove('open')}
function decorateDashboard(s){
  if(!managedIds(s).length)return;const grid=document.querySelector('.dashboard-grid');if(!grid||grid.querySelector('[data-ce-entry="portfolio"]'))return;
  const latest=s.lastResult?.managedLocations||[],profit=latest.reduce((a,r)=>a+r.profit,0);const b=document.createElement('button');b.className='dashboard-card ce-dashboard-card';b.dataset.ceEntry='portfolio';b.innerHTML=`<span class="big-emoji">🏢</span><div><strong>Company Locations</strong><small>${managedIds(s).length} managed${latest.length?` · ${profit>=0?'+':''}${money(profit)} last day`:''}</small></div><span>›</span>`;grid.appendChild(b);
}
function decorateResults(s){
  if(!s.lastResult)return;const changed=runManagedDay(s);const shell=document.querySelector('.results-shell');if(!shell)return;
  if(changed&&shell.querySelector('.profit-result strong')){const r=s.lastResult;const label=document.createElement('section');label.className='ce-results-card';label.innerHTML=`<div><small>COMPANY PROFIT</small><strong>${r.companyProfit>=0?'+':''}${money(r.companyProfit)}</strong><span>${r.managedLocations.length} delegated location${r.managedLocations.length===1?'':'s'} also traded today.</span></div><button data-ce-view="results">VIEW ALL</button>`;shell.querySelector('.profit-result').insertAdjacentElement('afterend',label)}
  else if(!shell.querySelector('.ce-results-card')&&(s.lastResult.managedLocations||[]).length){const r=s.lastResult;const label=document.createElement('section');label.className='ce-results-card';label.innerHTML=`<div><small>COMPANY PROFIT</small><strong>${r.companyProfit>=0?'+':''}${money(r.companyProfit)}</strong><span>${r.managedLocations.length} delegated location${r.managedLocations.length===1?'':'s'} also traded today.</span></div><button data-ce-view="results">VIEW ALL</button>`;shell.querySelector('.profit-result').insertAdjacentElement('afterend',label)}
}
function decorate(){const s=state();if(!s)return;ensure(s);decorateDashboard(s);decorateResults(s)}
function toast(msg,tone=''){let x=document.querySelector('.ce-toast');x?.remove();x=document.createElement('div');x.className=`ce-toast ${tone}`;x.textContent=msg;document.body.appendChild(x);requestAnimationFrame(()=>x.classList.add('show'));setTimeout(()=>{x.classList.remove('show');setTimeout(()=>x.remove(),200)},2200)}
document.addEventListener('click',e=>{
  const start=e.target.closest('[data-action="start-selling"]');if(start){const s=state();if(s)saveOperatingPlan(s,s.location);return}
  const entry=e.target.closest('[data-ce-entry]');if(entry){e.preventDefault();e.stopPropagation();render('portfolio');return}
  const v=e.target.closest('[data-ce-view]');if(v){e.preventDefault();e.stopPropagation();render(v.dataset.ceView,v.dataset.location);return}
  const a=e.target.closest('[data-ce-action]');if(!a)return;e.preventDefault();e.stopPropagation();const s=state();if(!s)return;
  if(a.dataset.ceAction==='close')close();
  if(a.dataset.ceAction==='personal-control'){
    const id=a.dataset.location;if(!LOCATIONS[id])return;s.location=id;saveOperatingPlan(s,id);persist(s);close();toast(`${LOCATIONS[id].name} selected for your next personal trading day.`,'success');
    setTimeout(()=>{document.querySelector(`.location-card[data-id="${id}"]`)?.click()},0);
  }
},true);
const observer=new MutationObserver(()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;decorate()})});observer.observe(document.documentElement,{childList:true,subtree:true});setTimeout(decorate,1000);
window.__LBT_COMPANY_TEST__={ensure,recipeCost,recipeScore,suggestedPrice,simulateManagedLocation,runManagedDay,managedIds,saveOperatingPlan};
})();