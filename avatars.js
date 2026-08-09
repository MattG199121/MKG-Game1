(()=>{
const ASSET_VERSION='20260809-2311';
const css=`
.avatar-panel{margin:4px 0 20px}.avatar-label{display:block;font-size:13px;font-weight:800;color:#cbd5e1;margin-bottom:10px}
.avatar-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.avatar-card{position:relative;border:2px solid #334155;background:#0f172a;border-radius:16px;padding:8px 8px 10px;color:#fff;cursor:pointer;overflow:hidden;transition:.15s}
.avatar-card:hover{border-color:#64748b;transform:translateY(-1px)}.avatar-card.selected{border-color:#60a5fa;box-shadow:0 0 0 3px #2563eb33;background:#172554}
.avatar-card img{display:block;width:100%;height:205px;object-fit:contain;object-position:center;border-radius:11px;background:#111827}
.avatar-name{display:flex;align-items:center;justify-content:space-between;margin-top:9px;font-size:14px;font-weight:900}.avatar-tick{width:20px;height:20px;border-radius:50%;display:grid;place-items:center;background:#2563eb;opacity:0;font-size:12px}
.avatar-card.selected .avatar-tick{opacity:1}.avatar-hint{font-size:11px;color:#94a3b8;margin-top:6px}.appearance-hidden{display:none!important}
.preview-card .character-preview{display:none!important}.selected-avatar-preview{position:absolute;inset:16px 16px 42px;width:calc(100% - 32px);height:calc(100% - 58px);object-fit:contain;object-position:center bottom;border-radius:18px;display:none}
.selected-avatar-preview.show{display:block}.avatar-preview-placeholder{position:absolute;inset:0;display:grid;place-items:center;text-align:center;padding:28px;color:#93c5fd;font-weight:800;letter-spacing:.04em}
.avatar-preview-placeholder small{display:block;color:#94a3b8;font-weight:600;letter-spacing:0;margin-top:8px}
.avatar-load-error{display:grid!important;place-items:center;color:#fca5a5;font-size:12px;text-align:center;padding:12px}
@media(max-width:760px){.avatar-grid{grid-template-columns:repeat(3,minmax(0,1fr));gap:7px}.avatar-card{padding:5px}.avatar-card img{height:150px}.avatar-name{font-size:12px}.avatar-hint{display:none}.selected-avatar-preview{inset:10px 10px 34px;width:calc(100% - 20px);height:calc(100% - 44px)}}
`;
const style=document.createElement('style');style.textContent=css;document.head.appendChild(style);
const asset=p=>p+'?v='+ASSET_VERSION;
const avatars={
 phil:{name:'Phil',img:asset('avatars/phil.jpg'),body:'standard',skin:'#f1c7a5',hair:'short',shirt:'#171717'},
 matt:{name:'Matt',img:asset('avatars/matt.jpg'),body:'slim',skin:'#d99a70',hair:'short',shirt:'#eee8d8'},
 harry:{name:'Harry',img:asset('avatars/harry.jpg'),body:'broad',skin:'#d6a57c',hair:'short',shirt:'#647333'}
};
let selectedAvatar='';
const form=document.querySelector('#characterSetup .form-card');
const nameField=document.getElementById('characterName').closest('.field');
const panel=document.createElement('div');panel.className='avatar-panel';
panel.innerHTML=`<span class="avatar-label">CHOOSE AVATAR</span><div class="avatar-grid">${Object.entries(avatars).map(([id,a])=>`<button type="button" class="avatar-card" data-avatar="${id}"><img src="${a.img}" alt="${a.name} avatar"><span class="avatar-name"><span>${a.name}</span><span class="avatar-tick">✓</span></span></button>`).join('')}</div><div class="avatar-hint">Choose Phil, Matt or Harry, then roll your starting abilities.</div>`;
nameField.after(panel);
[...form.querySelectorAll('.field')].forEach(f=>{const txt=(f.querySelector('label')?.textContent||'').trim();if(['BODY TYPE','SKIN TONE','HAIR','TOP COLOUR'].includes(txt))f.classList.add('appearance-hidden')});
const previewCard=document.querySelector('#characterSetup .preview-card');
const previewImg=document.createElement('img');previewImg.id='selectedAvatarPreview';previewImg.className='selected-avatar-preview';previewImg.alt='Selected avatar';
const previewPlaceholder=document.createElement('div');previewPlaceholder.className='avatar-preview-placeholder';previewPlaceholder.innerHTML='<div>Choose your character<small>The selected avatar will appear here.</small></div>';
previewCard.append(previewImg,previewPlaceholder);
function choose(id){
 selectedAvatar=id;const a=avatars[id];character.avatar=id;character.body=a.body;character.skin=a.skin;character.hair=a.hair;character.shirt=a.shirt;
 document.querySelectorAll('.avatar-card').forEach(c=>c.classList.toggle('selected',c.dataset.avatar===id));
 document.getElementById('characterName').value=a.name;
 previewImg.src=a.img;previewImg.alt=a.name+' avatar';previewImg.classList.add('show');previewPlaceholder.style.display='none';
 document.getElementById('setupError').textContent='';
}
document.querySelectorAll('.avatar-card').forEach(c=>{const img=c.querySelector('img');img.onerror=()=>{img.alt=c.dataset.avatar+' image failed to load';};c.onclick=()=>choose(c.dataset.avatar)});
previewImg.onerror=()=>{previewImg.classList.remove('show');previewPlaceholder.style.display='grid';previewPlaceholder.innerHTML='<div>Avatar image failed to load<small>Refresh the page once after the new deployment finishes.</small></div>'};
const startBtn=document.getElementById('startLife'),existingStart=startBtn.onclick;
startBtn.onclick=e=>{if(!selectedAvatar){document.getElementById('setupError').textContent='Choose Phil, Matt or Harry before starting.';return}existingStart.call(startBtn,e)};
const newBtn=document.getElementById('newGame'),existingNew=newBtn.onclick;
newBtn.onclick=e=>{selectedAvatar='';delete character.avatar;document.querySelectorAll('.avatar-card').forEach(c=>c.classList.remove('selected'));document.getElementById('characterName').value='';previewImg.removeAttribute('src');previewImg.classList.remove('show');previewPlaceholder.style.display='grid';previewPlaceholder.innerHTML='<div>Choose your character<small>The selected avatar will appear here.</small></div>';existingNew.call(newBtn,e)};
drawPlayer=function(c){
 const id=character.avatar||'phil',a=avatars[id]||avatars.phil;ctx.save();ctx.translate(player.x-c.x,player.y-c.y);const broad=id==='harry'?1.18:id==='matt'?.92:1;
 ctx.fillStyle='#02061766';ctx.beginPath();ctx.ellipse(0,28,14*broad,5,0,0,Math.PI*2);ctx.fill();
 if(id==='matt'){ctx.strokeStyle='#d99a70';ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(-5,12);ctx.lineTo(-6,27);ctx.moveTo(5,12);ctx.lineTo(6,27);ctx.stroke()}else{ctx.strokeStyle='#9ca3af';ctx.lineWidth=7*broad;ctx.beginPath();ctx.moveTo(-4,12);ctx.lineTo(-5,27);ctx.moveTo(4,12);ctx.lineTo(5,27);ctx.stroke()}
 ctx.strokeStyle=id==='harry'?'#6b4423':'#374151';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(-8,28);ctx.lineTo(-2,28);ctx.moveTo(2,28);ctx.lineTo(8,28);ctx.stroke();ctx.strokeStyle=id==='harry'?'#647333':id==='matt'?'#eee8d8':'#171717';ctx.lineWidth=11*broad;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(0,-2);ctx.lineTo(0,14);ctx.stroke();ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(-6*broad,1);ctx.lineTo(-10*broad,13);ctx.moveTo(6*broad,1);ctx.lineTo(10*broad,13);ctx.stroke();ctx.fillStyle=a.skin;ctx.strokeStyle='#111827';ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,-12,8.5,0,Math.PI*2);ctx.fill();ctx.stroke();if(id==='matt'){ctx.fillStyle='#d2b48c';ctx.beginPath();ctx.ellipse(0,-19,10,4,0,Math.PI,Math.PI*2);ctx.fill();ctx.fillRect(-8,-20,16,4);ctx.fillStyle='#111827';ctx.fillRect(-8,-14,16,3)}else{ctx.fillStyle=id==='phil'?'#b87942':'#4a2f22';ctx.beginPath();ctx.arc(0,-15,8,Math.PI,Math.PI*2);ctx.fill()}if(id==='harry'){ctx.strokeStyle='#111827';ctx.lineWidth=1.5;ctx.strokeRect(-7,-14,6,4);ctx.strokeRect(1,-14,6,4);ctx.beginPath();ctx.moveTo(-1,-12);ctx.lineTo(1,-12);ctx.stroke()}if(id==='phil'){ctx.fillStyle='#9a5b32';ctx.fillRect(-5,-8,10,3)}ctx.restore();
};
})();
