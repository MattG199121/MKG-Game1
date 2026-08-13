(() => {
'use strict';
const SAVE_KEY='lemon-stand-empire-v01';
const SELECTOR='.pe-avatar,.pe-big-avatar,.re-manager>span:first-child,.re-person>span:first-child,.hq-avatar,.hq-big-avatar';
const hash=value=>{let h=2166136261;for(const ch of String(value||'')){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0};
const state=()=>{try{return window.__LBT_TEST__?.getState?.()||null}catch{return null}};
function pool(role){const c=window.LBTCharacters||{};if(role==='regionalManager')return c.regionalManagerIds||[];if(role==='departmentHead')return c.hqIds||[];return c.locationManagerIds||[]}
function save(s){try{localStorage.setItem(SAVE_KEY,JSON.stringify(s))}catch{}}
function roleFor(p){return p?.role==='regionalManager'?'regionalManager':p?.role==='departmentHead'?'departmentHead':'locationManager'}
function people(s){return [...(s.peopleExpansion?.managers||[]),...(s.peopleExpansion?.candidates||[]),...(s.regionExpansion?.externalCandidates||[]),...(s.hqExpansion?.candidates||[]),...Object.values(s.hqExpansion?.heads||{})]}
function visibleName(el){const scope=el.closest('[data-manager],[data-candidate],.pe-profile,.hq-profile,.re-manager,.pe-manager-row,.pe-person-card,.hq-person-row,.pe-inline-manager')||el.parentElement;return scope?.querySelector('h1,strong')?.textContent?.trim()||null}
function findPerson(el){const s=state();if(!s)return null;const rows=people(s),host=el.closest('[data-manager],[data-candidate]'),mid=host?.dataset.manager,cid=host?.dataset.candidate;if(mid){const m=rows.find(x=>x.id===mid);if(m)return m}if(cid){const c=rows.find(x=>x.id===cid);if(c)return c}const name=visibleName(el);return name?rows.find(x=>x.name===name)||null:null}
function avatarId(p,role){const ids=pool(role);if(!ids.length)return null;if(p.avatarId&&ids.includes(p.avatarId))return p.avatarId;p.avatarId=ids[hash(p.id||p.name||role)%ids.length];const s=state();if(s)save(s);return p.avatarId}
function decorate(el){if(!el||el.dataset.characterUiReady==='1'||!window.LBTCharacters)return;const p=findPerson(el);if(!p)return;const role=roleFor(p),id=avatarId(p,role);if(!id)return;el.dataset.characterUiReady='1';el.classList.add('lbt-avatar-portrait','lbt-avatar-ui',`lbt-avatar-${role}`);el.innerHTML=window.LBTCharacters.renderPortrait(id,role);el.setAttribute('aria-label',`${p.name} avatar`)}
function all(root=document){if(root.matches?.(SELECTOR))decorate(root);root.querySelectorAll?.(SELECTOR).forEach(decorate)}
const obs=new MutationObserver(ms=>ms.forEach(m=>m.addedNodes.forEach(n=>{if(n instanceof Element)all(n)})));
function start(){all();obs.observe(document.body,{subtree:true,childList:true});document.addEventListener('click',()=>setTimeout(()=>all(),35),true)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
