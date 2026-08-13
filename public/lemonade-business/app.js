(() => {
  const SAVE_KEY='lemon-stand-empire-v01';
  const $=s=>document.querySelector(s);
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  const money=n=>`£${Number(n).toFixed(2)}`;
  const pick=a=>a[Math.floor(Math.random()*a.length)];

  const WEATHER={
    hot:{label:'Hot',emoji:'🔥',traffic:1.45,ideal:{lemons:[3,5],sugar:[2,4],ice:[4,6]}},
    sunny:{label:'Sunny',emoji:'☀️',traffic:1.22,ideal:{lemons:[3,5],sugar:[2,4],ice:[3,5]}},
    warm:{label:'Warm',emoji:'🌤️',traffic:1,ideal:{lemons:[3,5],sugar:[3,5],ice:[2,4]}},
    cloudy:{label:'Cloudy',emoji:'☁️',traffic:.84,ideal:{lemons:[3,5],sugar:[3,5],ice:[1,3]}},
    rainy:{label:'Rainy',emoji:'🌧️',traffic:.6,ideal:{lemons:[2,4],sugar:[3,6],ice:[1,2]}},
    stormy:{label:'Stormy',emoji:'⛈️',traffic:.35,ideal:{lemons:[2,4],sugar:[4,6],ice:[0,2]}}
  };
  const SUPPLIES={
    lemons:{label:'Lemons',emoji:'🍋',pack:20,cost:2.4,life:3},
    sugar:{label:'Sugar',emoji:'🍬',pack:20,cost:1.8,life:6},
    ice:{label:'Ice',emoji:'🧊',pack:30,cost:1.0,life:1},
    cups:{label:'Cups',emoji:'🥤',pack:25,cost:1.5,life:null}
  };
  const EVENTS=[
    {name:'No special event',desc:'A normal trading day.',traffic:1},
    {name:'School Trip',desc:'More young customers nearby.',traffic:1.25,priceBias:-.08},
    {name:'Street Market',desc:'Extra local foot traffic today.',traffic:1.35},
    {name:'Roadworks',desc:'Fewer people pass the stand.',traffic:.72},
    {name:'Heat Wave Buzz',desc:'Everyone is talking about cold drinks.',traffic:1.28},
    {name:'Charity Run',desc:'A burst of thirsty runners is expected.',traffic:1.22}
  ];
  const UPGRADES={
    sign:{name:'Bright Sign',cost:8,desc:'+10% noticing chance'},
    cooler:{name:'Cool Box',cost:12,desc:'Ice can survive overnight'},
    speed:{name:'Fast Pour Jug',cost:15,desc:'+30% serving speed'},
    storage:{name:'Storage Crate',cost:10,desc:'+80 ingredient capacity'},
    recipe:{name:'Recipe Notebook',cost:9,desc:'+6 satisfaction points'},
    awning:{name:'Rain Awning',cost:16,desc:'Reduces bad-weather traffic loss'}
  };

  let state=null, timer=null, sim=null;

  function newState(){
    return {version:1,stage:'planning',day:1,cash:22,reputation:50,weather:rollWeather(),event:pick(EVENTS),recipe:{lemons:3,sugar:3,ice:3},price:1.5,inventory:{lemons:[],sugar:[],ice:[],cups:[]},upgrades:{},stats:{cups:0,revenue:0,profit:0,days:0,waste:0,bestProfit:null,worstProfit:null,highestCash:22,profitableDays:0},lastResult:null};
  }
  function rollWeather(){const r=Math.random();return r<.12?'hot':r<.37?'sunny':r<.67?'warm':r<.84?'cloudy':r<.96?'rainy':'stormy'}
  function save(){localStorage.setItem(SAVE_KEY,JSON.stringify(state))}
  function load(){try{return JSON.parse(localStorage.getItem(SAVE_KEY))}catch{return null}}
  function qty(id){return state.inventory[id].reduce((s,b)=>s+b.qty,0)}
  function cap(){return 120+(state.upgrades.storage?80:0)}
  function used(){return Object.keys(SUPPLIES).reduce((s,id)=>s+qty(id),0)}
  function makeable(){const r=state.recipe;return Math.max(0,Math.floor(Math.min(r.lemons?qty('lemons')/r.lemons:9999,r.sugar?qty('sugar')/r.sugar:9999,r.ice?qty('ice')/r.ice:9999,qty('cups'))))}
  function consume(id,n){let left=n;for(const b of state.inventory[id]){const take=Math.min(left,b.qty);b.qty-=take;left-=take;if(left<=0)break}state.inventory[id]=state.inventory[id].filter(b=>b.qty>0)}
  function recipeScore(){
    const w=WEATHER[state.weather],r=state.recipe;
    const scoreOne=(v,[lo,hi])=>v>=lo&&v<=hi?1:Math.max(.25,1-Math.min(Math.abs(v-lo),Math.abs(v-hi))*.2);
    let q=scoreOne(r.lemons,w.ideal.lemons)*.35+scoreOne(r.sugar,w.ideal.sugar)*.3+scoreOne(r.ice,w.ideal.ice)*.35;
    if(state.upgrades.recipe)q+=.06;return clamp(q,.2,1.15)
  }
  function priceScore(price=state.price){return clamp(1.4-(price-1)*.48,.15,1.3)}
  function trafficBase(){
    let weather=WEATHER[state.weather].traffic;
    if(state.upgrades.awning&&weather<1)weather+=(1-weather)*.35;
    return Math.round((52+state.day*.6)*weather*state.event.traffic)
  }
  function buy(id){const d=SUPPLIES[id];if(state.cash<d.cost)return toast('Not enough cash.');if(used()+d.pack>cap())return toast('Storage is full.');state.cash-=d.cost;state.inventory[id].push({qty:d.pack,bought:state.day});save();renderModal('supplies')}
  function buyUpgrade(id){const u=UPGRADES[id];if(state.upgrades[id])return;if(state.cash<u.cost)return toast('Not enough cash.');state.cash-=u.cost;state.upgrades[id]=true;save();renderModal('upgrades')}
  function adjustRecipe(k,delta){state.recipe[k]=clamp(state.recipe[k]+delta,0,6);save();renderModal('recipe')}
  function setPrice(v){state.price=clamp(Number(v)||.5,.5,5);save()}
  function toast(msg){let n=document.createElement('div');n.className='notice';n.style.cssText='position:fixed;z-index:100;left:50%;top:16px;transform:translateX(-50%);box-shadow:var(--shadow);max-width:90%;';n.textContent=msg;document.body.appendChild(n);setTimeout(()=>n.remove(),1800)}

  function startDay(){
    if(makeable()<1)return toast('Buy enough ingredients and cups to make at least one lemonade.');
    state.stage='trading';save();render();beginSimulation();
  }
  function beginSimulation(){
    if(timer)clearInterval(timer);
    sim={elapsed:0,duration:32,passed:0,noticed:0,considered:0,queued:0,served:0,lostQueue:0,rejectedPrice:0,rejectedRecipe:0,stockouts:0,revenue:0,feedback:[],queue:[],nextId:1};
    timer=setInterval(tick,700);tick();
  }
  function tick(){
    if(!sim||state.stage!=='trading')return;
    sim.elapsed++;
    const target=trafficBase();
    const spawnChance=clamp(target/sim.duration*.55,.45,1.7);
    const count=(Math.random()<spawnChance?1:0)+(Math.random()<Math.max(0,spawnChance-1)?1:0);
    for(let i=0;i<count;i++)spawnCustomer();
    serveQueue();
    updateSimUI();
    if(sim.elapsed>=sim.duration){clearInterval(timer);timer=null;finishDay()}
  }
  function spawnCustomer(){
    const id=sim.nextId++,types=['🧍','👩','👨','🧑','👵','👦'];
    sim.passed++;
    const noticeChance=clamp(.48+(state.upgrades.sign?.1:0)+(state.reputation-50)/350,.2,.9);
    if(Math.random()>noticeChance){animateCustomer(id,pick(types),'Passing by',false);return}
    sim.noticed++;
    const pScore=priceScore()+(state.event.priceBias||0),qScore=recipeScore();
    if(Math.random()>clamp(.35+pScore*.43,.2,.88)){sim.rejectedPrice++;animateCustomer(id,pick(types),'Too expensive!',false);sim.feedback.push('Too expensive!');return}
    sim.considered++;
    if(Math.random()>clamp(.35+qScore*.5,.2,.94)){sim.rejectedRecipe++;const m=recipeFeedback(false);animateCustomer(id,pick(types),m,false);sim.feedback.push(m);return}
    if(makeable()<1){sim.stockouts++;animateCustomer(id,pick(types),'Sold out!',false);sim.feedback.push('Sold out!');return}
    const maxQ=state.upgrades.speed?6:4;
    if(sim.queue.length>=maxQ){sim.lostQueue++;animateCustomer(id,pick(types),'Queue is too long.',false);sim.feedback.push('Queue is too long.');return}
    sim.queued++;sim.queue.push({id,emoji:pick(types),wait:0});animateCustomer(id,sim.queue.at(-1).emoji,'Joining queue…',true)
  }
  function serveQueue(){
    if(!sim.queue.length)return;
    sim.queue.forEach(x=>x.wait++);
    const impat=sim.queue.findIndex(x=>x.wait>(state.upgrades.speed?8:6)&&Math.random()<.22);
    if(impat>=0){const [c]=sim.queue.splice(impat,1);sim.lostQueue++;setThought(c.id,'Waited too long!');removeCustomer(c.id,700)}
    const interval=state.upgrades.speed?2:3;
    if(sim.elapsed%interval!==0||!sim.queue.length)return;
    const c=sim.queue.shift();
    if(makeable()<1){sim.stockouts++;setThought(c.id,'Sold out!');removeCustomer(c.id,700);return}
    consume('lemons',state.recipe.lemons);consume('sugar',state.recipe.sugar);consume('ice',state.recipe.ice);consume('cups',1);
    sim.served++;sim.revenue+=state.price;const fb=recipeFeedback(true);sim.feedback.push(fb);setThought(c.id,fb);moveToStand(c.id);setTimeout(()=>removeCustomer(c.id,500),900)
  }
  function recipeFeedback(good){
    const q=recipeScore();if(good&&q>.92)return pick(['Great lemonade!','Perfect for this weather.','That hits the spot!']);
    const w=WEATHER[state.weather].ideal,r=state.recipe;
    if(r.sugar<w.sugar[0])return 'Needs more sugar.';if(r.sugar>w.sugar[1])return 'A bit too sweet.';if(r.lemons>w.lemons[1])return 'Too sour.';if(r.ice<w.ice[0])return 'Needs more ice.';if(r.ice>w.ice[1])return 'Too icy.';return good?'Nice lemonade!':'Not quite for me.'
  }
  function animateCustomer(id,emoji,msg,queue){
    const area=$('#simArea');if(!area)return;const c=document.createElement('div');c.className='customer';c.dataset.id=id;c.textContent=emoji;c.style.left='-42px';area.appendChild(c);requestAnimationFrame(()=>{c.style.left=queue?`${Math.max(20,area.clientWidth-250-Math.random()*90)}px`:`${area.clientWidth+20}px`});if(msg)setThought(id,msg);if(!queue)setTimeout(()=>removeCustomer(id),1200)
  }
  function setThought(id,msg){const area=$('#simArea');if(!area)return;let c=area.querySelector(`.customer[data-id="${id}"]`);if(!c)return;let t=area.querySelector(`.thought[data-for="${id}"]`);if(!t){t=document.createElement('div');t.className='thought';t.dataset.for=id;area.appendChild(t)}t.textContent=msg;const left=parseFloat(c.style.left)||20;t.style.left=`${clamp(left-25,4,area.clientWidth-140)}px`}
  function moveToStand(id){const area=$('#simArea');const c=area?.querySelector(`.customer[data-id="${id}"]`);if(c)c.style.left=`${Math.max(10,area.clientWidth-175)}px`}
  function removeCustomer(id,delay=0){setTimeout(()=>{document.querySelector(`.customer[data-id="${id}"]`)?.remove();document.querySelector(`.thought[data-for="${id}"]`)?.remove()},delay)}
  function updateSimUI(){
    const p=$('#dayProgress');if(p)p.style.width=`${Math.min(100,sim.elapsed/sim.duration*100)}%`;
    const labels={passed:sim.passed,noticed:sim.noticed,queued:sim.queue.length,served:sim.served,revenue:money(sim.revenue)};
    Object.entries(labels).forEach(([k,v])=>{const el=$(`#sim-${k}`);if(el)el.textContent=v});
  }
  function finishDay(){
    const satisfaction=Math.round(clamp(recipeScore()*72+priceScore()*18-(sim.lostQueue*1.2),0,100));
    const repChange=satisfaction>=75?2:satisfaction>=58?1:satisfaction<38?-2:satisfaction<50?-1:0;
    state.reputation=clamp(state.reputation+repChange,0,100);
    const rent=state.day>8?1:0,operating=rent;
    state.cash+=sim.revenue-operating;
    const result={day:state.day,weather:state.weather,event:state.event.name,passed:sim.passed,noticed:sim.noticed,considered:sim.considered,queued:sim.queued,served:sim.served,lostQueue:sim.lostQueue,rejectedPrice:sim.rejectedPrice,rejectedRecipe:sim.rejectedRecipe,stockouts:sim.stockouts,revenue:sim.revenue,rent,operating,profit:sim.revenue-operating,satisfaction,repChange,feedback:sim.feedback.slice(-6),waste:{lemons:0,sugar:0,ice:0,cups:0}};
    state.lastResult=result;state.stage='results';state.stats.cups+=sim.served;state.stats.revenue+=sim.revenue;state.stats.profit+=result.profit;state.stats.days++;if(result.profit>0)state.stats.profitableDays++;state.stats.bestProfit=state.stats.bestProfit===null?result.profit:Math.max(state.stats.bestProfit,result.profit);state.stats.worstProfit=state.stats.worstProfit===null?result.profit:Math.min(state.stats.worstProfit,result.profit);state.stats.highestCash=Math.max(state.stats.highestCash,state.cash);save();render();
  }
  function advanceDay(){
    const waste={lemons:0,sugar:0,ice:0,cups:0};
    Object.entries(SUPPLIES).forEach(([id,d])=>{
      if(id==='ice'&&!state.upgrades.cooler){waste.ice=qty('ice');state.inventory.ice=[];return}
      if(d.life!==null){const life=id==='ice'&&state.upgrades.cooler?2:d.life;state.inventory[id]=state.inventory[id].filter(b=>{if(state.day+1-b.bought>=life){waste[id]+=b.qty;return false}return true})}
    });
    state.stats.waste+=Object.values(waste).reduce((a,b)=>a+b,0);if(state.lastResult)state.lastResult.waste=waste;
    state.day++;state.weather=rollWeather();state.event=pick(EVENTS);state.stage='planning';save();render();
  }

  function titleScreen(){const has=!!load();return `<main class="shell"><section class="hero"><h1>Lemon Stand<br>Empire</h1><p>Start with a tiny stand, make smart daily decisions, watch customers react, and grow into a lemonade business worth talking about.</p><div class="actions"><button id="newBtn" class="btn primary">NEW GAME</button><button id="continueBtn" class="btn lemon" ${has?'':'disabled'}>CONTINUE GAME${has?'':' — NO SAVE'}</button><button id="howBtn" class="btn">HOW TO PLAY</button><button id="resetBtn" class="btn danger" ${has?'':'disabled'}>RESET SAVE</button></div></section><p class="footer-note">Version 0.1 · Local save · Touch-friendly</p></main>`}
  function header(stage){return `<div class="topbar"><div class="brand"><div class="brand-badge">🍋</div><div>Lemon Stand Empire</div></div><div class="stage">${stage}</div></div>`}
  function kpis(){return `<div class="kpis"><div class="kpi"><b>${money(state.cash)}</b><span>Cash</span></div><div class="kpi"><b>${state.reputation}/100</b><span>Reputation</span></div><div class="kpi"><b>${WEATHER[state.weather].emoji} ${WEATHER[state.weather].label}</b><span>Weather</span></div><div class="kpi"><b>${makeable()}</b><span>Cups possible</span></div></div>`}
  function inventoryHTML(){return `<div class="inventory">${Object.entries(SUPPLIES).map(([id,d])=>`<div class="inv"><span class="emoji">${d.emoji}</span><b>${qty(id)} ${d.label}</b><small>${d.life===null?'Keeps indefinitely':id==='ice'&&!state.upgrades.cooler?'Melts tonight':`Shelf life ${id==='ice'&&state.upgrades.cooler?2:d.life} days`}</small></div>`).join('')}</div>`}
  function planning(){return `<main class="shell">${header(`DAY ${state.day} · PLANNING`)}<section class="card">${kpis()}<div class="notice"><b>Today: ${state.event.name}</b><br>${state.event.desc}</div></section><div class="grid"><section class="card half"><h2>Today’s setup</h2><div class="field"><label>Recipe per cup</label><div>🍋 ${state.recipe.lemons} &nbsp; 🍬 ${state.recipe.sugar} &nbsp; 🧊 ${state.recipe.ice}</div></div><div class="field"><label>Selling price</label><div><b>${money(state.price)}</b> per cup</div></div><div class="actions"><button class="btn" data-modal="recipe">CHANGE RECIPE</button><button class="btn" data-modal="price">CHANGE PRICE</button></div></section><section class="card half"><h2>Inventory</h2>${inventoryHTML()}<div class="actions" style="margin-top:12px"><button class="btn lemon" data-modal="supplies">BUY SUPPLIES</button><button class="btn" data-modal="upgrades">UPGRADES</button></div></section><section class="card"><div class="notice ${makeable()<1?'danger-note':'good-note'}">${makeable()<1?'You cannot open yet — you need enough ingredients and cups for at least 1 drink.':`Ready to trade. Current stock can make up to ${makeable()} cups.`}</div><button id="openBtn" class="btn primary big">OPEN FOR BUSINESS</button></section><section class="card"><div class="actions"><button class="btn" data-modal="stats">STATISTICS</button><button id="titleBtn" class="btn">TITLE SCREEN</button></div></section></div></main>`}
  function trading(){return `<main class="shell">${header(`DAY ${state.day} · OPEN FOR BUSINESS`)}<section class="card">${kpis()}<div class="progress" style="margin-top:12px"><div id="dayProgress" style="width:0%"></div></div><div class="ticker" style="margin-top:10px"><span class="pill">Passed <b id="sim-passed">0</b></span><span class="pill">Noticed <b id="sim-noticed">0</b></span><span class="pill">Queue <b id="sim-queued">0</b></span><span class="pill">Served <b id="sim-served">0</b></span><span class="pill">Revenue <b id="sim-revenue">£0.00</b></span></div></section><section class="card"><div id="simArea" class="sim"><div class="path"></div><div class="stand">LEMON<br>STAND<br>${money(state.price)}</div></div></section><section class="card"><h3>Live setup</h3>${inventoryHTML()}</section></main>`}
  function results(){const r=state.lastResult,cls=r.profit>=0?'positive':'negative';return `<main class="shell">${header(`DAY ${r.day} · RESULTS`)}<section class="hero"><h1 style="font-size:42px">Day ${r.day} complete</h1><p>${WEATHER[r.weather].emoji} ${WEATHER[r.weather].label} · ${r.event}</p><div class="kpis"><div class="kpi"><b>${r.served}</b><span>Cups sold</span></div><div class="kpi"><b>${money(r.revenue)}</b><span>Revenue</span></div><div class="kpi"><b class="${cls}">${money(r.profit)}</b><span>Day profit</span></div><div class="kpi"><b>${r.satisfaction}/100</b><span>Satisfaction</span></div></div></section><div class="grid"><section class="card half"><h2>Customers</h2><table class="report-table"><tr><td>Passed stand</td><td>${r.passed}</td></tr><tr><td>Noticed stand</td><td>${r.noticed}</td></tr><tr><td>Considered buying</td><td>${r.considered}</td></tr><tr><td>Joined queue</td><td>${r.queued}</td></tr><tr><td>Served</td><td>${r.served}</td></tr><tr><td>Queue walkaways</td><td>${r.lostQueue}</td></tr><tr><td>Price refusals</td><td>${r.rejectedPrice}</td></tr><tr><td>Recipe refusals</td><td>${r.rejectedRecipe}</td></tr><tr><td>Stockouts</td><td>${r.stockouts}</td></tr></table></section><section class="card half"><h2>Money & reputation</h2><table class="report-table"><tr><td>Revenue</td><td>${money(r.revenue)}</td></tr><tr><td>Rent / operating</td><td>${money(r.operating)}</td></tr><tr><td>Profit</td><td class="${cls}">${money(r.profit)}</td></tr><tr><td>Cash balance</td><td>${money(state.cash)}</td></tr><tr><td>Reputation change</td><td class="${r.repChange>=0?'positive':'negative'}">${r.repChange>=0?'+':''}${r.repChange}</td></tr></table><h3 style="margin-top:16px">Recent feedback</h3><div class="notice">${r.feedback.length?r.feedback.map(x=>`“${x}”`).join('<br>'):'No customer comments today.'}</div></section><section class="card"><button id="nextBtn" class="btn primary big">CONTINUE TO NEXT DAY</button></section></div></main>`}

  function modal(kind){
    let body='';
    if(kind==='supplies')body=`<h2>Buy supplies</h2><div class="notice">Storage: ${used()} / ${cap()} units · Cash: ${money(state.cash)}</div>${Object.entries(SUPPLIES).map(([id,d])=>`<div class="shop-row"><div><b>${d.emoji} ${d.label}</b><p>Pack of ${d.pack} · ${d.life===null?'does not spoil':id==='ice'?'very perishable':`shelf life ${d.life} days`}</p></div><button class="btn lemon buy" data-id="${id}">${money(d.cost)}</button></div>`).join('')}`;
    if(kind==='recipe')body=`<h2>Recipe</h2><p>Weather changes what customers prefer, so there is no single perfect recipe.</p>${['lemons','sugar','ice'].map(k=>`<div class="shop-row"><div><b>${SUPPLIES[k].emoji} ${SUPPLIES[k].label} per cup</b><p>Today’s weather preference: ${WEATHER[state.weather].ideal[k][0]}–${WEATHER[state.weather].ideal[k][1]}</p></div><div class="stepper"><button data-r="${k}" data-d="-1">−</button><strong>${state.recipe[k]}</strong><button data-r="${k}" data-d="1">+</button></div></div>`).join('')}<div class="notice">Current recipe quality estimate: <b>${Math.round(recipeScore()*100)}%</b></div>`;
    if(kind==='price')body=`<h2>Selling price</h2><p>Higher prices make more per sale but reduce willingness to buy.</p><div class="field"><label>Price per cup</label><input id="priceInput" type="range" min="0.5" max="5" step="0.1" value="${state.price}"><div style="font-size:30px;font-weight:900" id="priceRead">${money(state.price)}</div></div><div class="notice">Current price attractiveness: <b>${Math.round(priceScore()*100)}%</b></div>`;
    if(kind==='upgrades')body=`<h2>Upgrades</h2><p>Operations matter as much as advertising.</p>${Object.entries(UPGRADES).map(([id,u])=>`<div class="upgrade-row"><div><b>${u.name}</b><p>${u.desc}</p></div>${state.upgrades[id]?'<span class="pill">OWNED</span>':`<button class="btn lemon upg" data-id="${id}">${money(u.cost)}</button>`}</div>`).join('')}`;
    if(kind==='stats'){const s=state.stats;body=`<h2>Lifetime statistics</h2><table class="report-table"><tr><td>Days played</td><td>${s.days}</td></tr><tr><td>Total cups sold</td><td>${s.cups}</td></tr><tr><td>Lifetime revenue</td><td>${money(s.revenue)}</td></tr><tr><td>Lifetime profit</td><td>${money(s.profit)}</td></tr><tr><td>Profitable days</td><td>${s.profitableDays}</td></tr><tr><td>Total waste</td><td>${s.waste}</td></tr><tr><td>Best day profit</td><td>${s.bestProfit===null?'—':money(s.bestProfit)}</td></tr><tr><td>Worst day profit</td><td>${s.worstProfit===null?'—':money(s.worstProfit)}</td></tr><tr><td>Highest cash</td><td>${money(s.highestCash)}</td></tr></table>`}
    if(kind==='how')body=`<h2>How to play</h2><p>Every day has three clear stages: <b>Planning → Trading → Results</b>.</p><p>During planning, buy stock, adjust your recipe and choose a selling price. Weather and events affect demand. When ready, press <b>OPEN FOR BUSINESS</b>.</p><p>Customers then arrive individually. They may ignore you, reject the price, dislike the recipe, join the queue, buy, or leave if service is too slow.</p><p>After trading, review the day and press <b>CONTINUE TO NEXT DAY</b>. Ingredients age, ice may melt, and the next forecast/event is generated.</p>`;
    return `<div class="modal-wrap"><div class="modal"><div class="modal-head"><div></div><button class="x" id="closeModal">×</button></div>${body}</div></div>`
  }
  function renderModal(kind){document.querySelector('.modal-wrap')?.remove();document.body.insertAdjacentHTML('beforeend',modal(kind));bindModal(kind)}
  function bindModal(kind){$('#closeModal').onclick=()=>document.querySelector('.modal-wrap')?.remove();document.querySelector('.modal-wrap').onclick=e=>{if(e.target.classList.contains('modal-wrap'))e.currentTarget.remove()};document.querySelectorAll('.buy').forEach(b=>b.onclick=()=>buy(b.dataset.id));document.querySelectorAll('.upg').forEach(b=>b.onclick=()=>buyUpgrade(b.dataset.id));document.querySelectorAll('[data-r]').forEach(b=>b.onclick=()=>adjustRecipe(b.dataset.r,Number(b.dataset.d)));if(kind==='price'){const i=$('#priceInput');i.oninput=()=>{$('#priceRead').textContent=money(i.value)};i.onchange=()=>{setPrice(i.value);renderModal('price')}}}
  function bind(){
    $('#newBtn')?.addEventListener('click',()=>{if(load()&&!confirm('Start a new game and replace your current save?'))return;state=newState();save();render()});
    $('#continueBtn')?.addEventListener('click',()=>{state=load();render();if(state.stage==='trading'){state.stage='planning';save();render();toast('Trading was interrupted, so the day returned to planning.')}});
    $('#howBtn')?.addEventListener('click',()=>renderModal('how'));
    $('#resetBtn')?.addEventListener('click',()=>{if(confirm('Permanently reset the local save?')){localStorage.removeItem(SAVE_KEY);state=null;render()}});
    document.querySelectorAll('[data-modal]').forEach(b=>b.addEventListener('click',()=>renderModal(b.dataset.modal)));
    $('#openBtn')?.addEventListener('click',startDay);$('#nextBtn')?.addEventListener('click',advanceDay);$('#titleBtn')?.addEventListener('click',()=>{state=null;render()});
  }
  function render(){const app=$('#app');if(!state)app.innerHTML=titleScreen();else if(state.stage==='planning')app.innerHTML=planning();else if(state.stage==='trading')app.innerHTML=trading();else app.innerHTML=results();bind()}

  window.__LSE_TEST__={newState,recipeScore:()=>recipeScore(),makeable:()=>makeable(),advanceDay:()=>advanceDay(),getState:()=>state,setState:s=>state=s,startDay:()=>startDay()};
  render();
})();
