(()=>{
const css=`
.ability-panel{margin-top:20px;padding:18px;border:1px solid #334155;border-radius:18px;background:#0b1220aa}.ability-top{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px}.ability-top h3{margin:0;font-size:20px}.ability-note{font-size:12px;color:#94a3b8;line-height:1.4}.roll-btn{border:0;border-radius:14px;padding:12px 15px;background:#2563eb;color:#fff;font:inherit;font-weight:900;cursor:pointer;white-space:nowrap}.roll-btn:disabled{opacity:.45;cursor:not-allowed}.dice-row{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:14px 0}.die-card{border:1px solid #475569;border-radius:16px;background:#111827;padding:12px;text-align:center}.die{width:58px;height:58px;margin:0 auto 8px;display:grid;place-items:center;border-radius:14px;background:#f8fafc;color:#0f172a;font-size:29px;font-weight:950;box-shadow:inset 0 -5px 0 #cbd5e1}.die.rolling{animation:diceShake .12s linear infinite}.die-label{font-size:11px;color:#94a3b8;font-weight:900;letter-spacing:.08em}.ability-list{display:grid;gap:9px}.ability-row{display:grid;grid-template-columns:1fr auto auto;align-items:center;gap:10px;padding:10px 12px;border:1px solid #334155;border-radius:14px;background:#111827}.ability-name{font-weight:900}.ability-name small{display:block;font-weight:600;color:#94a3b8;margin-top:2px}.score{font-size:22px;font-weight:950;min-width:30px;text-align:center}.stepper{display:flex;align-items:center;gap:6px}.stepper button{width:34px;height:34px;border-radius:10px;border:1px solid #475569;background:#1e293b;color:#fff;font-size:20px;font-weight:900}.stepper button:disabled{opacity:.3}.points-bar{display:flex;justify-content:space-between;align-items:center;margin-top:12px;padding-top:12px;border-top:1px solid #334155;font-size:13px;color:#cbd5e1}.points-left{font-size:18px;font-weight:950;color:#86efac}.roll-meta{font-size:12px;color:#93c5fd;font-weight:800}.ability-warning{color:#fbbf24;font-size:12px;margin-top:10px;min-height:16px}@keyframes diceShake{0%{transform:rotate(-5deg) scale(.96)}50%{transform:rotate(5deg) scale(1.04)}100%{transform:rotate(-5deg) scale(.96)}}
@media(max-width:760px){.ability-top{align-items:flex-start}.dice-row{gap:7px}.die-card{padding:9px}.die{width:50px;height:50px}.ability-row{grid-template-columns:1fr auto}.stepper{grid-column:1/-1;justify-content:flex-end}}
`;
const st=document.createElement('style');st.textContent=css;document.head.appendChild(st);

let rolled=false, rollsLeft=3, bonusPool=5;
let base={strength:1,intelligence:1,charisma:1};
let bonus={strength:0,intelligence:0,charisma:0};

const panel=document.createElement('div');panel.className='ability-panel';panel.innerHTML=`
  <div class="ability-top">
    <div><h3>Starting abilities</h3><div class="ability-note">Roll one die for each core ability. You get up to 3 rolls. After a roll, spend 5 bonus points to shape your character.</div></div>
    <button id="rollAbilities" class="roll-btn">🎲 Roll Dice</button>
  </div>
  <div class="dice-row">
    <div class="die-card"><div class="die" id="dieStr">?</div><div class="die-label">STRENGTH</div></div>
    <div class="die-card"><div class="die" id="dieInt">?</div><div class="die-label">INTELLIGENCE</div></div>
    <div class="die-card"><div class="die" id="dieCha">?</div><div class="die-label">CHARISMA</div></div>
  </div>
  <div class="ability-list">
    <div class="ability-row"><div class="ability-name">Strength<small>Fitness, physical work and future fights</small></div><div class="score" id="scoreStr">—</div><div class="stepper"><button data-stat="strength" data-step="-1">−</button><button data-stat="strength" data-step="1">+</button></div></div>
    <div class="ability-row"><div class="ability-name">Intelligence<small>Study, careers and earning potential</small></div><div class="score" id="scoreInt">—</div><div class="stepper"><button data-stat="intelligence" data-step="-1">−</button><button data-stat="intelligence" data-step="1">+</button></div></div>
    <div class="ability-row"><div class="ability-name">Charisma<small>Social options, tips and future relationships</small></div><div class="score" id="scoreCha">—</div><div class="stepper"><button data-stat="charisma" data-step="-1">−</button><button data-stat="charisma" data-step="1">+</button></div></div>
  </div>
  <div class="points-bar"><span>Bonus points remaining</span><span class="points-left" id="pointsLeft">5</span><span class="roll-meta" id="rollMeta">3 rolls available</span></div>
  <div id="abilityWarning" class="ability-warning">Roll the dice before starting your life.</div>`;
const error=document.getElementById('setupError');error.parentNode.insertBefore(panel,error);

function total(k){return base[k]+bonus[k]}
function render(){
  const map={strength:'Str',intelligence:'Int',charisma:'Cha'};
  Object.keys(map).forEach(k=>{document.getElementById('score'+map[k]).textContent=rolled?total(k):'—'});
  document.getElementById('pointsLeft').textContent=bonusPool;
  document.getElementById('rollMeta').textContent=rollsLeft+' roll'+(rollsLeft===1?'':'s')+' left';
  document.querySelectorAll('.stepper button').forEach(b=>{const k=b.dataset.stat,step=Number(b.dataset.step);b.disabled=!rolled||(step>0&&(bonusPool<=0||total(k)>=10))||(step<0&&bonus[k]<=0)});
  document.getElementById('rollAbilities').disabled=rollsLeft<=0;
}
function randomDie(){return 1+Math.floor(Math.random()*6)}
function roll(){
  if(rollsLeft<=0)return;
  const btn=document.getElementById('rollAbilities');btn.disabled=true;
  ['dieStr','dieInt','dieCha'].forEach(id=>document.getElementById(id).classList.add('rolling'));
  let ticks=0;const timer=setInterval(()=>{
    document.getElementById('dieStr').textContent=randomDie();document.getElementById('dieInt').textContent=randomDie();document.getElementById('dieCha').textContent=randomDie();ticks++;
    if(ticks>=12){clearInterval(timer);base={strength:randomDie(),intelligence:randomDie(),charisma:randomDie()};bonus={strength:0,intelligence:0,charisma:0};bonusPool=5;rollsLeft--;rolled=true;
      document.getElementById('dieStr').textContent=base.strength;document.getElementById('dieInt').textContent=base.intelligence;document.getElementById('dieCha').textContent=base.charisma;['dieStr','dieInt','dieCha'].forEach(id=>document.getElementById(id).classList.remove('rolling'));
      document.getElementById('abilityWarning').textContent='Spend your bonus points, or keep them if you want a tougher start.';render();
    }
  },70);
}
document.getElementById('rollAbilities').onclick=roll;
document.querySelectorAll('.stepper button').forEach(b=>b.onclick=()=>{const k=b.dataset.stat,step=Number(b.dataset.step);if(step>0&&bonusPool>0&&total(k)<10){bonus[k]++;bonusPool--}else if(step<0&&bonus[k]>0){bonus[k]--;bonusPool++}render()});

function resetAbilities(){rolled=false;rollsLeft=3;bonusPool=5;base={strength:1,intelligence:1,charisma:1};bonus={strength:0,intelligence:0,charisma:0};['dieStr','dieInt','dieCha'].forEach(id=>document.getElementById(id).textContent='?');document.getElementById('abilityWarning').textContent='Roll the dice before starting your life.';render()}
const oldShow=showCharacterSetup;
document.getElementById('newGame').onclick=()=>{resetAbilities();oldShow()};

document.getElementById('startLife').onclick=()=>{
  const name=document.getElementById('characterName').value.trim(),err=document.getElementById('setupError');
  if(!name){err.textContent='Give your character a name before starting.';return}
  if(!rolled){err.textContent='Roll your starting abilities before beginning.';return}
  err.textContent='';character.name=name;localStorage.removeItem('sheppertonLifeSave');
  Object.assign(state,{money:35,energy:100,health:100,intelligence:total('intelligence'),strength:total('strength'),charisma:total('charisma'),rep:0,minutes:480,day:1});
  player.x=1120;player.y=590;characterSetup.classList.add('hidden');game.classList.remove('hidden');ui();save();toast('Day 1. '+character.name+' steps outside Home.');
};

const originalDoAction=doAction;
doAction=function(a){
  if(a==='cafejob'){
    if(state.energy<18)return toast('Too tired to work.');
    let pay=22+state.charisma*2;state.money+=pay;state.rep++;passTime(180);toast('Café shift complete: +£'+pay+' • Charisma bonus');ui();save();return;
  }
  if(a==='shopjob'){
    if(state.energy<25)return toast('Too tired to work.');
    let pay=30+state.charisma;state.money+=pay;state.rep++;passTime(240);toast('Shop shift complete: +£'+pay);ui();save();return;
  }
  originalDoAction(a);
};
render();
})();