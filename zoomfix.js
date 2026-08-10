(()=>{
'use strict';
const canvas=document.getElementById('canvas');
const zin=document.getElementById('zoomIn');
const zout=document.getElementById('zoomOut');
if(!canvas||!zin||!zout)return;

// Give the zoom controls their own touch layer so iOS doesn't hand these
// touches to the underlying game controls.
for(const btn of [zin,zout]){
  btn.style.touchAction='manipulation';
  btn.style.userSelect='none';
  btn.style.webkitUserSelect='none';
  btn.addEventListener('pointerdown',e=>{
    e.preventDefault();
    e.stopPropagation();
    if(typeof btn.onclick==='function') btn.onclick(e);
  },true);
  btn.addEventListener('touchstart',e=>{
    e.preventDefault();
    e.stopPropagation();
  },{capture:true,passive:false});
  btn.addEventListener('touchend',e=>{
    e.preventDefault();
    e.stopPropagation();
  },{capture:true,passive:false});
}

// Robust pinch-to-zoom fallback. Rather than reaching into the engine's
// private camera state, it invokes the engine's own +/- controls in small
// steps, so scale bars and rendering stay perfectly synchronised.
let pinch=null;
function distance(t){
  const a=t[0],b=t[1];
  return Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY);
}
canvas.addEventListener('touchstart',e=>{
  if(e.touches.length===2){
    pinch={last:distance(e.touches)};
    e.preventDefault();
    e.stopImmediatePropagation();
  }
},{capture:true,passive:false});
canvas.addEventListener('touchmove',e=>{
  if(!pinch||e.touches.length!==2)return;
  const d=distance(e.touches);
  const ratio=d/pinch.last;
  if(ratio>1.045){
    zin.click();
    pinch.last=d;
  }else if(ratio<0.955){
    zout.click();
    pinch.last=d;
  }
  e.preventDefault();
  e.stopImmediatePropagation();
},{capture:true,passive:false});
canvas.addEventListener('touchend',e=>{
  if(e.touches.length<2)pinch=null;
},{capture:true,passive:true});
canvas.addEventListener('touchcancel',()=>{pinch=null},{capture:true,passive:true});

// Make the controls more obvious on touch devices.
const style=document.createElement('style');
style.textContent=`
#zoomIn,#zoomOut{min-width:52px!important;height:46px!important;font-size:24px!important;position:relative;z-index:2001!important}
#zoomRead{min-width:70px!important;font-size:12px!important}
@media(max-width:740px){#zoomIn,#zoomOut{min-width:48px!important;height:42px!important;font-size:22px!important}.geo-controls{z-index:2000!important}}
`;
document.head.appendChild(style);
})();
