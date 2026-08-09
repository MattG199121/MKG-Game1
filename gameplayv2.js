(()=>{
const WORLD={w:2500,h:1850};
const HOME_LL=[51.39638,-0.44487];
const ORIGIN={lat:HOME_LL[0],lng:HOME_LL[1],x:1260,y:1060};
const PX_PER_METRE=4.15;

const css=document.createElement('style');
css.textContent=`
.walk-badge,.walk-tools,.walk-mini{display:none!important}
.v2-badge{position:absolute;z-index:1190;left:50%;top:86px;transform:translateX(-50%);background:#020617df;border:1px solid #475569;border-radius:999px;padding:7px 11px;color:#bfdbfe;font:800 10px system-ui;letter-spacing:.08em;pointer-events:none;white-space:nowrap}
.v2-tools{position:absolute;z-index:1260;right:max(14px,env(safe-area-inset-right));top:86px;display:flex;align-items:center;gap:6px}.v2-tools button{border:1px solid #475569;background:#0f172aeb;color:#fff;border-radius:11px;padding:9px 11px;font:850 12px system-ui;box-shadow:0 6px 18px #0005}.v2-tools .map{background:#1d4ed8}.v2-zoom{min-width:55px;text-align:center;border:1px solid #475569;background:#020617dc;color:#dbeafe;border-radius:11px;padding:9px 8px;font:850 11px system-ui}
.v2-mini{position:absolute;z-index:1180;right:max(14px,env(safe-area-inset-right));top:133px;width:170px;height:108px;border:1px solid #475569;background:#07110de8;border-radius:13px;overflow:hidden;pointer-events:none;box-shadow:0 8px 20px #0005}.v2-mini canvas{width:100%;height:100%;display:block}.v2-mini span{position:absolute;left:7px;top:6px;color:#dbeafe;font:800 8px system-ui;letter-spacing:.08em;background:#020617b8;padding:3px 5px;border-radius:5px}
@media(max-width:740px){.v2-badge{top:64px;font-size:9px}.v2-tools{top:72px;right:10px;gap:4px}.v2-tools button{padding:7px 9px;font-size:11px}.v2-zoom{padding:7px 5px;min-width:48px;font-size:10px}.v2-mini{width:120px;height:76px;right:10px;top:108px}}
`;
document.head.appendChild(css);

const gameEl=document.getElementById('game');
const badge=document.createElement('div');badge.className='v2-badge';badge.textContent='LEVEL 1 · SHEPPERTON WALKING DISTRICT';gameEl.appendChild(badge);
const tools=document.createElement('div');tools.className='v2-tools';tools.innerHTML='<button class="map" id="v2Map">MAP</button><button id="v2Minus">−</button><div class="v2-zoom" id="v2ZoomLabel">100%</div><button id="v2Plus">+</button><button id="v2Centre">CENTRE</button>';gameEl.appendChild(tools);
const mini=document.createElement('div');mini.className='v2-mini';mini.innerHTML='<canvas id="v2Mini" width="340" height="216"></canvas><span>DISTRICT</span>';gameEl.appendChild(mini);
const miniCanvas=document.getElementById('v2Mini'),mctx=miniCanvas.getContext('2d');

function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function distPointSeg(px,py,ax,ay,bx,by){const vx=bx-ax,vy=by-ay,wx=px-ax,wy=py-ay,c1=vx*wx+vy*wy;if(c1<=0)return Math.hypot(px-ax,py-ay);const c2=vx*vx+vy*vy;if(c2<=c1)return Math.hypot(px-bx,py-by);const t=c1/c2,qx=ax+t*vx,qy=ay+t*vy;return Math.hypot(px-qx,py-qy)}
function onPolyline(x,y,pts,width){for(let i=0;i<pts.length-1;i++)if(distPointSeg(x,y,pts[i][0],pts[i][1],pts[i+1][0],pts[i+1][1])<=width/2)return true;return false}
function rect(x,y,w,h){return{x,y,w,h}}
function inside(x,y,r,p=0){return x>r.x-p&&x<r.x+r.w+p&&y>r.y-p&&y<r.y+r.h+p}

// Every road shares exact junction coordinates with the road it meets.
const J={station:[470,620],high:[810,520],green:[1120,1080],bruceTop:[1360,500],bruceBottom:[1360,1065],kilmTop:[1680,485],kilmBottom:[1680,1052],many:[2050,1034]};
const roads=[
 {name:'Station Road',w:128,pts:[[365,90],[382,245],[410,420],J.station]},
 {name:'High Street',w:132,pts:[[95,900],[250,805],J.station,[625,565],J.high]},
 {name:'Govett Avenue',w:116,pts:[J.high,[1080,515],J.bruceTop,[1515,492],J.kilmTop,[1960,465],[2300,455]]},
 {name:'Station Approach',w:124,pts:[J.station,[585,710],[730,825],[890,955],J.green]},
 {name:'Green Lane',w:154,pts:[[70,1135],[390,1125],[700,1110],[900,1095],J.green,J.bruceBottom,J.kilmBottom,J.many,[2320,1005]]},
 {name:'Bruce Avenue',w:108,pts:[J.bruceTop,[1360,670],[1360,860],J.bruceBottom]},
 {name:'Kilmiston Avenue',w:104,pts:[J.kilmTop,[1680,665],[1680,865],J.kilmBottom]},
 {name:'Manygate Lane',w:112,pts:[J.many,[2075,1190],[2110,1390],[2160,1680]]}
];
const paths=[
 {w:66,pts:[[1260,1060],[1260,1090]]},
 {w:62,pts:[[1540,1070],[1600,1185],[1700,1295],[1810,1395]]},
 {w:58,pts:[[470,620],[430,665],[400,700]]}
];

const buildings=[
 {...rect(315,500,205,105),name:'Shepperton Station',kind:'station'},
 {...rect(500,725,150,92),name:'Village Mart',kind:'shop'},
 {...rect(660,760,165,100),name:'The Corner Cup',kind:'cafe'},
 {...rect(215,855,165,106),name:'Crown Bank',kind:'bank'},
 {...rect(395,925,175,112),name:'Forge Fitness',kind:'gym'},
 {...rect(875,650,175,108),name:'Learning Hub',kind:'library'},
 {...rect(900,905,165,100),name:'Village Estates',kind:'estate'},
 {...rect(1190,590,185,120),name:'MKG Services',kind:'office'},
 {...rect(1000,1175,185,112),name:'The Riverside Fox',kind:'pub'},
 {...rect(1180,905,170,105),name:'Home',kind:'home'},
 ...[1490,1690,1890,2100].map((x,i)=>({...rect(x,840+(i%2)*18,145,90),name:'House',kind:'house'})),
 ...[85,270,460,650,835].map((x,i)=>({...rect(x,1210+(i%2)*14,145,92),name:'House',kind:'house'})),
 ...[930,1110,1490,1735,1970].map((x,i)=>({...rect(x,300+(i%2)*20,145,92),name:'House',kind:'house'}))
];
const park={x:1510,y:1230,w:560,h:430};

const poi=[
 {name:'Home',x:1260,y:1035,glyph:'⌂',desc:'Your starting home. Sleep, recover and save your progress here.',actions:[['Sleep until 08:00','sleep'],['Have a quick meal (-£3, +25 Energy)','meal']]},
 {name:'Shepperton Station',x:420,y:625,glyph:'🚆',desc:'Shepperton Station. Travel to other districts will unlock later.',actions:[['Check departures','departures']]},
 {name:'Village Mart',x:575,y:835,glyph:'🛒',desc:'A fictional convenience shop for supplies and casual work.',actions:[['Buy snack (-£3, +18 Energy)','snack'],['Work 4 hours','shopjob']]},
 {name:'The Corner Cup',x:740,y:875,glyph:'☕',desc:'A fictional café in the village district.',actions:[['Buy breakfast (-£6, +35 Energy)','breakfast'],['Work 3 hours','cafejob']]},
 {name:'Crown Bank',x:300,y:980,glyph:'£',desc:'A fictional bank.',actions:[['Check account','account']]},
 {name:'Forge Fitness',x:485,y:1053,glyph:'💪',desc:'Train Strength and improve physical career options.',actions:[['Train 90 mins (-25 Energy, -£5, +1 STR)','train']]},
 {name:'Shepperton Learning Hub',x:963,y:780,glyph:'📚',desc:'Study here to increase Intelligence.',actions:[['Study 2 hours (-20 Energy, +1 INT)','study']]},
 {name:'Village Estates',x:982,y:1020,glyph:'🏠',desc:'A fictional estate agent.',actions:[['Browse properties','properties']]},
 {name:'MKG Services',x:1282,y:735,glyph:'💼',desc:'A fictional office employer. Intelligence improves your pay.',actions:[['Work 5 hours','officejob']]},
 {name:'The Riverside Fox',x:1090,y:1155,glyph:'🍺',desc:'A fictional pub where socialising improves Charisma.',actions:[['Socialise 2 hours (-£12, +1 CHA)','social']]},
 {name:'Recreation Ground',x:1770,y:1420,glyph:'🏃',desc:'Open space for exercise and future events.',actions:[['Go for a run (1 hour, -15 Energy)','run']]}
];

function blocked(x,y){if(x<30||y<30||x>WORLD.w-30||y>WORLD.h-30)return true;for(const b of buildings)if(inside(x,y,b,10))return true;return false}
function walkable(x,y){if(blocked(x,y))return false;if(inside(x,y,park,-10))return true;for(const r of roads)if(onPolyline(x,y,r.pts,r.w+48))return true;for(const p of paths)if(onPolyline(x,y,p.pts,p.w))return true;return false}

let zoom=1,camera={x:1260,y:1060},currentPoi=null,pinchStart=0,pinchZoom=1;
function setZoom(z){zoom=clamp(z,.62,1.75);document.getElementById('v2ZoomLabel').textContent=Math.round(zoom*100)+'%'}
document.getElementById('v2Minus').onclick=()=>setZoom(zoom-.15);
document.getElementById('v2Plus').onclick=()=>setZoom(zoom+.15);
document.getElementById('v2Centre').onclick=()=>{camera.x=player.x;camera.y=player.y};
document.getElementById('v2Map').onclick=()=>{const old=document.getElementById('openWorldMap');if(old)old.click()};
canvas.addEventListener('wheel',e=>{e.preventDefault();setZoom(zoom+(e.deltaY<0?.1:-.1))},{passive:false});
canvas.addEventListener('touchstart',e=>{if(e.touches.length===2){pinchStart=Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY);pinchZoom=zoom;e.preventDefault()}},{passive:false});
canvas.addEventListener('touchmove',e=>{if(e.touches.length===2&&pinchStart){const d=Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY);setZoom(pinchZoom*(d/pinchStart));e.preventDefault()}},{passive:false});
canvas.addEventListener('touchend',e=>{if(e.touches.length<2)pinchStart=0});

