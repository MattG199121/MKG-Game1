(()=>{
'use strict';
const HOME={lat:51.39638,lng:-0.44487};
const BBOX={s:51.3898529,w:-0.4856386,n:51.4234539,e:-0.3913135};
const M=111320,COS=Math.cos(HOME.lat*Math.PI/180);
const WALK=1.20,PLAYER_R=.34;
let speed=1, zoom=10, loaded=false;
const ZMIN=2.2,ZMAX=42;
let cam={x:-7.2,y:.6};
let world={roads:[],paths:[],buildings:[],land:[],parking:[],rails:[],barriers:[],water:[],bounds:null};

const style=document.createElement('style');
style.textContent=`
#game #canvas{display:block!important;position:absolute;inset:0;z-index:1;background:#35533d;touch-action:none!important}
#game #realMap,.map-tools,.map-badge,.walk-tools,.walk-badge,.walk-mini,#overviewPanel,.zoom-controls,.speed-controls,.geo-controls,.geo-badge,.geo-scale,.geo-loading{display:none!important}
.v2badge{position:absolute;z-index:1200;left:50%;top:84px;transform:translateX(-50%);background:#07111de8;border:1px solid #526172;border-radius:999px;padding:7px 12px;color:#dbeafe;font:800 10px system-ui;letter-spacing:.08em;white-space:nowrap;pointer-events:none}
.v2controls{position:absolute;z-index:2100;right:max(12px,env(safe-area-inset-right));top:84px;display:flex;gap:8px;align-items:center}
.v2group{display:flex;align-items:center;background:#0f172af0;border:1px solid #475569;border-radius:13px;overflow:hidden;box-shadow:0 7px 18px #0005}
.v2group button{border:0;border-right:1px solid #475569;background:transparent;color:#fff;min-width:48px;height:44px;padding:0 10px;font:850 14px system-ui;touch-action:manipulation}
.v2group button:last-child{border-right:0}.v2group button.active{background:#2563eb}.v2read{min-width:72px;text-align:center;color:#dbeafe;font:850 12px system-ui;padding:0 8px}
.v2scale{position:absolute;z-index:1200;left:max(14px,env(safe-area-inset-left));bottom:max(188px,calc(env(safe-area-inset-bottom) + 188px));background:#07111ddd;border:1px solid #475569;border-radius:9px;padding:6px 9px;color:#e2e8f0;font:750 10px system-ui;pointer-events:none}.v2scale i{display:block;height:3px;background:#fff;margin-top:4px}
.v2loading{position:absolute;z-index:1600;left:50%;top:50%;transform:translate(-50%,-50%);background:#07111ef2;border:1px solid #526172;border-radius:20px;padding:22px 26px;color:#fff;text-align:center;box-shadow:0 20px 60px #0009;min-width:280px}.v2loading b{display:block;font-size:17px;margin-bottom:6px}.v2loading span{font-size:12px;color:#cbd5e1}
.action-wrap,.prompt,.legend{display:none!important}
@media(max-width:740px){.v2badge{top:62px;font-size:8px}.v2controls{top:74px;right:9px;gap:5px;flex-direction:column;align-items:flex-end}.v2group button{min-width:44px;height:40px;font-size:13px}.v2read{min-width:66px}.v2scale{bottom:160px}.hud .stats{display:none}}
`;
document.head.appendChild(style);
const gameEl=document.getElementById('game');
const badge=document.createElement('div');badge.className='v2badge';badge.textContent='LEVEL 1 · TRUE-SCALE SHEPPERTON';gameEl.appendChild(badge);
const controls=document.createElement('div');controls.className='v2controls';controls.innerHTML=`<div class="v2group" id="v2speed"><button data-s="1" class="active">1×</button><button data-s="2">2×</button><button data-s="4">4×</button></div><div class="v2group"><button id="v2out">−</button><span id="v2read" class="v2read"></span><button id="v2in">+</button></div>`;gameEl.appendChild(controls);
const scale=document.createElement('div');scale.className='v2scale';scale.innerHTML='<span id="v2scaleText"></span><i id="v2scaleLine"></i>';gameEl.appendChild(scale);
const loading=document.createElement('div');loading.className='v2loading hidden';loading.innerHTML='<b>Loading Shepperton geography…</b><span>Converting roads and buildings into the gameplay world.</span>';gameEl.appendChild(loading);

function xy(lat,lng){return{x:(lng-HOME.lng)*M*COS,y:(HOME.lat-lat)*M}}
function bbox(p){let a=Infinity,b=Infinity,c=-Infinity,d=-Infinity;for(const q of p){a=Math.min(a,q.x);b=Math.min(b,q.y);c=Math.max(c,q.x);d=Math.max(d,q.y)}return[a,b,c,d]}
function pts(w,n){const out=[];for(const id of w.nodes||[]){const q=n.get(id);if(q)out.push(xy(q.lat,q.lon))}return out}
const roadSet=new Set(['motorway','motorway_link','trunk','trunk_link','primary','primary_link','secondary','secondary_link','tertiary','tertiary_link','residential','unclassified','service','living_street','track']);
const pathSet=new Set(['footway','path','cycleway','pedestrian','steps','bridleway']);
async function load(){
 const q=`[out:json][timeout:60];(way[highway](${BBOX.s},${BBOX.w},${BBOX.n},${BBOX.e});way[building](${BBOX.s},${BBOX.w},${BBOX.n},${BBOX.e});way[barrier](${BBOX.s},${BBOX.w},${BBOX.n},${BBOX.e});way[railway](${BBOX.s},${BBOX.w},${BBOX.n},${BBOX.e});way[landuse](${BBOX.s},${BBOX.w},${BBOX.n},${BBOX.e});way[leisure](${BBOX.s},${BBOX.w},${BBOX.n},${BBOX.e});way[amenity=parking](${BBOX.s},${BBOX.w},${BBOX.n},${BBOX.e});way[natural=water](${BBOX.s},${BBOX.w},${BBOX.n},${BBOX.e}););out body;>;out skel qt;`;
 let data,err;for(const url of ['https://overpass-api.de/api/interpreter','https://overpass.kumi.systems/api/interpreter']){try{const r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8'},body:'data='+encodeURIComponent(q)});if(!r.ok)throw Error(r.status);data=await r.json();break}catch(e){err=e}}
 if(!data)throw err||Error('Map load failed');
 const nodes=new Map(),ways=[];for(const e of data.elements||[]){if(e.type==='node')nodes.set(e.id,e);else if(e.type==='way')ways.push(e)}
 let bounds=[Infinity,Infinity,-Infinity,-Infinity];const grow=b=>{bounds[0]=Math.min(bounds[0],b[0]);bounds[1]=Math.min(bounds[1],b[1]);bounds[2]=Math.max(bounds[2],b[2]);bounds[3]=Math.max(bounds[3],b[3])};
 for(const w of ways){const t=w.tags||{},p=pts(w,nodes);if(p.length<2)continue;const b=bbox(p);grow(b);const h=t.highway;
  if(h&&roadSet.has(h))world.roads.push({p,b,t:h,n:t.name||'',lan:t.lanes||'',sw:t.sidewalk||'',width:t.width||''});
  else if(h&&pathSet.has(h))world.paths.push({p,b,t:h});
  else if(t.building&&p.length>3)world.buildings.push({p,b,t:t.building});
  else if(t.barrier)world.barriers.push({p,b,t:t.barrier});
  else if(t.railway)world.rails.push({p,b});
  else if(t.amenity==='parking')world.parking.push({p,b});
  else if(t.natural==='water')world.water.push({p,b});
  else if(t.landuse||t.leisure||t.natural)world.land.push({p,b,k:t.landuse||t.leisure||t.natural});
 }
 world.bounds=bounds;loaded=true;loading.classList.add('hidden');toast(`${world.buildings.length} buildings · ${world.roads.length} roads loaded`);
}
load().catch(e=>{console.error(e);loading.innerHTML='<b>Map data could not load</b><span>Refresh and try again.</span>';loading.classList.remove('hidden')});

function width(r){const ex=parseFloat(String(r.width).replace(/[^0-9.]/g,''));if(ex>1&&ex<50)return ex;const lanes=parseInt(r.lan,10);if(lanes>0)return Math.max(3.6,lanes*3.6);return({motorway:22,trunk:14,primary:10,secondary:7.2,tertiary:6.4,residential:5.5,unclassified:5.2,service:4,living_street:4.5,track:3}[r.t]||5.2)}
function pavement(r){if(r.t==='track')return .4;if(r.t==='service')return .8;if(r.sw==='both')return 3.6;if(r.sw==='left'||r.sw==='right')return 1.8;return 3}
function line(p){ctx.beginPath();ctx.moveTo(p[0].x,p[0].y);for(let i=1;i<p.length;i++)ctx.lineTo(p[i].x,p[i].y)}
function poly(p){line(p);ctx.closePath()}
function pin(x,y,p){let inside=false;for(let i=0,j=p.length-1;i<p.length;j=i++){const a=p[i],b=p[j];if(((a.y>y)!=(b.y>y))&&(x<(b.x-a.x)*(y-a.y)/(b.y-a.y+1e-12)+a.x))inside=!inside}return inside}
function sd(px,py,a,b){const vx=b.x-a.x,vy=b.y-a.y,wx=px-a.x,wy=py-a.y,c=vx*vx+vy*vy;if(c<1e-9)return Math.hypot(px-a.x,py-a.y);let t=(vx*wx+vy*wy)/c;t=Math.max(0,Math.min(1,t));return Math.hypot(px-a.x-t*vx,py-a.y-t*vy)}
function blocked(x,y){if(!loaded)return true;for(const f of world.buildings){if(x<f.b[0]-1||x>f.b[2]+1||y<f.b[1]-1||y>f.b[3]+1)continue;if(pin(x,y,f.p))return true;for(let i=1;i<f.p.length;i++)if(sd(x,y,f.p[i-1],f.p[i])<PLAYER_R)return true}for(const f of world.barriers){if(x<f.b[0]-1||x>f.b[2]+1||y<f.b[1]-1||y>f.b[3]+1)continue;for(let i=1;i<f.p.length;i++)if(sd(x,y,f.p[i-1],f.p[i])<PLAYER_R+.18)return true}return false}
function visible(b,m=20){const hw=innerWidth/(2*zoom)+m,hh=innerHeight/(2*zoom)+m;return !(b[2]<cam.x-hw||b[0]>cam.x+hw||b[3]<cam.y-hh||b[1]>cam.y+hh)}
function resize(){const d=Math.min(devicePixelRatio||1,2),w=Math.floor(innerWidth*d),h=Math.floor(innerHeight*d);if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h}canvas.style.width=innerWidth+'px';canvas.style.height=innerHeight+'px';ctx.setTransform(d,0,0,d,0,0)}
addEventListener('resize',resize);resize();
function zoomUI(){document.getElementById('v2read').textContent=Math.round(zoom/10*100)+'%';const m=zoom<4?50:zoom<8?20:zoom<18?10:5;document.getElementById('v2scaleText').textContent=m+' m';document.getElementById('v2scaleLine').style.width=Math.min(220,m*zoom)+'px'}
function setZoom(z){zoom=Math.max(ZMIN,Math.min(ZMAX,z));zoomUI();}
zoomUI();
document.getElementById('v2out').onclick=e=>{e.preventDefault();e.stopPropagation();setZoom(zoom/1.5)};
document.getElementById('v2in').onclick=e=>{e.preventDefault();e.stopPropagation();setZoom(zoom*1.5)};
document.querySelectorAll('#v2speed button').forEach(b=>b.onclick=()=>{speed=Number(b.dataset.s);document.querySelectorAll('#v2speed button').forEach(x=>x.classList.toggle('active',x===b));toast(`${speed}× travel speed`)});

const prevStart=document.getElementById('startLife').onclick;document.getElementById('startLife').onclick=e=>{prevStart.call(document.getElementById('startLife'),e);if(!game.classList.contains('hidden')){player.x=-7.2;player.y=.6;cam.x=player.x;cam.y=player.y;if(!loaded)loading.classList.remove('hidden')}};
function move(dt){let dx=(keys.right?1:0)-(keys.left?1:0),dy=(keys.down?1:0)-(keys.up?1:0);if((!dx&&!dy)||!loaded)return;const L=Math.hypot(dx,dy);dx/=L;dy/=L;const s=WALK*speed*dt,nx=player.x+dx*s,ny=player.y+dy*s;if(!blocked(nx,player.y))player.x=nx;if(!blocked(player.x,ny))player.y=ny;state.minutes+=dt*speed/60;state.energy=Math.max(0,state.energy-dt*.0025*speed)}
update=function(dt){if(modalOpen||game.classList.contains('hidden'))return;move(dt);cam.x+=(player.x-cam.x)*Math.min(1,dt*8);cam.y+=(player.y-cam.y)*Math.min(1,dt*8);near=null;promptEl.classList.add('hidden');ui()};interact=function(){};
function person(){const id=character.avatar||'phil',shirt=id==='harry'?'#65734a':id==='matt'?'#d9e1e5':'#16191d',skin=id==='matt'?'#d99a70':'#e4b089';ctx.fillStyle='#0005';ctx.beginPath();ctx.ellipse(player.x,player.y+.36,.35,.17,0,0,Math.PI*2);ctx.fill();ctx.fillStyle=shirt;ctx.beginPath();ctx.ellipse(player.x,player.y+.05,.30,.42,0,0,Math.PI*2);ctx.fill();ctx.fillStyle=skin;ctx.beginPath();ctx.arc(player.x,player.y-.36,.22,0,Math.PI*2);ctx.fill()}
draw=function(){resize();const d=Math.min(devicePixelRatio||1,2);ctx.setTransform(d,0,0,d,0,0);ctx.clearRect(0,0,innerWidth,innerHeight);ctx.fillStyle='#35533d';ctx.fillRect(0,0,innerWidth,innerHeight);ctx.save();ctx.translate(innerWidth/2,innerHeight/2);ctx.scale(zoom,zoom);ctx.translate(-cam.x,-cam.y);
 for(const f of world.land){if(!visible(f.b))continue;poly(f.p);ctx.fillStyle=f.k==='industrial'?'#5b584c':f.k==='forest'||f.k==='wood'?'#294a34':'#42674a';ctx.fill()}
 for(const f of world.parking){if(!visible(f.b))continue;poly(f.p);ctx.fillStyle='#74776f';ctx.fill()}
 ctx.lineCap='round';ctx.lineJoin='round';for(const r of world.roads){if(!visible(r.b,30))continue;ctx.strokeStyle='#d0cbbb';ctx.lineWidth=width(r)+pavement(r);line(r.p);ctx.stroke()}for(const r of world.roads){if(!visible(r.b,30))continue;ctx.strokeStyle=r.t==='track'?'#8d806a':'#646c6e';ctx.lineWidth=width(r);line(r.p);ctx.stroke()}
 for(const p of world.paths){if(!visible(p.b))continue;ctx.strokeStyle='#d9d0b6';ctx.lineWidth=p.t==='pedestrian'?3:1.8;line(p.p);ctx.stroke()}
 for(const b of world.buildings){if(!visible(b.b))continue;poly(b.p);ctx.fillStyle=b.t==='house'||b.t==='residential'?'#b59b7e':'#a99175';ctx.fill();ctx.strokeStyle='#493d32';ctx.lineWidth=.18;ctx.stroke()}
 if(zoom>6)for(const b of world.barriers){if(!visible(b.b))continue;ctx.strokeStyle=b.t==='hedge'?'#244d2c':'#584a3d';ctx.lineWidth=b.t==='hedge'?.5:.14;line(b.p);ctx.stroke()}
 for(const r of world.rails){if(!visible(r.b))continue;ctx.strokeStyle='#272b2e';ctx.lineWidth=1.6;line(r.p);ctx.stroke()}
 person();ctx.restore();};

let pinch=null;canvas.addEventListener('touchstart',e=>{if(e.touches.length===2){const a=e.touches[0],b=e.touches[1];pinch={d:Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY),z:zoom};e.preventDefault();e.stopImmediatePropagation()}},{capture:true,passive:false});
canvas.addEventListener('touchmove',e=>{if(pinch&&e.touches.length===2){const a=e.touches[0],b=e.touches[1];setZoom(pinch.z*Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY)/pinch.d);e.preventDefault();e.stopImmediatePropagation()}},{capture:true,passive:false});
canvas.addEventListener('touchend',e=>{if(e.touches.length<2)pinch=null},{capture:true,passive:true});
canvas.addEventListener('wheel',e=>{setZoom(zoom*(e.deltaY<0?1.18:.84));e.preventDefault()},{passive:false});
})();