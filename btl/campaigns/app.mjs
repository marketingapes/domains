import {brands,topics,intakeModes,defaultClass} from './catalog.mjs';
import {createPlan,pacing} from './model.mjs';
import {renderIntakePage} from './pages.mjs';
const $=id=>document.getElementById(id), money=c=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(c/100);
let current;
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const q=new URLSearchParams(location.search);
for(const b of brands)$('brand').add(new Option(b.name,b.id));
for(const t of topics)$('topic').add(new Option(t.name,t.id));
$('brand').value=brands.some(b=>b.id===q.get('brand'))?q.get('brand'):document.body.dataset.brand;
$('topic').value=topics.some(t=>t.id===q.get('topic'))?q.get('topic'):'mva';
for(const key of ['firm','location','start','radius','campaignClass','excludedGeo','qualifies','disqualifies'])if(q.has(key))$(key).value=q.get(key).slice(0,$(key).maxLength>0?$(key).maxLength:100);
if(!$('start').value)$('start').value=new Date().toISOString().slice(0,10);
$('as-of').value=new Date().toISOString().slice(0,10);
function topicSettings(reset){
 const t=topics.find(t=>t.id===$('topic').value),isMva=t.id==='mva',isPi=t.id==='personal-injury';
 $('radius-wrap').hidden=!isMva;
 for(const o of $('campaignClass').options)o.hidden=(isMva?o.value!=='mva':isPi?o.value!=='personal_injury':['mva','personal_injury'].includes(o.value));
 if(reset||!$('campaignClass').value||$('campaignClass').selectedOptions[0]?.hidden)$('campaignClass').value=defaultClass(t.id);
 $('criteria-help').textContent=t.review;
 $('qualifies').placeholder='One confirmed requirement per line. Review: '+t.review;
}
$('topic').addEventListener('change',()=>{topicSettings(true);$('qualifies').value='';$('disqualifies').value='';$('notice').textContent='Campaign changed. Define the criteria for this topic.';});topicSettings(!q.has('campaignClass'));
function params(p){const result=new URLSearchParams();for(const k of ['brand','topic','firm','start','campaignClass'])result.set(k,p[k]);result.set('location',p.geo.location);result.set('excludedGeo',p.geo.excluded);result.set('qualifies',p.criteria.qualifies.join('\n'));result.set('disqualifies',p.criteria.disqualifies.join('\n'));if(p.geo.radiusMiles)result.set('radius',p.geo.radiusMiles);return result;}
function previewURL(p,mode){const u=new URL('./preview/',location.href);u.search=params(p).toString();u.searchParams.set('mode',mode);return u.href;}
function items(id,values){$(id).replaceChildren();for(const value of values.length?values:['Not yet defined']){const li=document.createElement('li');li.textContent=value;$(id).append(li);}}
function render(){try{
 const p=createPlan(Object.fromEntries(new FormData($('builder'))));current=p;$('error').textContent='';$('result').hidden=false;$('empty').hidden=true;
 document.documentElement.style.setProperty('--accent',brands.find(b=>b.id===p.brand).color);
 $('plan-title').textContent=(p.firm?p.firm+' · ':'')+p.title;$('scope').textContent=p.start+' → '+p.end+' · '+(p.geo.location||'Geography to confirm')+(p.geo.radiusMiles?' · '+p.geo.radiusMiles+'-mile radius':'');$('media').textContent=money(p.mediaCents);
 $('page-cards').replaceChildren();intakeModes.forEach((m,i)=>{const card=document.createElement('article');card.className='page-card';card.innerHTML=`<span class="number">PAGE 0${i+1}</span><h3>${esc(m.name)}</h3><p>${esc(m.description)}</p><div class="actions"></div>`;const actions=card.querySelector('.actions');const a=document.createElement('a');a.className='cta primary';a.href=previewURL(p,m.mode);a.target='_blank';a.rel='noopener noreferrer';a.textContent='Open '+m.name+' page';const dl=document.createElement('button');dl.className='cta';dl.textContent='Download '+m.name+' page';dl.addEventListener('click',()=>download(renderIntakePage(p,m.mode),p.id+'-'+m.mode+'.html','text/html'));actions.append(a,dl);$('page-cards').append(card);});
 items('qualifies-summary',p.criteria.qualifies);items('disqualifies-summary',p.criteria.disqualifies);$('geo-summary').textContent='Included: '+(p.geo.location||'Not yet set')+'. Excluded: '+(p.geo.excluded||'Not yet set')+'.';
 $('schedule').innerHTML=p.schedule.map(r=>`<tr><td>${r.day}</td><td>${r.date}</td><td>${money(r.budgetCents)}</td><td>${esc(r.task)}</td></tr>`).join('');
 $('requirements').innerHTML=p.launchRequirements.map(x=>`<li>${esc(x)}</li>`).join('');
 $('research').replaceChildren(document.createTextNode(p.qualificationReview+' '));if(p.research){const a=document.createElement('a');a.href=p.research;a.textContent='Court docket reference';a.target='_blank';a.rel='noopener noreferrer';$('research').append(a);}
 $('notice').textContent='Three page previews ready. Nothing has been submitted.';$('pace-result').textContent='';$('share-url').hidden=true;
}catch(e){current=null;$('error').textContent=e.message;$('result').hidden=true;$('empty').hidden=false;}}
$('builder').addEventListener('submit',e=>{e.preventDefault();render();});
$('builder').addEventListener('input',()=>{if(current){current=null;$('result').hidden=true;$('empty').hidden=false;}});
function download(contents,name,type){const u=URL.createObjectURL(new Blob([contents],{type})),a=document.createElement('a');a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);}
$('download').addEventListener('click',()=>{if(current)download(JSON.stringify(current,null,2),current.id+'.json','application/json');});
$('share').addEventListener('click',async()=>{if(!current)return;const u=new URL(location.href);u.search=params(current).toString();u.hash='';$('share-url').hidden=false;$('share-url').value=u.href;try{await navigator.clipboard.writeText(u.href);$('notice').textContent='Link copied. The entered business details and campaign criteria are visible to recipients.';}catch{$('share-url').select();$('notice').textContent='Copy the link from the field below.';}});
$('pacing').addEventListener('submit',e=>{e.preventDefault();if(!current)return;try{const p=pacing(current,$('as-of').value,Math.round(Number($('actual').value)*100));$('pace-result').textContent=`Through day ${p.elapsedDays}: planned ${money(p.targetCents)}, entered actual ${money(p.actualCents)}. Remaining budget ${money(p.remainingCents)}. ${p.overspendCents?'Over budget by '+money(p.overspendCents)+'.':p.remainingDays+' days remain.'} Manual calculation only.`;}catch(e){$('pace-result').textContent=e.message;}});
for(const t of topics){const a=document.createElement('a');a.href='./'+t.id+'/';a.textContent=t.name;$('library').append(a);}
if(q.has('topic'))render();