function resize(){const dpr=Math.min(devicePixelRatio||1,2),w=innerWidth,h=innerHeight;canvas.width=Math.floor(w*dpr);canvas.height=Math.floor(h*dpr);canvas.style.width=w+'px';canvas.style.height=h+'px';ctx.setTransform(dpr,0,0,dpr,0,0)}
addEventListener('resize',resize);resize();

function reset(){player.x=1260;player.y=1070;camera.x=player.x;camera.y=player.y;setZoom(1)}
const prevStart=document.getElementById('startLife').onclick;
document.getElementById('startLife').onclick=e=>{prevStart.call(document.getElementById('startLife'),e);if(!game.classList.contains('hidden'))setTimeout(()=>{reset();toast('Walking district loaded. Roads now form one continuous network.');},130)};

function move(dx,dy,dt){if(!dx&&!dy)return;const len=Math.hypot(dx,dy);dx/=len;dy/=len;const speed=185,nx=player.x+dx*speed*dt,ny=player.y+dy*speed*dt;let moved=false;if(walkable(nx,player.y)){player.x=nx;moved=true}if(walkable(player.x,ny)){player.y=ny;moved=true}if(moved){state.minutes+=dt*.48;state.energy=Math.max(0,state.energy-dt*.012)}}

function roadStroke(r,width,color){ctx.beginPath();ctx.moveTo(r.pts[0][0],r.pts[0][1]);for(let i=1;i<r.pts.length;i++)ctx.lineTo(r.pts[i][0],r.pts[i][1]);ctx.lineCap='round';ctx.lineJoin='round';ctx.lineWidth=width;ctx.strokeStyle=color;ctx.stroke()}
function drawWorld(){
 ctx.fillStyle='#245436';ctx.fillRect(0,0,WORLD.w,WORLD.h);
 // Sidewalk pass first, across the entire connected network.
 for(const r of roads)roadStroke(r,r.w+48,'#d9d7c5');
 // Asphalt pass second, so every junction is a clean continuous overlap.
 for(const r of roads)roadStroke(r,r.w,'#6d7478');
 // Pathways.
 for(const p of paths)roadStroke(p,p.w,'#bdb9a7');
 // Road markings.
 ctx.save();ctx.setLineDash([34,30]);ctx.lineCap='butt';for(const r of roads)roadStroke(r,5,'#f4e7a2');ctx.restore();
 // Recreation ground.
 ctx.fillStyle='#3f7b4d';ctx.fillRect(park.x,park.y,park.w,park.h);ctx.strokeStyle='#8bc28f';ctx.lineWidth=8;ctx.strokeRect(park.x,park.y,park.w,park.h);ctx.fillStyle='#d9f0d8';ctx.font='800 18px system-ui';ctx.fillText('SHEPPERTON RECREATION GROUND',park.x+24,park.y+34);
 // Buildings.
 for(const b of buildings){const pal={station:'#b54d47',shop:'#6d9870',cafe:'#c8794e',bank:'#697184',gym:'#8553a0',library:'#5a86a5',estate:'#9a7b62',office:'#667487',pub:'#b58a4b',home:'#d6b55b',house:'#9d9581'};ctx.fillStyle='#10201755';ctx.fillRect(b.x+12,b.y+12,b.w,b.h);ctx.fillStyle=pal[b.kind]||'#8f8878';ctx.fillRect(b.x,b.y,b.w,b.h);ctx.fillStyle='#3c2b24';ctx.fillRect(b.x+10,b.y+15,b.w-20,20);ctx.fillStyle='#e5e2d0';for(let x=b.x+22;x<b.x+b.w-22;x+=45)ctx.fillRect(x,b.y+50,20,20);ctx.fillStyle='#442c24';ctx.fillRect(b.x+b.w/2-14,b.y+b.h-36,28,36);if(b.name!=='House'){ctx.fillStyle='#0f172ae8';ctx.fillRect(b.x,b.y-28,Math.max(130,b.w),28);ctx.fillStyle='#fff';ctx.font='800 15px system-ui';ctx.fillText(b.name,b.x+10,b.y-9)}}
 // Road names.
 ctx.fillStyle='#efe7bd';ctx.font='800 16px system-ui';ctx.fillText('Station Road',315,350);ctx.fillText('Govett Avenue',1770,445);ctx.fillText('Green Lane',1450,1020);ctx.fillText('Bruce Avenue',1380,810);ctx.fillText('Station Approach',680,910);
 // POI interaction icons.
 for(const p of poi){ctx.fillStyle='#0f172a';ctx.strokeStyle='#fff';ctx.lineWidth=3;ctx.beginPath();ctx.arc(p.x,p.y,22,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.font='17px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#fff';ctx.fillText(p.glyph,p.x,p.y+1)}ctx.textAlign='left';ctx.textBaseline='alphabetic';
 // Trees / visual landmarks.
 for(const t of [[120,770],[180,1260],[620,430],[1130,420],[1500,1130],[2240,760],[1880,1230]]){ctx.fillStyle='#5d3b28';ctx.fillRect(t[0]-5,t[1],10,28);ctx.fillStyle='#2c7047';ctx.beginPath();ctx.arc(t[0],t[1]-5,25,0,Math.PI*2);ctx.fill()}
}
function drawPlayerV2(){const id=character.avatar||'phil';ctx.save();ctx.translate(player.x,player.y);ctx.fillStyle='#0b122066';ctx.beginPath();ctx.ellipse(0,20,14,5,0,0,Math.PI*2);ctx.fill();ctx.strokeStyle=id==='harry'?'#65753a':id==='matt'?'#ece7d5':'#171717';ctx.lineWidth=id==='harry'?15:12;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(0,-2);ctx.lineTo(0,15);ctx.stroke();ctx.strokeStyle='#4b5563';ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(-5,13);ctx.lineTo(-7,28);ctx.moveTo(5,13);ctx.lineTo(7,28);ctx.stroke();ctx.fillStyle=id==='matt'?'#d99a70':'#e1b089';ctx.strokeStyle='#111827';ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,-14,9,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.fillStyle=id==='phil'?'#b87942':id==='harry'?'#4a2f22':'#c4a77d';ctx.beginPath();ctx.arc(0,-17,8,Math.PI,Math.PI*2);ctx.fill();if(id==='harry'){ctx.strokeStyle='#111827';ctx.lineWidth=1.4;ctx.strokeRect(-7,-15,6,4);ctx.strokeRect(1,-15,6,4)}ctx.restore()}
function drawMini(){const sx=miniCanvas.width/WORLD.w,sy=miniCanvas.height/WORLD.h;mctx.clearRect(0,0,miniCanvas.width,miniCanvas.height);mctx.fillStyle='#173b27';mctx.fillRect(0,0,miniCanvas.width,miniCanvas.height);mctx.lineCap='round';mctx.lineJoin='round';for(const r of roads){mctx.beginPath();mctx.moveTo(r.pts[0][0]*sx,r.pts[0][1]*sy);for(let i=1;i<r.pts.length;i++)mctx.lineTo(r.pts[i][0]*sx,r.pts[i][1]*sy);mctx.strokeStyle='#aeb2ab';mctx.lineWidth=Math.max(2,r.w*sx);mctx.stroke()}mctx.fillStyle='#60a5fa';mctx.beginPath();mctx.arc(player.x*sx,player.y*sy,5,0,Math.PI*2);mctx.fill();mctx.strokeStyle='#fff';mctx.lineWidth=2;mctx.stroke()}

update=function(dt){if(modalOpen||game.classList.contains('hidden'))return;const ov=document.getElementById('overviewPanel');if(ov&&ov.classList.contains('show'))return;const dx=(keys.right?1:0)-(keys.left?1:0),dy=(keys.down?1:0)-(keys.up?1:0);move(dx,dy,dt);camera.x+=(player.x-camera.x)*Math.min(1,dt*7);camera.y+=(player.y-camera.y)*Math.min(1,dt*7);currentPoi=null;let best=52;for(const p of poi){const d=Math.hypot(player.x-p.x,player.y-p.y);if(d<best){best=d;currentPoi=p}}near=currentPoi;if(currentPoi){promptEl.textContent='ACTION • '+currentPoi.name;promptEl.classList.remove('hidden');actionBtn.classList.add('active')}else{promptEl.classList.add('hidden');actionBtn.classList.remove('active')}ui()};
interact=function(){if(currentPoi)openBuilding(currentPoi)};
draw=function(){const dpr=Math.min(devicePixelRatio||1,2),vw=canvas.width/dpr,vh=canvas.height/dpr;ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,vw,vh);ctx.fillStyle='#173b27';ctx.fillRect(0,0,vw,vh);const halfW=vw/(2*zoom),halfH=vh/(2*zoom);let cx=clamp(camera.x,halfW,WORLD.w-halfW),cy=clamp(camera.y,halfH,WORLD.h-halfH);if(halfW*2>WORLD.w)cx=WORLD.w/2;if(halfH*2>WORLD.h)cy=WORLD.h/2;ctx.save();ctx.translate(vw/2,vh/2);ctx.scale(zoom,zoom);ctx.translate(-cx,-cy);drawWorld();drawPlayerV2();ctx.restore();drawMini()};
})();