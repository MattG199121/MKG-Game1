(()=>{
const WORLD_VERSION='20260809-2330';
const HOME_LL=[51.39638,-0.44487];
const STATION_LL=[51.39680664,-0.446776819];
const ORIGIN={lat:HOME_LL[0],lng:HOME_LL[1],x:1280,y:1040};
const PX_PER_METRE=4.15;
const WORLD={w:2350,h:1780};

const style=document.createElement('style');
style.textContent=`
#game #realMap{display:none!important}#game #canvas{display:block!important;position:absolute;inset:0;z-index:1;background:#16231d}.map-tools,.map-badge{display:none!important}
.walk-badge{position:absolute;z-index:1190;left:50%;top:86px;transform:translateX(-50%);background:#020617d9;border:1px solid #475569;border-radius:999px;padding:7px 11px;color:#bfdbfe;font:800 10px system-ui;letter-spacing:.08em;pointer-events:none;white-space:nowrap}
.walk-tools{position:absolute;z-index:1260;right:max(14px,env(safe-area-inset-right));top:86px;display:flex;gap:7px}.walk-tools button{border:1px solid #475569;background:#0f172ae8;color:#fff;border-radius:11px;padding:9px 12px;font:800 11px system-ui;box-shadow:0 6px 18px #0005}.walk-tools button.primary-map{background:#1d4ed8}
#overviewPanel{position:absolute;inset:0;z-index:1800;background:#0b1220;display:none}#overviewPanel.show{display:block}#overviewMap{position:absolute;inset:0}.overview-head{position:absolute;z-index:1900;left:14px;right:14px;top:max(14px,env(safe-area-inset-top));display:flex;justify-content:space-between;align-items:center;pointer-events:none}.overview-title{background:#0f172ae8;border:1px solid #475569;border-radius:14px;padding:10px 13px;color:#fff;font:800 13px system-ui;box-shadow:0 8px 20px #0006}.overview-close{pointer-events:auto;border:1px solid #64748b;background:#0f172ae8;color:#fff;border-radius:14px;padding:11px 14px;font:850 13px system-ui}.overview-note{position:absolute;z-index:1900;left:50%;bottom:max(18px,env(safe-area-inset-bottom));transform:translateX(-50%);background:#020617dd;border:1px solid #475569;border-radius:999px;padding:8px 12px;color:#cbd5e1;font:700 10px system-ui;white-space:nowrap}
.walk-mini{position:absolute;z-index:1180;right:max(14px,env(safe-area-inset-right));top:130px;width:150px;height:94px;border:1px solid #475569;background:#07110ddd;border-radius:13px;overflow:hidden;pointer-events:none;box-shadow:0 8px 20px #0005}.walk-mini canvas{width:100%;height:100%;display:block}.walk-mini-label{position:absolute;left:7px;top:6px;color:#dbeafe;font:800 8px system-ui;letter-spacing:.08em;background:#020617aa;padding:3px 5px;border-radius:5px}
@media(max-width:740px){.walk-badge{top:64px;font-size:9px}.walk-tools{top:72px;right:10px}.walk-tools button{padding:7px 9px;font-size:10px}.walk-mini{width:118px;height:74px;top:110px;right:10px}.overview-note{font-size:9px}.legend{display:none!important}}
`;
document.head.appendChild(style);

function worldToLL(x,y){
 const east=(x-ORIGIN.x)/PX_PER_METRE;
 const north=-(y-ORIGIN.y)/PX_PER_METRE;
 return [ORIGIN.lat+north/111320,ORIGIN.lng+east/(111320*Math.cos(ORIGIN.lat*Math.PI/180))];
}
function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function distPointSeg(px,py,ax,ay,bx,by){
 const vx=bx-ax,vy=by-ay,wx=px-ax,wy=py-ay;
 const c1=vx*wx+vy*wy;if(c1<=0)return Math.hypot(px-ax,py-ay);
 const c2=vx*vx+vy*vy;if(c2<=c1)return Math.hypot(px-bx,py-by);
 const t=c1/c2,qx=ax+t*vx,qy=ay+t*vy;return Math.hypot(px-qx,py-qy);
}
function onPolyline(x,y,pts,width){for(let i=0;i<pts.length-1;i++){if(distPointSeg(x,y,pts[i][0],pts[i][1],pts[i+1][0],pts[i+1][1])<=width/2)return true}return false}

const roads=[
 {name:'Green Lane',width:168,pts:[[70,1128],[420,1115],[770,1095],[1110,1085],[1450,1080],[1810,1060],[2280,1018]]},
 {name:'Station Approach',width:132,pts:[[465,695],[520,755],[600,825],[690,900],[790,970],[900,1040]]},
 {name:'Govett Avenue',width:118,pts:[[760,585],[1040,565],[1320,545],[1620,520],[1930,500]]},
 {name:'Station Road',width:132,pts:[[310,280],[345,420],[390,560],[465,695]]},
 {name:'High Street',width:126,pts:[[220,845],[330,780],[465,695],[600,640],[760,585]]},
 {name:'Bruce Avenue',width:108,pts:[[1110,1085],[1118,880],[1128,700],[1140,555]]},
 {name:'Kilmiston Avenue',width:105,pts:[[1450,1080],[1455,885],[1465,700],[1480,535]]},
 {name:'Manygate Lane',width:116,pts:[[1810,1060],[1840,1225],[1875,1390],[1920,1580]]}
];
const paths=[
 {width:74,pts:[[1280,1040],[1270,1085]]},
 {width:80,pts:[[465,695],[425,650],[390,625]]},
 {width:70,pts:[[1600,1068],[1660,1160],[1730,1280],[1780,1390]]}
];

function rect(x,y,w,h){return{x,y,w,h}}
const buildings=[
 {...rect(315,570,190,90),kind:'station',name:'Shepperton Station'},
 {...rect(500,735,145,86),kind:'shop',name:'Village Mart'},
 {...rect(620,760,150,95),kind:'cafe',name:'The Corner Cup'},
 {...rect(260,835,155,100),kind:'bank',name:'Crown Bank'},
 {...rect(400,920,165,105),kind:'gym',name:'Forge Fitness'},
 {...rect(845,650,160,98),kind:'library',name:'Learning Hub'},
 {...rect(845,895,150,92),kind:'estate',name:'Village Estates'},
 {...rect(1160,580,180,120),kind:'office',name:'MKG Services'},
 {...rect(950,1160,180,110),kind:'pub',name:'The Riverside Fox'},
 {...rect(1195,900,170,105),kind:'home',name:'Home'},
 ...[1500,1685,1870,2055].map((x,i)=>({...rect(x,865+(i%2)*12,145,92),kind:'house',name:'House'})),
 ...[120,300,490,680,870].map((x,i)=>({...rect(x,1195+(i%2)*10,140,90),kind:'house',name:'House'})),
 ...[790,980,1210,1435,1660].map((x,i)=>({...rect(x,365+(i%2)*22,145,92),kind:'house',name:'House'})),
 ...[1560,1740,1930].map((x,i)=>({...rect(x,1195+(i%2)*18,145,92),kind:'house',name:'House'})),
];
const park={x:1550,y:1260,w:520,h:390};

const gameplayPoi=[
 {id:'home',name:'Home',x:1280,y:1030,door:[1280,1010],glyph:'⌂',kind:'home',desc:'Your starting home. Sleep, recover and save your progress here.',actions:[['Sleep until 08:00','sleep'],['Have a quick meal (-£3, +25 Energy)','meal']]},
 {id:'station',name:'Shepperton Station',x:430,y:685,door:[430,665],glyph:'🚆',kind:'station',desc:'Shepperton Station. Travel to other districts will unlock later.',actions:[['Check departures','departures']]},
 {id:'cafe',name:'The Corner Cup',x:690,y:865,door:[690,865],glyph:'☕',kind:'job',desc:'A fictional café in the village district. Eat or pick up an early shift.',actions:[['Buy breakfast (-£6, +35 Energy)','breakfast'],['Work 3 hours','cafejob']]},
 {id:'shop',name:'Village Mart',x:570,y:835,door:[570,835],glyph:'🛒',kind:'job',desc:'A fictional convenience shop for supplies and casual work.',actions:[['Buy snack (-£3, +18 Energy)','snack'],['Work 4 hours','shopjob']]},
 {id:'bank',name:'Crown Bank',x:338,y:950,door:[338,950],glyph:'£',kind:'life',desc:'A fictional bank. Savings and investments will be expanded later.',actions:[['Check account','account']]},
 {id:'gym',name:'Forge Fitness',x:480,y:1042,door:[480,1042],glyph:'💪',kind:'life',desc:'Train Strength and improve physical career options.',actions:[['Train 90 mins (-25 Energy, -£5, +1 STR)','train']]},
 {id:'library',name:'Shepperton Learning Hub',x:925,y:765,door:[925,765],glyph:'📚',kind:'life',desc:'Study here to increase Intelligence and unlock better careers.',actions:[['Study 2 hours (-20 Energy, +1 INT)','study']]},
 {id:'pub',name:'The Riverside Fox',x:1040,y:1142,door:[1040,1142],glyph:'🍺',kind:'fun',desc:'A fictional pub where socialising improves Charisma.',actions:[['Socialise 2 hours (-£12, +1 CHA)','social']]},
 {id:'office',name:'MKG Services',x:1250,y:720,door:[1250,720],glyph:'💼',kind:'job',desc:'A fictional office employer. Intelligence improves your pay.',actions:[['Work 5 hours','officejob']]},
 {id:'rec',name:'Recreation Ground',x:1770,y:1420,door:[1770,1315],glyph:'🏃',kind:'life',desc:'Open space for exercise and future events.',actions:[['Go for a run (1 hour, -15 Energy)','run']]},
 {id:'estate',name:'Village Estates',x:920,y:1000,door:[920,1000],glyph:'🏠',kind:'job',desc:'A fictional estate agent. Property will become a major progression path.',actions:[['Browse properties','properties']]}
];

function insideRect(x,y,r,pad=0){return x>r.x-pad&&x<r.x+r.w+pad&&y>r.y-pad&&y<r.y+r.h+pad}
function isBlocked(x,y){
 if(x<28||y<28||x>WORLD.w-28||y>WORLD.h-28)return true;
 for(const b of buildings){if(insideRect(x,y,b,11))return true}
 return false;
}
function isWalkable(x,y){
 if(isBlocked(x,y))return false;
 if(insideRect(x,y,park,-12))return true;
 for(const r of roads)if(onPolyline(x,y,r.pts,r.width+54))return true;
 for(const p of paths)if(onPolyline(x,y,p.pts,p.width))return true;
 return false;
}

const gameEl=document.getElementById('game');
const badge=document.createElement('div');badge.className='walk-badge';badge.textContent='LEVEL 1 · SHEPPERTON WALKING DISTRICT';gameEl.appendChild(badge);
const tools=document.createElement('div');tools.className='walk-tools';tools.innerHTML='<button id="openWorldMap" class="primary-map">MAP</button><button id="centrePlayer">CENTRE</button>';gameEl.appendChild(tools);
const miniWrap=document.createElement('div');miniWrap.className='walk-mini';miniWrap.innerHTML='<canvas id="walkMiniCanvas" width="300" height="188"></canvas><div class="walk-mini-label">DISTRICT</div>';gameEl.appendChild(miniWrap);
const miniCanvas=document.getElementById('walkMiniCanvas'),mctx=miniCanvas.getContext('2d');

const overview=document.createElement('div');overview.id='overviewPanel';overview.innerHTML='<div id="overviewMap"></div><div class="overview-head"><div class="overview-title">Shepperton overview · real road map</div><button id="closeWorldMap" class="overview-close">Back to game</button></div><div class="overview-note">Overview uses OpenStreetMap · gameplay world is scaled for walking</div>';gameEl.appendChild(overview);
let overviewMap=null,overviewPlayer=null;
function ensureOverview(){
 if(overviewMap||typeof L==='undefined')return;
 overviewMap=L.map('overviewMap',{zoomControl:true,minZoom:12,maxZoom:19}).setView(HOME_LL,16);
 L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; OpenStreetMap contributors'}).addTo(overviewMap);
 L.marker(STATION_LL).addTo(overviewMap).bindTooltip('Shepperton Station');
 L.marker(HOME_LL).addTo(overviewMap).bindTooltip('Home');
 overviewPlayer=L.circleMarker(HOME_LL,{radius:9,weight:3,color:'#ffffff',fillColor:'#2563eb',fillOpacity:1}).addTo(overviewMap).bindTooltip('You are here',{permanent:false});
}
function refreshOverview(){if(!overviewPlayer)return;const ll=worldToLL(player.x,player.y);overviewPlayer.setLatLng(ll);overviewMap.panTo(ll,{animate:false})}
document.getElementById('openWorldMap').onclick=()=>{overview.classList.add('show');keys.up=keys.down=keys.left=keys.right=false;ensureOverview();setTimeout(()=>{overviewMap.invalidateSize();refreshOverview()},80)};
document.getElementById('closeWorldMap').onclick=()=>overview.classList.remove('show');

let camera={x:0,y:0};
document.getElementById('centrePlayer').onclick=()=>{camera.x=clamp(player.x-innerWidth/2,0,Math.max(0,WORLD.w-innerWidth));camera.y=clamp(player.y-innerHeight/2,0,Math.max(0,WORLD.h-innerHeight))};
let currentPoi=null,lastSave=0;
function resetWalkingPlayer(){
 player.x=1280;player.y=1068;camera.x=player.x-innerWidth/2;camera.y=player.y-innerHeight/2;
 camera.x=clamp(camera.x,0,Math.max(0,WORLD.w-innerWidth));camera.y=clamp(camera.y,0,Math.max(0,WORLD.h-innerHeight));
}
const priorStart=document.getElementById('startLife').onclick;
document.getElementById('startLife').onclick=e=>{
 priorStart.call(document.getElementById('startLife'),e);
 if(!game.classList.contains('hidden'))setTimeout(()=>{resetWalkingPlayer();canvas.style.display='block';toast('Day 1 · Step outside and explore Shepperton.');},130);
};

function resizeCanvas(){const dpr=Math.min(devicePixelRatio||1,2);const w=innerWidth,h=innerHeight;if(canvas.width!==Math.floor(w*dpr)||canvas.height!==Math.floor(h*dpr)){canvas.width=Math.floor(w*dpr);canvas.height=Math.floor(h*dpr)}canvas.style.width=w+'px';canvas.style.height=h+'px';ctx.setTransform(dpr,0,0,dpr,0,0)}
addEventListener('resize',()=>{resizeCanvas();camera.x=clamp(camera.x,0,Math.max(0,WORLD.w-innerWidth));camera.y=clamp(camera.y,0,Math.max(0,WORLD.h-innerHeight))});
resizeCanvas();

function movePlayer(dx,dy,dt){
 if(!dx&&!dy)return;
 const len=Math.hypot(dx,dy);dx/=len;dy/=len;
 const speed=190;
 const step=speed*dt;
 let nx=player.x+dx*step,ny=player.y;
 if(isWalkable(nx,ny))player.x=nx;
 nx=player.x;ny=player.y+dy*step;
 if(isWalkable(nx,ny))player.y=ny;
 state.minutes+=dt*.52;state.energy=Math.max(0,state.energy-dt*.014);
}

update=function(dt){
 if(modalOpen||game.classList.contains('hidden')||overview.classList.contains('show'))return;
 let dx=(keys.right?1:0)-(keys.left?1:0),dy=(keys.down?1:0)-(keys.up?1:0);
 movePlayer(dx,dy,dt);
 const targetX=player.x-innerWidth/2,targetY=player.y-innerHeight/2;
 camera.x+=(targetX-camera.x)*Math.min(1,dt*5.5);camera.y+=(targetY-camera.y)*Math.min(1,dt*5.5);
 camera.x=clamp(camera.x,0,Math.max(0,WORLD.w-innerWidth));camera.y=clamp(camera.y,0,Math.max(0,WORLD.h-innerHeight));
 currentPoi=null;let best=76;
 for(const p of gameplayPoi){const d=Math.hypot(player.x-p.door[0],player.y-p.door[1]);if(d<best){best=d;currentPoi=p}}
 near=currentPoi;
 if(currentPoi){promptEl.textContent='ACTION · '+currentPoi.name;promptEl.classList.remove('hidden');actionBtn.classList.add('active')}else{promptEl.classList.add('hidden');actionBtn.classList.remove('active')}
 ui();
 const now=performance.now();if(now-lastSave>6000){save();lastSave=now}
};
interact=function(){if(currentPoi)openBuilding(currentPoi)};

function drawRoad(r){
 ctx.lineCap='round';ctx.lineJoin='round';
 ctx.strokeStyle='#c8c5b6';ctx.lineWidth=r.width+42;ctx.beginPath();r.pts.forEach((p,i)=>i?ctx.lineTo(p[0]-camera.x,p[1]-camera.y):ctx.moveTo(p[0]-camera.x,p[1]-camera.y));ctx.stroke();
 ctx.strokeStyle='#555b5d';ctx.lineWidth=r.width;ctx.beginPath();r.pts.forEach((p,i)=>i?ctx.lineTo(p[0]-camera.x,p[1]-camera.y):ctx.moveTo(p[0]-camera.x,p[1]-camera.y));ctx.stroke();
 ctx.strokeStyle='#6b7274';ctx.lineWidth=Math.max(2,r.width-20);ctx.beginPath();r.pts.forEach((p,i)=>i?ctx.lineTo(p[0]-camera.x,p[1]-camera.y):ctx.moveTo(p[0]-camera.x,p[1]-camera.y));ctx.stroke();
 ctx.setLineDash([24,22]);ctx.strokeStyle='#e7e0b8';ctx.lineWidth=3;ctx.beginPath();r.pts.forEach((p,i)=>i?ctx.lineTo(p[0]-camera.x,p[1]-camera.y):ctx.moveTo(p[0]-camera.x,p[1]-camera.y));ctx.stroke();ctx.setLineDash([]);
 const m=r.pts[Math.floor(r.pts.length/2)];ctx.save();ctx.translate(m[0]-camera.x,m[1]-camera.y);ctx.fillStyle='#e7e0b8bb';ctx.font='800 13px system-ui';ctx.textAlign='center';ctx.fillText(r.name,0,-r.width*.32);ctx.restore();
}
function drawPath(p){ctx.strokeStyle='#c8c5b6';ctx.lineWidth=p.width;ctx.lineCap='round';ctx.lineJoin='round';ctx.beginPath();p.pts.forEach((q,i)=>i?ctx.lineTo(q[0]-camera.x,q[1]-camera.y):ctx.moveTo(q[0]-camera.x,q[1]-camera.y));ctx.stroke()}
function buildingColour(kind){return({home:'#d6b47a',station:'#a84c45',cafe:'#b8734d',shop:'#668b68',bank:'#6b7280',gym:'#76558e',library:'#4d7391',estate:'#896c55',office:'#5b6573',pub:'#7d4f51',house:'#9a8f7d'})[kind]||'#8c8274'}
function drawBuilding(b){
 const x=b.x-camera.x,y=b.y-camera.y;if(x+b.w<-30||y+b.h<-30||x>innerWidth+30||y>innerHeight+30)return;
 ctx.fillStyle='#0005';ctx.fillRect(x+8,y+10,b.w,b.h);
 ctx.fillStyle=buildingColour(b.kind);ctx.fillRect(x,y,b.w,b.h);
 ctx.fillStyle='#3b312b';ctx.fillRect(x+7,y+7,b.w-14,18);
 ctx.fillStyle='#ddd6c8';for(let wx=x+18;wx<x+b.w-18;wx+=34)ctx.fillRect(wx,y+38,18,18);
 ctx.fillStyle='#3a271e';ctx.fillRect(x+b.w/2-12,y+b.h-28,24,28);
 if(b.kind!=='house'){
   ctx.fillStyle='#0f172add';ctx.fillRect(x+8,y-22,Math.min(b.w-16,160),20);ctx.fillStyle='#fff';ctx.font='800 11px system-ui';ctx.textAlign='left';ctx.fillText(b.name,x+14,y-8);
 }
}
function drawTrees(){
 const pts=[[80,930],[170,980],[210,600],[690,510],[1040,420],[1330,450],[1560,430],[2050,610],[2190,780],[2110,1220],[1460,1360],[1320,1320],[760,1320],[610,1460],[330,1390],[120,1520]];
 for(const p of pts){const x=p[0]-camera.x,y=p[1]-camera.y;if(x<-30||y<-30||x>innerWidth+30||y>innerHeight+30)continue;ctx.fillStyle='#183b2a';ctx.beginPath();ctx.arc(x,y,22,0,Math.PI*2);ctx.fill();ctx.fillStyle='#2e6644';ctx.beginPath();ctx.arc(x-6,y-7,16,0,Math.PI*2);ctx.fill();ctx.fillStyle='#5c4430';ctx.fillRect(x-3,y+13,6,15)}
}
function drawPoiMarkers(){for(const p of gameplayPoi){if(p.id==='rec')continue;const x=p.door[0]-camera.x,y=p.door[1]-camera.y;if(x<-50||y<-50||x>innerWidth+50||y>innerHeight+50)continue;ctx.fillStyle=p===currentPoi?'#2563eb':'#0f172add';ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.beginPath();ctx.arc(x,y,17,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.fillStyle='#fff';ctx.font='15px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(p.glyph,x,y+1)}}
function drawPark(){const x=park.x-camera.x,y=park.y-camera.y;ctx.fillStyle='#2f6a45';ctx.fillRect(x,y,park.w,park.h);ctx.strokeStyle='#b7c8a9';ctx.lineWidth=5;ctx.strokeRect(x+6,y+6,park.w-12,park.h-12);ctx.fillStyle='#d9e7ce';ctx.font='900 20px system-ui';ctx.textAlign='center';ctx.fillText('SHEPPERTON RECREATION GROUND',x+park.w/2,y+45);ctx.strokeStyle='#d9e7ce77';ctx.lineWidth=3;ctx.strokeRect(x+120,y+95,280,190)}
function drawMini(){
 const w=miniCanvas.width,h=miniCanvas.height;mctx.clearRect(0,0,w,h);mctx.fillStyle='#163222';mctx.fillRect(0,0,w,h);const sx=w/WORLD.w,sy=h/WORLD.h;
 mctx.lineCap='round';mctx.strokeStyle='#858b86';for(const r of roads){mctx.lineWidth=Math.max(2,r.width*sx);mctx.beginPath();r.pts.forEach((p,i)=>i?mctx.lineTo(p[0]*sx,p[1]*sy):mctx.moveTo(p[0]*sx,p[1]*sy));mctx.stroke()}
 mctx.fillStyle='#4f8a5c';mctx.fillRect(park.x*sx,park.y*sy,park.w*sx,park.h*sy);mctx.fillStyle='#60a5fa';mctx.beginPath();mctx.arc(player.x*sx,player.y*sy,5,0,Math.PI*2);mctx.fill();mctx.strokeStyle='#fff';mctx.lineWidth=2;mctx.stroke();
}

draw=function(){
 resizeCanvas();ctx.clearRect(0,0,innerWidth,innerHeight);
 ctx.fillStyle='#274a32';ctx.fillRect(0,0,innerWidth,innerHeight);
 ctx.fillStyle='#31563b';for(let x=(-camera.x%120)-120;x<innerWidth+120;x+=120)for(let y=(-camera.y%120)-120;y<innerHeight+120;y+=120)ctx.fillRect(x+8,y+8,4,4);
 drawPark();paths.forEach(drawPath);roads.forEach(drawRoad);drawTrees();buildings.forEach(drawBuilding);drawPoiMarkers();
 if(typeof drawPlayer==='function')drawPlayer(camera);else{ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(player.x-camera.x,player.y-camera.y,12,0,Math.PI*2);ctx.fill()}
 drawMini();
};

if(!game.classList.contains('hidden'))resetWalkingPlayer();
})();
