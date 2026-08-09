(()=>{
const MAP_VERSION='20260809-2315';
const HOME=[51.39638,-0.44487];
const STATION=[51.39680664,-0.446776819];
const WHOLE_SHEPPERTON=[[51.3815,-0.4770],[51.4195,-0.4100]];
const HARD_BOUNDS=[[51.372,-0.492],[51.430,-0.392]];
const style=document.createElement('style');
style.textContent=`
#realMap{position:absolute;inset:0;z-index:0;background:#1c2524}.game-tiles{filter:brightness(.64) saturate(.70) contrast(1.20) sepia(.10)}.raw-tiles{filter:none}
#game canvas{display:none!important}.hud{z-index:1200}.bottom-ui{z-index:1300}.prompt{z-index:1350}.toast{z-index:1400}.legend{z-index:1200}.modal{z-index:2000}
.leaflet-control-attribution{background:rgba(0,0,0,.70)!important;color:#ddd!important;font-size:9px!important}.leaflet-control-attribution a{color:#fff!important}
.leaflet-bottom.leaflet-right{bottom:178px}.leaflet-bottom.leaflet-left{bottom:178px}.leaflet-control-zoom a{background:#0f172ae8!important;color:#fff!important;border-color:#475569!important}
.map-tools{position:absolute;z-index:1250;right:max(14px,env(safe-area-inset-right));top:140px;display:grid;gap:7px}.map-tools button{border:1px solid #475569;background:#0f172ae8;color:#fff;border-radius:11px;padding:8px 10px;font:700 11px system-ui;box-shadow:0 6px 18px #0005}.map-tools button.active{background:#1d4ed8}
.poi-pin{width:32px;height:32px;border-radius:50%;display:grid;place-items:center;border:2px solid #fff;background:#0f172a;color:#fff;box-shadow:0 3px 12px #0008;font-size:15px}.poi-pin.home{background:#d7aa3b;color:#111}.poi-pin.station{background:#d84b45}.poi-pin.job{background:#2563eb}.poi-pin.life{background:#059669}.poi-pin.fun{background:#7c3aed}
.player-map-icon{width:46px;height:58px;border-radius:12px;overflow:hidden;border:3px solid #fff;background:#111827;box-shadow:0 4px 14px #000a;position:relative}.player-map-icon img{width:100%;height:100%;object-fit:cover;object-position:top center}.player-map-icon:after{content:'';position:absolute;left:50%;bottom:-8px;transform:translateX(-50%);border-left:6px solid transparent;border-right:6px solid transparent;border-top:9px solid #fff}
.leaflet-tooltip.game-poi-label{background:#0c0e10ee;color:#fff;border:1px solid #f0e7ca70;border-radius:4px;box-shadow:0 3px 10px #0007;font-weight:800;padding:5px 7px;font-size:11px}.leaflet-tooltip.game-poi-label:before{display:none}
.map-badge{position:absolute;z-index:1190;left:50%;top:86px;transform:translateX(-50%);background:#020617d9;border:1px solid #475569;border-radius:999px;padding:7px 11px;color:#bfdbfe;font:800 10px system-ui;letter-spacing:.08em;pointer-events:none;white-space:nowrap}
@media(max-width:740px){.map-tools{top:82px;right:10px;grid-template-columns:repeat(3,auto)}.map-tools button{padding:7px 8px;font-size:10px}.map-badge{top:64px;font-size:9px}.leaflet-bottom.leaflet-right,.leaflet-bottom.leaflet-left{bottom:160px}.leaflet-control-zoom{display:none}}
`;
document.head.appendChild(style);

const gameEl=document.getElementById('game');
const realMap=document.createElement('div');realMap.id='realMap';gameEl.insertBefore(realMap,canvas);
const badge=document.createElement('div');badge.className='map-badge';badge.textContent='LEVEL 1 · REAL SHEPPERTON ROAD MAP';gameEl.appendChild(badge);
const tools=document.createElement('div');tools.className='map-tools';tools.innerHTML='<button id="mapFollow" class="active">Follow</button><button id="mapWhole">Whole Shepperton</button><button id="mapStyle">Street View</button>';gameEl.appendChild(tools);

let map=null,tiles=null,playerMapMarker=null,currentPoi=null,followPlayer=true,lastPan=0,gameStyle=true;
let playerLat=HOME[0],playerLng=HOME[1];
const poi=[
 {id:'home',name:'Home',lat:HOME[0],lng:HOME[1],kind:'home',glyph:'⌂',desc:'Your starting home. Sleep, recover and save your progress here.',actions:[['Sleep until 08:00','sleep'],['Have a quick meal (-£3, +25 Energy)','meal']]},
 {id:'station',name:'Shepperton Station',lat:STATION[0],lng:STATION[1],kind:'station',glyph:'🚆',desc:'The real Shepperton Station location. Travel to other districts will unlock later.',actions:[['Check departures','departures']]},
 {id:'cafe',name:'The Corner Cup',lat:51.39668,lng:-0.44735,kind:'job',glyph:'☕',desc:'A fictional café placed on the real Shepperton map. Eat or pick up an early shift.',actions:[['Buy breakfast (-£6, +35 Energy)','breakfast'],['Work 3 hours','cafejob']]},
 {id:'shop',name:'Village Mart',lat:51.39698,lng:-0.44782,kind:'job',glyph:'🛒',desc:'A fictional convenience shop for supplies and casual work.',actions:[['Buy snack (-£3, +18 Energy)','snack'],['Work 4 hours','shopjob']]},
 {id:'bank',name:'Crown Bank',lat:51.39687,lng:-0.44835,kind:'life',glyph:'£',desc:'A fictional bank. Savings and investments will be expanded later.',actions:[['Check account','account']]},
 {id:'gym',name:'Forge Fitness',lat:51.39636,lng:-0.44802,kind:'life',glyph:'💪',desc:'Train Strength and improve physical career options.',actions:[['Train 90 mins (-25 Energy, -£5, +1 STR)','train']]},
 {id:'library',name:'Shepperton Learning Hub',lat:51.39713,lng:-0.44612,kind:'life',glyph:'📚',desc:'Study here to increase Intelligence and unlock better careers.',actions:[['Study 2 hours (-20 Energy, +1 INT)','study']]},
 {id:'pub',name:'The Riverside Fox',lat:51.39606,lng:-0.44572,kind:'fun',glyph:'🍺',desc:'A fictional pub where socialising improves Charisma.',actions:[['Socialise 2 hours (-£12, +1 CHA)','social']]},
 {id:'office',name:'MKG Services',lat:51.39728,lng:-0.44488,kind:'job',glyph:'💼',desc:'A fictional office employer. Intelligence improves your pay.',actions:[['Work 5 hours','officejob']]},
 {id:'rec',name:'Recreation Ground',lat:51.39566,lng:-0.44318,kind:'life',glyph:'🏃',desc:'Open space for exercise and future events.',actions:[['Go for a run (1 hour, -15 Energy)','run']]},
 {id:'estate',name:'Village Estates',lat:51.39651,lng:-0.44618,kind:'job',glyph:'🏠',desc:'A fictional estate agent. Property will become a major progression path.',actions:[['Browse properties','properties']]}
];

function poiIcon(p){return L.divIcon({className:'',html:`<div class="poi-pin ${p.kind}">${p.glyph}</div>`,iconSize:[32,32],iconAnchor:[16,30],tooltipAnchor:[0,-24]})}
function playerIcon(){const id=character.avatar||'phil';return L.divIcon({className:'',html:`<div class="player-map-icon"><img src="avatars/${id}.jpg?v=${MAP_VERSION}" alt=""></div>`,iconSize:[46,66],iconAnchor:[23,61]})}
function metres(aLat,aLng,bLat,bLng){const R=6371000,rad=Math.PI/180,dLat=(bLat-aLat)*rad,dLng=(bLng-aLng)*rad;const s=Math.sin(dLat/2)**2+Math.cos(aLat*rad)*Math.cos(bLat*rad)*Math.sin(dLng/2)**2;return 2*R*Math.asin(Math.sqrt(s))}

function initMap(){
 if(map){map.invalidateSize();return}
 map=L.map('realMap',{zoomControl:true,preferCanvas:true,maxBounds:HARD_BOUNDS,maxBoundsViscosity:.72,minZoom:12,maxZoom:19,attributionControl:true}).setView(HOME,18);
 tiles=L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{minZoom:12,maxZoom:19,attribution:'&copy; OpenStreetMap contributors',className:'game-tiles',crossOrigin:true}).addTo(map);
 poi.forEach(p=>L.marker([p.lat,p.lng],{icon:poiIcon(p),keyboard:false}).addTo(map).bindTooltip(p.name,{permanent:false,direction:'right',className:'game-poi-label',offset:[8,-3]}));
 playerMapMarker=L.marker(HOME,{icon:playerIcon(),keyboard:false,interactive:false,zIndexOffset:1000}).addTo(map);
 map.on('dragstart zoomstart',()=>{followPlayer=false;document.getElementById('mapFollow').classList.remove('active')});
 setTimeout(()=>map.invalidateSize(),80);
}
function resetPlayerMap(){playerLat=HOME[0];playerLng=HOME[1];if(playerMapMarker){playerMapMarker.setIcon(playerIcon());playerMapMarker.setLatLng([playerLat,playerLng])}if(map){followPlayer=true;map.setView([playerLat,playerLng],18,{animate:false});document.getElementById('mapFollow').classList.add('active')}}

document.getElementById('mapFollow').onclick=()=>{followPlayer=true;document.getElementById('mapFollow').classList.add('active');if(map)map.setView([playerLat,playerLng],Math.max(map.getZoom(),17),{animate:false})};
document.getElementById('mapWhole').onclick=()=>{if(!map)return;followPlayer=false;document.getElementById('mapFollow').classList.remove('active');map.fitBounds(WHOLE_SHEPPERTON,{padding:[24,24]})};
document.getElementById('mapStyle').onclick=()=>{if(!tiles)return;gameStyle=!gameStyle;const pane=tiles.getContainer();if(pane)pane.className=pane.className.replace(/game-tiles|raw-tiles/g,'').trim()+' '+(gameStyle?'game-tiles':'raw-tiles');document.getElementById('mapStyle').textContent=gameStyle?'Street View':'Gameplay View'};

const previousStart=document.getElementById('startLife').onclick;
document.getElementById('startLife').onclick=e=>{previousStart.call(document.getElementById('startLife'),e);if(!game.classList.contains('hidden'))setTimeout(()=>{initMap();resetPlayerMap();toast('Level 1 loaded: real Shepperton map.')},80)};

update=function(dt){
 if(modalOpen||game.classList.contains('hidden'))return;
 if(!map)initMap();
 let dx=(keys.right?1:0)-(keys.left?1:0),dy=(keys.down?1:0)-(keys.up?1:0);
 if(dx||dy){
  const len=Math.hypot(dx,dy);dx/=len;dy/=len;
  const metresPerSec=5.0;
  const latMetres=111320,lngMetres=111320*Math.cos(playerLat*Math.PI/180);
  playerLat+=(-dy*metresPerSec*dt)/latMetres;
  playerLng+=(dx*metresPerSec*dt)/lngMetres;
  playerLat=Math.max(HARD_BOUNDS[0][0],Math.min(HARD_BOUNDS[1][0],playerLat));
  playerLng=Math.max(HARD_BOUNDS[0][1],Math.min(HARD_BOUNDS[1][1],playerLng));
  state.minutes+=dt*.45;state.energy=Math.max(0,state.energy-dt*.012);
  if(playerMapMarker)playerMapMarker.setLatLng([playerLat,playerLng]);
  const now=performance.now();if(followPlayer&&map&&now-lastPan>110){map.panTo([playerLat,playerLng],{animate:false});lastPan=now}
 }
 currentPoi=null;let best=22;
 for(const p of poi){const d=metres(playerLat,playerLng,p.lat,p.lng);if(d<best){best=d;currentPoi=p}}
 near=currentPoi;
 if(currentPoi){promptEl.textContent='ACTION • '+currentPoi.name;promptEl.classList.remove('hidden');actionBtn.classList.add('active')}else{promptEl.classList.add('hidden');actionBtn.classList.remove('active')}
 ui();
};
draw=function(){};
interact=function(){if(currentPoi)openBuilding(currentPoi)};

// Keep map correctly sized when orientation or browser chrome changes.
addEventListener('resize',()=>{if(map)setTimeout(()=>map.invalidateSize(),60)});
})();