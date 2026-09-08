import {brands,topics} from './catalog.mjs';
import {createPlan,pacing} from './model.mjs';
const $=id=>document.getElementById(id), money=c=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(c/100);
let current;
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const q=new URLSearchParams(location.search);
for(const b of brands)$('brand').add(new Option(b.name,b.id));
for(const t of topics)$('topic').add(new Option(t.name,t.id));
$('brand').value=brands.some(b=>b.id===q.get('brand'))?q.get('brand'):document.body.dataset.brand;
$('topic').value=topics.some(t=>t.id===q.get('topic'))?q.get('topic'):'mva';
for(const key of ['firm','location','start','radius','variant','tier'])if(q.has(key))$(key).value=q.get(key).slice(0,100);
if(!$('start').value)$('start').value=new Date().toISOString().slice(0,10);
$('as-of').value=new Date().toISOString().slice(0,10);
function radius(){ $('radius-wrap').hidden=$('topic').value!=='mva'; }
$('topic').addEventListener('change',()=>{radius();$('tier').value=$('topic').value==='mva'?'major':'standard';});radius();if(!q.has('tier'))$('tier').value=$('topic').value==='mva'?'major':'standard';
function preview(p){const t=topics.find(x=>x.id===p.topic),b=brands.find(x=>x.id===p.brand);return `<p class="eyebrow">${esc(b.name)} · Campaign preview</p><h3>${p.variant==='educational'?'Understand the next step for':'Explore your options after'} ${esc(t.name.toLowerCase())}.</h3><p>${p.geo.location?'Coverage to confirm: '+esc(p.geo.location)+(p.geo.radiusMiles?' · '+p.geo.radiusMiles+' miles':''):'Geography confirmed during campaign setup.'}</p><p>A clear introduction, a private inquiry and the right next step. Firm-specific eligibility and disclosures are added before launch.</p><p><strong>Demo only — no legal inquiry is collected here.</strong></p>`;}
function render(){try{
 const p=createPlan(Object.fromEntries(new FormData($('builder'))));current=p;$('error').textContent='';$('result').hidden=false;$('empty').hidden=true;
 document.documentElement.style.setProperty('--accent',brands.find(b=>b.id===p.brand).color);
 $('plan-title').textContent=(p.firm?p.firm+' · ':'')+p.title;$('scope').textContent=p.start+' → '+p.end+' · '+(p.geo.location||'Geography to confirm')+(p.geo.radiusMiles?' · '+p.geo.radiusMiles+'-mile radius':'');$('media').textContent=money(p.mediaCents);
 $('page-preview').innerHTML=preview(p);$('topic-page').href=brands.find(b=>b.id===p.brand).url+'/campaigns/'+p.topic+'/?variant='+p.variant;
 $('schedule').innerHTML=p.schedule.map(r=>`<tr><td>${r.day}</td><td>${r.date}</td><td>${money(r.budgetCents)}</td><td>${esc(r.task)}</td></tr>`).join('');
 $('requirements').innerHTML=p.launchRequirements.map(x=>`<li>${esc(x)}</li>`).join('');
 $('research').replaceChildren(document.createTextNode(p.qualificationReview+' '));if(p.research){const a=document.createElement('a');a.href=p.research;a.textContent='Court docket reference';a.target='_blank';a.rel='noopener noreferrer';$('research').append(a);}
 $('notice').textContent='Plan ready. Download it to keep a copy; nothing has been submitted.';$('pace-result').textContent='';$('share-url').hidden=true;
}catch(e){current=null;$('error').textContent=e.message;$('result').hidden=true;$('empty').hidden=false;}}
$('builder').addEventListener('submit',e=>{e.preventDefault();render();});
$('builder').addEventListener('input',()=>{if(current){current=null;$('result').hidden=true;$('empty').hidden=false;}});
function download(contents,name,type){const u=URL.createObjectURL(new Blob([contents],{type})),a=document.createElement('a');a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);}
$('download').addEventListener('click',()=>{if(current)download(JSON.stringify(current,null,2),current.id+'.json','application/json');});
$('demo-download').addEventListener('click',()=>{if(current)download(`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>${esc(current.title)} — campaign preview</title><style>body{font:18px/1.6 system-ui;background:#f4f6f8;color:#17304b;max-width:800px;margin:60px auto;padding:24px}h3{font-size:40px;line-height:1.15}.eyebrow{font-size:14px}</style>${preview(current)}<hr><p>Prepared for ${esc(current.firm||'campaign discussion')}. Proposed sprint ${current.start} to ${current.end}. Subject to scope, routing and launch review.</p></html>`,current.id+'-demo.html','text/html');});
$('share').addEventListener('click',async()=>{if(!current)return;const u=new URL(location.href);u.search='';u.hash='';for(const k of ['brand','topic','firm','start','variant','tier'])u.searchParams.set(k,current[k]);u.searchParams.set('location',current.geo.location);if(current.geo.radiusMiles)u.searchParams.set('radius',current.geo.radiusMiles);$('share-url').hidden=false;$('share-url').value=u.href;try{await navigator.clipboard.writeText(u.href);$('notice').textContent='Demo link copied. Anyone with it can view the entered business name and geography.';}catch{$('share-url').select();$('notice').textContent='Copy the link from the field below.';}});
$('pacing').addEventListener('submit',e=>{e.preventDefault();if(!current)return;try{const p=pacing(current,$('as-of').value,Math.round(Number($('actual').value)*100));$('pace-result').textContent=`Through day ${p.elapsedDays}: planned ${money(p.targetCents)}, entered actual ${money(p.actualCents)}. Remaining budget ${money(p.remainingCents)}. ${p.overspendCents?'Over budget by '+money(p.overspendCents)+'.':p.remainingDays+' days remain.'} Manual calculation only.`;}catch(e){$('pace-result').textContent=e.message;}});
for(const t of topics){const a=document.createElement('a');a.href='./'+t.id+'/';a.textContent=t.name;$('library').append(a);}
if(q.has('topic'))render();
