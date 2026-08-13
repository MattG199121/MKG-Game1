(() => {
'use strict';

const state=()=>{try{return window.__LBT_TEST__?.getState?.()||null}catch{return null}};
const hash=value=>{let h=2166136261;for(const ch of String(value||'')){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0};

function addStandWorkers(){
  const s=state(),chars=window.LBTCharacters,stand=document.querySelector('#simArea .lemon-stand');
  if(!s||!chars||!stand||stand.querySelector('.lbt-stand-workers'))return;
  const level=Math.max(0,Math.min(3,Number(s.upgrades?.staff||0)));
  if(!level)return;
  const pool=chars.workerIds||[];if(!pool.length)return;
  const wrap=document.createElement('div');wrap.className='lbt-stand-workers';wrap.setAttribute('aria-label',`${level} stand worker${level===1?'':'s'} on shift`);
  for(let i=0;i<level;i++){
    const id=pool[hash(`${s.businessName}:${s.day}:${i}`)%pool.length];
    const worker=document.createElement('span');worker.className='lbt-stand-worker';worker.innerHTML=chars.renderPortrait(id,'worker');wrap.appendChild(worker);
  }
  stand.appendChild(wrap);
}

function feedbackTone(text){
  const t=String(text||'');
  if(/Perfect|Great|Love|Nice|Back again/i.test(t))return 'happy';
  if(/Too expensive|Too sweet|Too sour|Needs more|Not cold|Too icy|Too weak|Waited|Queue|Sold out|Not quite/i.test(t))return 'warning';
  return 'neutral';
}

function addFeedbackToInsights(){
  const s=state(),chars=window.LBTCharacters,list=document.querySelector('.insights-list');
  if(!s||!chars||!list||document.querySelector('.lbt-feedback-card'))return;
  const rows=(s.lastResult?.feedback||[]).slice(-3).reverse();if(!rows.length)return;
  const card=document.createElement('section');card.className='lbt-feedback-card';
  const head=document.createElement('div');head.className='lbt-feedback-head';head.innerHTML='<span>💬</span><div><strong>Recent customer voices</strong><p>Actual reactions from today’s trading.</p></div>';card.appendChild(head);
  const pool=chars.customerIds||[];
  rows.forEach((text,i)=>{
    const row=document.createElement('div');row.className=`lbt-feedback-row ${feedbackTone(text)}`;
    const avatar=document.createElement('span');avatar.className='lbt-feedback-avatar';const id=pool[hash(`${s.lastResult.day}:${text}:${i}`)%Math.max(1,pool.length)];if(id)avatar.innerHTML=chars.renderPortrait(id,'customer');
    const copy=document.createElement('div');const strong=document.createElement('strong');strong.textContent=String(text);const small=document.createElement('small');small.textContent=feedbackTone(text)==='happy'?'Positive customer':'Customer feedback';copy.append(strong,small);row.append(avatar,copy);card.appendChild(row);
  });
  list.insertAdjacentElement('afterend',card);
}

function decorate(){addStandWorkers();addFeedbackToInsights()}
const observer=new MutationObserver(()=>requestAnimationFrame(decorate));
function start(){decorate();observer.observe(document.body,{childList:true,subtree:true});document.addEventListener('click',()=>setTimeout(decorate,35),true)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
