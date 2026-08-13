(() => {
'use strict';

const SAVE_KEY='lemon-stand-empire-v01';
const PEOPLE_VERSION=1;
const ATTRS=['trustworthiness','workEthic','sales','leadership','trainability','organisation'];
const ATTR_LABELS={
  trustworthiness:'Trustworthiness',
  workEthic:'Work Ethic',
  sales:'Sales Ability',
  leadership:'Leadership',
  trainability:'Trainability',
  organisation:'Organisation'
};
const ROLE_WEIGHTS={
  locationManager:{trustworthiness:.12,workEthic:.18,sales:.24,leadership:.10,trainability:.12,organisation:.24},
  regionalManager:{trustworthiness:.22,workEthic:.08,sales:.08,leadership:.30,trainability:.08,organisation:.24}
};
const COURSES={
  sales:{name:'Sales Training',icon:'💷',cost:55,desc:'Improve sales conversion and promotional ability.',gains:{sales:7}},
  stock:{name:'Stock Control',icon:'📦',cost:50,desc:'Improve stock planning, accuracy and operational organisation.',gains:{organisation:7}},
  service:{name:'Customer Service',icon:'🙂',cost:45,desc:'Build better selling instincts and team/customer handling.',gains:{sales:3,leadership:2}},
  management:{name:'Management Skills',icon:'👥',cost:75,desc:'Improve leadership and day-to-day organisation.',gains:{leadership:5,organisation:4}},
  leadership:{name:'Leadership',icon:'⭐',cost:90,desc:'Develop team leadership and readiness for senior roles.',gains:{leadership:8}},
  operations:{name:'Business Operations',icon:'⚙️',cost:85,desc:'Improve operational discipline and organisation.',gains:{workEthic:3,organisation:6}}
};
const NAMES_FIRST=['Sarah','Daniel','Priya','Marcus','Amelia','Jordan','Chloe','Ryan','Maya','Lewis','Sophie','Adam','Imani','Oliver','Hannah','Nathan'];
const NAMES_LAST=['Mitchell','Cooper','Shah','Reed','Morgan','Lewis','Patel','Turner','Bennett','Clarke','Hughes','Walker','Foster','King','Evans','Brooks'];
const EXPERIENCES=['Retail Supervisor','Hospitality Team Lead','Café Shift Manager','Store Coordinator','Events Supervisor','Customer Service Lead','Assistant Manager','Operations Coordinator'];

let panel=null;
let view='team';
let selectedCandidate=null;
let selectedManager=null;
let selectedLocation=null;
let queued=false;

const money=n=>`£${Number(n||0).toFixed(2)}`;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const scoreText=n=>Math.round(Number(n||0));
const rand=(a,b)=>Math.floor(Math.random()*(b-a+1))+a;

function state(){try{return window.__LBT_TEST__?.getState?.()||null}catch{return null}}
function persist(s){try{localStorage.setItem(SAVE_KEY,JSON.stringify(s))}catch{}}
function locationDefs(){
  return {
    neighbourhood:{name:'Neighbourhood',emoji:'🏡'},
    park:{name:'Park',emoji:'🌳'},
    shopping:{name:'Shopping District',emoji:'🛍️'},
    business:{name:'Business District',emoji:'🏢'},
    beach:{name:'Beachfront',emoji:'🏖️'},
    festival:{name:'Festival',emoji:'🎪'}
  };
}
function ensure(s){
  if(!s)return null;
  if(!s.peopleExpansion||typeof s.peopleExpansion!=='object'){
    s.peopleExpansion={version:PEOPLE_VERSION,candidates:[],managers:[],alerts:[],payrollProcessed:{},managerDayEffects:{},recruitmentRefreshDay:null};
  }
  const p=s.peopleExpansion;
  p.version=PEOPLE_VERSION;p.candidates=Array.isArray(p.candidates)?p.candidates:[];p.managers=Array.isArray(p.managers)?p.managers:[];
  p.alerts=Array.isArray(p.alerts)?p.alerts:[];p.payrollProcessed||={};p.managerDayEffects||={};
  p.managers.forEach(m=>{m.trainingHistory=Array.isArray(m.trainingHistory)?m.trainingHistory:[];ATTRS.forEach(k=>m[k]=clamp(Number(m[k]||50),0,100));});
  return p;
}
function permanentSiteIds(s){
  const sites=s?.locationDevelopment?.sites||{};
  return Object.keys(sites).filter(id=>sites[id]?.permanent);
}
function managerForLocation(s,id){return ensure(s).managers.find(m=>m.assignedLocation===id&&m.active!==false)||null}
function openVacancies(s){return permanentSiteIds(s).filter(id=>!managerForLocation(s,id))}
function suitability(person,role='locationManager'){
  const w=ROLE_WEIGHTS[role]||ROLE_WEIGHTS.locationManager;
  return ATTRS.reduce((sum,k)=>sum+Number(person[k]||0)*Number(w[k]||0),0);
}
function stars(person,role='locationManager'){return clamp(Math.round(suitability(person,role)/20),1,5)}
function starsText(person,role='locationManager'){const n=stars(person,role);return '★'.repeat(n)+'☆'.repeat(5-n)}
function salaryFor(person){return Math.max(7,Math.round(5+suitability(person)*.10))}
function signingFee(person){return salaryFor(person)*3}
function traitTag(p){
  const arr=[
    ['STRONG SALES',p.sales],['ORGANISED',p.organisation],['LEADER',p.leadership],['TRAINABLE',p.trainability],['RELIABLE',p.trustworthiness]
  ].sort((a,b)=>b[1]-a[1]);
  if(p.trustworthiness<45)return 'LOW TRUST';
  return arr[0][0];
}
function generateCandidate(s,index=0){
  const level=Number(s.level||1);
  const min=clamp(38+level*2,38,62),max=clamp(82+level*2,82,96);
  const c={id:`cand-${Date.now()}-${index}-${Math.random().toString(36).slice(2,7)}`,
    name:`${NAMES_FIRST[rand(0,NAMES_FIRST.length-1)]} ${NAMES_LAST[rand(0,NAMES_LAST.length-1)]}`,
    experience:EXPERIENCES[rand(0,EXPERIENCES.length-1)],
    createdDay:Number(s.day||1),role:'locationManager'};
  ATTRS.forEach(k=>c[k]=rand(min,max));
  c.salary=salaryFor(c);c.signingFee=signingFee(c);
  return c;
}
function ensureCandidates(s){
  const p=ensure(s);
  if(!p.candidates.length){
    p.candidates=Array.from({length:4},(_,i)=>generateCandidate(s,i));
    p.recruitmentRefreshDay=s.day;
    persist(s);
  }
  return p.candidates;
}
function refreshCandidates(s){
  const p=ensure(s),cost=20;
  if(Number(s.cash||0)<cost){toast('You need £20 to refresh the candidate pool.','warning');return}
  s.cash-=cost;p.candidates=Array.from({length:4},(_,i)=>generateCandidate(s,i));p.recruitmentRefreshDay=s.day;persist(s);render(view);decorate();toast('New candidate pool generated.','success');
}
function addAlert(s,alert){
  const p=ensure(s);p.alerts.unshift({id:`alert-${Date.now()}-${Math.random()}`,day:s.day,seen:false,...alert});if(p.alerts.length>30)p.alerts.length=30;
}
function hire(s,candidateId,locationId){
  const p=ensure(s),c=p.candidates.find(x=>x.id===candidateId);
  if(!c)return;
  if(!s.locationDevelopment?.sites?.[locationId]?.permanent){toast('A Location Manager can only be hired for a permanent location.','warning');return}
  if(managerForLocation(s,locationId)){toast('This location already has a manager.','warning');return}
  const fee=Number(c.signingFee||signingFee(c));
  if(Number(s.cash||0)<fee){toast(`You need ${money(fee)} for recruitment and onboarding.`,'warning');return}
  s.cash-=fee;
  const m={...c,id:`mgr-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,candidateId:c.id,role:'locationManager',assignedLocation:locationId,hireDay:s.day,active:true,salary:Number(c.salary||salaryFor(c)),trainingHistory:[],daysEmployed:0,daysPresent:0,lastTrainingDay:null};
  p.managers.push(m);p.candidates=p.candidates.filter(x=>x.id!==candidateId);
  addAlert(s,{type:'hire',tone:'success',title:`${m.name} hired`,body:`Appointed Location Manager at ${locationDefs()[locationId].name}. Salary ${money(m.salary)} per company day.`});
  persist(s);selectedManager=m.id;selectedLocation=locationId;render('manager');decorate();toast(`${m.name} is now managing ${locationDefs()[locationId].name}.`,'success');
}
function processPayrollAndIncidents(s){
  if(!s?.lastResult)return false;
  const p=ensure(s),day=Number(s.lastResult.day||s.day),key=String(day);
  if(p.payrollProcessed[key])return false;
  p.payrollProcessed[key]=true;
  let payroll=0,variance=0;
  p.managers.filter(m=>m.active!==false).forEach(m=>{
    m.daysEmployed=Number(m.daysEmployed||0)+1;
    payroll+=Number(m.salary||0);
    const trust=Number(m.trustworthiness||50);
    if(trust<55){
      const chance=clamp((55-trust)/500,0,.08);
      if(Math.random()<chance){
        const locName=locationDefs()[m.assignedLocation]?.name||'location';
        const loss=Math.min(Math.max(2,Number(s.lastResult.revenue||0)*(55-trust)/350),Math.max(0,Number(s.cash||0)));
        variance+=loss;
        addAlert(s,{type:'trust',tone:'warning',title:`Cash variance at ${locName}`,body:`${money(loss)} discrepancy detected. ${m.name}'s Trustworthiness is ${trust}; consider monitoring or training before giving them more responsibility.`});
        if(s.locationDevelopment?.sites?.[m.assignedLocation])s.locationDevelopment.sites[m.assignedLocation].profit-=loss;
      }
    }
  });
  const total=payroll+variance;
  if(total){
    s.cash-=total;
    s.lastResult.expenses=Number(s.lastResult.expenses||0)+total;
    s.lastResult.profit=Number(s.lastResult.profit||0)-total;
    if(Array.isArray(s.history)){
      const h=s.history.find(r=>Number(r.day)===day&&r.location===s.lastResult.location);
      if(h){h.expenses=Number(h.expenses||0)+total;h.profit=Number(h.profit||0)-total;h.managerPayroll=payroll;h.cashVariance=variance;}
    }
    s.stats.profit=Number(s.stats.profit||0)-total;
    p.managers.forEach(m=>{
      if(s.locationDevelopment?.sites?.[m.assignedLocation])s.locationDevelopment.sites[m.assignedLocation].profit-=Number(m.salary||0);
    });
    s.lastResult.managerPayroll=payroll;s.lastResult.cashVariance=variance;
  }
  persist(s);
  return true;
}
function applyManagerDayEffect(s){
  if(!s?.location||!s.event)return;
  const p=ensure(s),m=managerForLocation(s,s.location);if(!m)return;
  const key=`${s.day}:${s.location}`;
  if(p.managerDayEffects[key])return;
  const work=Number(m.workEthic||50);
  const absenceChance=work<55?clamp((55-work)/300,0,.12):0;
  const absent=Math.random()<absenceChance;
  let bonus=0;
  if(!absent){
    bonus=clamp((m.sales-50)*.0014+(m.workEthic-50)*.0005+(m.organisation-50)*.0005+(m.leadership-50)*.0003,-.05,.12);
    s.event.traffic=Number(s.event.traffic||1)*(1+bonus);
    m.daysPresent=Number(m.daysPresent||0)+1;
  }else{
    addAlert(s,{type:'attendance',tone:'warning',title:`Manager absent at ${locationDefs()[s.location].name}`,body:`${m.name} missed today's shift. Work Ethic is ${work}, increasing attendance risk. You are personally covering the location today.`});
  }
  p.managerDayEffects[key]={managerId:m.id,absent,bonus,at:Date.now()};
  persist(s);
}
function train(s,managerId,courseId){
  const p=ensure(s),m=p.managers.find(x=>x.id===managerId),course=COURSES[courseId];if(!m||!course)return;
  if(Number(s.cash||0)<course.cost){toast(`You need ${money(course.cost)} for this course.`,'warning');return}
  if(Number(m.lastTrainingDay)===Number(s.day)){toast('This employee has already completed training today.','warning');return}
  s.cash-=course.cost;
  const factor=.60+(Number(m.trainability||50)/100)*.80;
  const gains={};
  Object.entries(course.gains).forEach(([k,base])=>{
    const gain=Math.max(1,Math.round(base*factor+Math.random()*2));
    const before=Number(m[k]||0);m[k]=clamp(before+gain,0,100);gains[k]={before,after:m[k],gain:m[k]-before};
  });
  const record={id:`training-${Date.now()}`,day:s.day,courseId,courseName:course.name,cost:course.cost,gains,trainability:m.trainability};
  m.trainingHistory.push(record);m.lastTrainingDay=s.day;persist(s);selectedManager=m.id;
  addAlert(s,{type:'training',tone:'success',title:`${course.name} complete`,body:`${m.name} completed training. Trainability ${m.trainability} influenced the improvement.`});
  render('trainingResult',{record});decorate();toast('Training completed.','success');
}
function header(s,title){return `<header class="pe-header"><button class="pe-icon" data-pe-action="close">←</button><div><small>${s.businessName}</small><strong>${title}</strong></div><span class="pe-cash">💷 ${money(s.cash)}</span></header>`}
function attrBars(person){
  return ATTRS.map(k=>`<div class="pe-score"><label>${ATTR_LABELS[k]} <b>${scoreText(person[k])}</b></label><i><span style="width:${clamp(person[k],0,100)}%"></span></i></div>`).join('');
}
function candidateCard(c,locationId){
  return `<button class="pe-person-card" data-pe-view="candidate" data-candidate="${c.id}" data-location="${locationId||''}"><span class="pe-avatar">${avatarFor(c.name)}</span><div><strong>${c.name}</strong><span class="pe-stars">${starsText(c)}</span><small>${c.experience} · Suitability ${Math.round(suitability(c))}</small></div><div class="pe-person-right"><b>${money(c.salary)}/day</b><em>${traitTag(c)}</em></div></button>`;
}
function avatarFor(name){const n=name.charCodeAt(0)%5;return ['👩','👨','👩‍🦱','🧔','🧑'][n]}
function teamHtml(s){
  const p=ensure(s),vac=openVacancies(s),defs=locationDefs();
  return `${header(s,'Team')}<div class="pe-scroll"><section class="pe-title"><span>PEOPLE</span><h1>Your management team</h1><p>Important managers are people with strengths, weaknesses, salaries and development potential.</p></section>
  ${p.alerts.filter(a=>!a.seen).slice(0,2).map(a=>`<section class="pe-alert ${a.tone||''}"><strong>${a.title}</strong><p>${a.body}</p></section>`).join('')}
  <section class="pe-card"><div class="pe-card-head"><div><small>LOCATION MANAGERS</small><h3>${p.managers.length} appointed</h3></div><span>${vac.length} vacancies</span></div>
  ${p.managers.length?p.managers.map(m=>`<button class="pe-manager-row" data-pe-view="manager" data-manager="${m.id}"><span class="pe-avatar">${avatarFor(m.name)}</span><div><strong>${m.name}</strong><span class="pe-stars">${starsText(m)}</span><small>${defs[m.assignedLocation]?.name||'Unassigned'} · ${money(m.salary)}/day</small></div><span>›</span></button>`).join(''):'<p>No managers hired yet. Your first permanent location can now support one.</p>'}</section>
  ${vac.length?`<section class="pe-card"><h3>Open vacancies</h3>${vac.map(id=>`<button class="pe-vacancy" data-pe-view="recruit" data-location="${id}"><span>${defs[id].emoji}</span><div><strong>Location Manager</strong><small>${defs[id].name}</small></div><b>RECRUIT</b></button>`).join('')}</section>`:''}
  <button class="pe-btn primary" data-pe-view="recruit" data-location="${vac[0]||''}" ${vac.length?'':'disabled'}>RECRUIT A MANAGER</button></div>`;
}
function recruitHtml(s,locationId){
  const defs=locationDefs(),vac=openVacancies(s);selectedLocation=locationId&&vac.includes(locationId)?locationId:(vac[0]||null);
  if(!selectedLocation)return `${header(s,'Recruitment')}<div class="pe-scroll"><section class="pe-empty"><div>✅</div><h2>No Location Manager vacancies</h2><p>Develop another site to Permanent Location status to create a new vacancy.</p></section><button class="pe-btn primary" data-pe-view="team">BACK TO TEAM</button></div>`;
  const candidates=ensureCandidates(s);
  return `${header(s,'Recruitment Hub')}<div class="pe-scroll"><section class="pe-title"><span>OPEN VACANCY</span><h1>Location Manager</h1><p>${defs[selectedLocation].emoji} ${defs[selectedLocation].name} · Permanent Location</p></section>
  <section class="pe-role-card"><h3>What matters in this role</h3><p>Sales Ability and Organisation carry the most weight, followed by Work Ethic. Exact scores matter more than the star shortcut.</p></section>
  <div class="pe-candidate-list">${candidates.map(c=>candidateCard(c,selectedLocation)).join('')}</div>
  <div class="pe-two"><button class="pe-btn ghost" data-pe-view="compare" data-location="${selectedLocation}">COMPARE</button><button class="pe-btn ghost" data-pe-action="refresh-candidates">REFRESH · £20</button></div></div>`;
}
function candidateHtml(s,candidateId,locationId){
  const c=ensure(s).candidates.find(x=>x.id===candidateId);if(!c)return recruitHtml(s,locationId);
  selectedCandidate=c.id;selectedLocation=locationId||selectedLocation||openVacancies(s)[0];
  const defs=locationDefs();
  return `${header(s,'Candidate Profile')}<div class="pe-scroll"><section class="pe-profile-card"><div class="pe-big-avatar">${avatarFor(c.name)}</div><h1>${c.name}</h1><span class="pe-stars big">${starsText(c)}</span><p>${c.experience}</p><div class="pe-profile-meta"><span>Suitability <b>${Math.round(suitability(c))}/100</b></span><span>Salary <b>${money(c.salary)}/day</b></span></div></section>
  <section class="pe-card"><h3>Characteristics</h3>${attrBars(c)}</section>
  <section class="pe-card"><h3>Role read</h3><p>${candidateRead(c)}</p><small class="pe-hire-cost">Recruitment & onboarding: ${money(c.signingFee)}</small></section>
  <button class="pe-btn primary" data-pe-action="hire" data-candidate="${c.id}" data-location="${selectedLocation}">HIRE FOR ${defs[selectedLocation]?.name?.toUpperCase()||'LOCATION'}</button><button class="pe-btn ghost" data-pe-view="recruit" data-location="${selectedLocation}">BACK TO CANDIDATES</button></div>`;
}
function candidateRead(c){
  const top=ATTRS.slice().sort((a,b)=>c[b]-c[a]).slice(0,2).map(k=>ATTR_LABELS[k]).join(' and ');
  const low=ATTRS.slice().sort((a,b)=>c[a]-c[b])[0];
  return `${c.name}'s strongest areas are ${top}. ${ATTR_LABELS[low]} is the main development risk. Trainability ${c.trainability} indicates ${c.trainability>=75?'strong':'moderate'} long-term development potential.`;
}
function compareHtml(s,locationId){
  const cs=ensureCandidates(s).slice(0,2);selectedLocation=locationId||openVacancies(s)[0];
  if(cs.length<2)return recruitHtml(s,selectedLocation);
  return `${header(s,'Compare Candidates')}<div class="pe-scroll"><section class="pe-title"><span>LOCATION MANAGER</span><h1>Compare exact scores</h1><p>Two similar star ratings can hide very different management profiles.</p></section>
  <div class="pe-compare-head">${cs.map(c=>`<button data-pe-view="candidate" data-candidate="${c.id}" data-location="${selectedLocation}"><span class="pe-big-avatar small">${avatarFor(c.name)}</span><strong>${c.name.split(' ')[0]}</strong><span class="pe-stars">${starsText(c)}</span><small>${money(c.salary)}/day</small></button>`).join('')}</div>
  <section class="pe-card">${ATTRS.map(k=>`<div class="pe-compare-row"><strong>${ATTR_LABELS[k]}</strong><span>${cs[0][k]}</span><i></i><span>${cs[1][k]}</span></div>`).join('')}</section>
  <section class="pe-card"><h3>Location Manager suitability</h3><div class="pe-compare-row total"><strong>Weighted score</strong><span>${Math.round(suitability(cs[0]))}</span><i></i><span>${Math.round(suitability(cs[1]))}</span></div></section></div>`;
}
function managerHtml(s,managerId){
  const m=ensure(s).managers.find(x=>x.id===managerId);if(!m)return teamHtml(s);selectedManager=m.id;
  const defs=locationDefs(),days=Math.max(0,Number(s.day||1)-Number(m.hireDay||s.day));
  const effect=clamp((m.sales-50)*.0014+(m.workEthic-50)*.0005+(m.organisation-50)*.0005+(m.leadership-50)*.0003,-.05,.12);
  return `${header(s,'Employee Profile')}<div class="pe-scroll"><section class="pe-profile-card"><div class="pe-big-avatar">${avatarFor(m.name)}</div><span class="pe-role">LOCATION MANAGER</span><h1>${m.name}</h1><span class="pe-stars big">${starsText(m)}</span><p>${defs[m.assignedLocation]?.emoji} ${defs[m.assignedLocation]?.name} · ${money(m.salary)}/day</p></section>
  <div class="pe-metrics"><article><small>Days employed</small><strong>${days}</strong></article><article><small>Role suitability</small><strong>${Math.round(suitability(m))}</strong></article><article><small>Attendance</small><strong>${m.daysEmployed?pct2(m.daysPresent/m.daysEmployed*100):'—'}</strong></article><article><small>Courses</small><strong>${m.trainingHistory.length}</strong></article></div>
  <section class="pe-card"><h3>Characteristics</h3>${attrBars(m)}</section>
  <section class="pe-card"><h3>Current location effect</h3><p>When present, this manager contributes approximately <strong>${effect>=0?'+':''}${Math.round(effect*100)}% operational foot-traffic effect</strong> at their assigned site. Low Trustworthiness and Work Ethic can create explainable risks.</p></section>
  <button class="pe-btn primary" data-pe-view="training" data-manager="${m.id}">TRAIN EMPLOYEE</button><button class="pe-btn ghost" data-pe-view="team">BACK TO TEAM</button></div>`;
}
function pct2(n){return `${Math.round(n)}%`}
function trainingHtml(s,managerId){
  const m=ensure(s).managers.find(x=>x.id===managerId);if(!m)return teamHtml(s);selectedManager=m.id;
  return `${header(s,'Training Hub')}<div class="pe-scroll"><section class="pe-title"><span>EMPLOYEE DEVELOPMENT</span><h1>Train ${m.name.split(' ')[0]}</h1><p>Trainability ${m.trainability} changes how much each course improves the relevant characteristics.</p></section>
  <div class="pe-course-list">${Object.entries(COURSES).map(([id,c])=>`<button class="pe-course-card" data-pe-action="train" data-manager="${m.id}" data-course="${id}"><span>${c.icon}</span><div><strong>${c.name}</strong><small>${c.desc}</small></div><div><b>${money(c.cost)}</b><em>${courseTargets(c)}</em></div></button>`).join('')}</div>
  <section class="pe-card"><h3>Training history</h3>${m.trainingHistory.length?m.trainingHistory.slice(-4).reverse().map(t=>`<div class="pe-history"><span>🎓</span><div><strong>${t.courseName}</strong><small>Day ${t.day} · ${Object.values(t.gains).map(g=>`+${g.gain}`).join(', ')}</small></div></div>`).join(''):'<p>No courses completed yet.</p>'}</section></div>`;
}
function courseTargets(c){return Object.keys(c.gains).map(k=>ATTR_LABELS[k].replace(' Ability','')).join(' + ')}
function trainingResultHtml(s,record){
  const m=ensure(s).managers.find(x=>x.id===selectedManager);if(!m)return teamHtml(s);
  return `${header(s,'Training Result')}<div class="pe-scroll"><section class="pe-training-result"><div>🎓</div><span>COURSE COMPLETE</span><h1>${record.courseName}</h1><p>${m.name} completed training. Trainability ${record.trainability} influenced the result.</p></section>
  <section class="pe-card">${Object.entries(record.gains).map(([k,g])=>`<div class="pe-training-gain"><strong>${ATTR_LABELS[k]}</strong><span>${g.before} → <b>${g.after}</b></span><em>+${g.gain}</em></div>`).join('')}</section><button class="pe-btn primary" data-pe-view="manager" data-manager="${m.id}">CONTINUE</button></div>`;
}
function render(next='team',opts={}){
  const s=state();if(!s)return;ensure(s);processPayrollAndIncidents(s);view=next;
  if(opts.location)selectedLocation=opts.location;if(opts.candidate)selectedCandidate=opts.candidate;if(opts.manager)selectedManager=opts.manager;
  if(!panel){panel=document.createElement('div');panel.id='people-expansion-root';document.body.appendChild(panel)}
  let html='';
  if(next==='recruit')html=recruitHtml(s,opts.location||selectedLocation);
  else if(next==='candidate')html=candidateHtml(s,opts.candidate||selectedCandidate,opts.location||selectedLocation);
  else if(next==='compare')html=compareHtml(s,opts.location||selectedLocation);
  else if(next==='manager')html=managerHtml(s,opts.manager||selectedManager);
  else if(next==='training')html=trainingHtml(s,opts.manager||selectedManager);
  else if(next==='trainingResult')html=trainingResultHtml(s,opts.record);
  else html=teamHtml(s);
  panel.innerHTML=`<main class="pe-shell">${html}</main>`;panel.classList.add('open');
}
function close(){panel?.classList.remove('open')}
function decorateDashboard(s){
  if(!permanentSiteIds(s).length)return;
  const grid=document.querySelector('.dashboard-grid');if(!grid||grid.querySelector('[data-pe-entry="team"]'))return;
  const p=ensure(s),vac=openVacancies(s).length;
  const b=document.createElement('button');b.className='dashboard-card pe-dashboard-card';b.dataset.peEntry='team';
  b.innerHTML=`<span class="big-emoji">👥</span><div><strong>Management Team</strong><small>${p.managers.length} managers · ${vac} vacancies</small></div><span>›</span>`;grid.appendChild(b);
}
function decorateLocationPanel(s){
  const root=document.querySelector('#location-development-root.open .ld-scroll');if(!root||root.querySelector('.pe-location-manager-card'))return;
  const locButton=root.querySelector('[data-location]');const id=locButton?.dataset.location;if(!id||!s.locationDevelopment?.sites?.[id]?.permanent)return;
  const m=managerForLocation(s,id);const defs=locationDefs();
  const card=document.createElement('section');card.className='ld-card pe-location-manager-card';
  card.innerHTML=m?`<div class="pe-inline-manager"><span class="pe-avatar">${avatarFor(m.name)}</span><div><small>LOCATION MANAGER</small><strong>${m.name}</strong><span class="pe-stars">${starsText(m)}</span></div><button data-pe-view="manager" data-manager="${m.id}">VIEW</button></div>`:
  `<div class="pe-inline-manager"><span class="pe-avatar">👤</span><div><small>MANAGEMENT AVAILABLE</small><strong>Hire a Location Manager</strong><span>${defs[id].name} is permanent and eligible for delegation.</span></div><button data-pe-view="recruit" data-location="${id}">RECRUIT</button></div>`;
  root.querySelector('.ld-two-actions')?.insertAdjacentElement('beforebegin',card)||root.appendChild(card);
}
function decorateResults(s){
  if(!s.lastResult)return;
  const shell=document.querySelector('.results-shell');if(!shell||shell.querySelector('.pe-payroll-card'))return;
  processPayrollAndIncidents(s);
  const payroll=Number(s.lastResult.managerPayroll||0),variance=Number(s.lastResult.cashVariance||0);if(!payroll&&!variance)return;
  const c=document.createElement('section');c.className='pe-payroll-card';
  c.innerHTML=`<small>MANAGEMENT COSTS</small><strong>${money(payroll+variance)}</strong><span>${payroll?`Payroll ${money(payroll)}`:''}${variance?` · Cash variance ${money(variance)}`:''}</span>`;
  shell.querySelector('.results-grid')?.insertAdjacentElement('afterend',c);
}
function decorate(){
  const s=state();if(!s)return;ensure(s);processPayrollAndIncidents(s);decorateDashboard(s);decorateLocationPanel(s);decorateResults(s);
}
function toast(msg,tone=''){let x=document.querySelector('.pe-toast');x?.remove();x=document.createElement('div');x.className=`pe-toast ${tone}`;x.textContent=msg;document.body.appendChild(x);requestAnimationFrame(()=>x.classList.add('show'));setTimeout(()=>{x.classList.remove('show');setTimeout(()=>x.remove(),200)},2200)}
document.addEventListener('click',e=>{
  const start=e.target.closest('[data-action="start-selling"]');if(start){const s=state();if(s)applyManagerDayEffect(s);return}
  const entry=e.target.closest('[data-pe-entry]');if(entry){e.preventDefault();e.stopPropagation();render('team');return}
  const v=e.target.closest('[data-pe-view]');if(v){e.preventDefault();e.stopPropagation();render(v.dataset.peView,{location:v.dataset.location,candidate:v.dataset.candidate,manager:v.dataset.manager});return}
  const a=e.target.closest('[data-pe-action]');if(!a)return;e.preventDefault();e.stopPropagation();const s=state();if(!s)return;
  if(a.dataset.peAction==='close')close();
  if(a.dataset.peAction==='refresh-candidates')refreshCandidates(s);
  if(a.dataset.peAction==='hire')hire(s,a.dataset.candidate,a.dataset.location);
  if(a.dataset.peAction==='train')train(s,a.dataset.manager,a.dataset.course);
},true);
const observer=new MutationObserver(()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;decorate()})});observer.observe(document.documentElement,{childList:true,subtree:true});setTimeout(decorate,900);
window.__LBT_PEOPLE_TEST__={ensure,suitability,stars,salaryFor,permanentSiteIds,openVacancies,processPayrollAndIncidents,applyManagerDayEffect};
})();