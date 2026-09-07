import { buildPlan, exportPlan } from './planner.mjs?v=20260907-agency';
const form=document.getElementById('plan-form');
const status=document.getElementById('plan-status');
let currentPlan;
window.dataLayer=window.dataLayer||[];
const track=(event,extra={})=>window.dataLayer.push({event,tenant_id:'MA',domain:'marketingapes.com',page_version:'ma-agency-20260907',...extra});
track('ee_page_context');
document.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{
 if(a.dataset.goal){form.elements.goal.value=a.dataset.goal;}
 track(a.href.startsWith('tel:')?'ee_call_click':'ee_cta_click',{cta_id:a.dataset.goal||a.id||a.textContent.trim().slice(0,70)});
}));
function populateList(id,items){const list=document.getElementById(id);list.replaceChildren(...items.map(text=>{const li=document.createElement('li');li.textContent=text;return li;}));}
form.addEventListener('submit',event=>{
 event.preventDefault();if(!form.reportValidity())return;
 try{
 const values=Object.fromEntries(new FormData(form));currentPlan=buildPlan(values);
 document.getElementById('plan-title').textContent=currentPlan.title;
 document.getElementById('plan-summary').textContent=currentPlan.summary;
 document.getElementById('plan-first').textContent=currentPlan.firstStep;
 populateList('plan-weeks',currentPlan.weeks);populateList('plan-metrics',currentPlan.metrics);
 const message=exportPlan(currentPlan);
 document.getElementById('email-plan').href='mailto:kyleg@marketingapes.com?subject='+encodeURIComponent('Marketing Apes — let’s discuss my marketing and AI services')+'&body='+encodeURIComponent('Hi Kyle,\n\nMy business/domain: \nMy name: \nBest way to reach me: \n\nI’d like to discuss this starter plan:\n\n'+message);
 document.getElementById('plan-empty').hidden=true;const result=document.getElementById('plan-result');result.hidden=false;result.focus({preventScroll:true});
 status.textContent='Your plan is ready. Download it, copy it, or open an email to Kyle.';
 if(window.innerWidth<761)result.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});
 track('ee_plan_generated',{goal:values.goal,industry:values.industry,stage:values.stage});
 }catch{status.textContent='Please choose a business type, a priority, and a starting point.';}
});
document.getElementById('download-plan').addEventListener('click',()=>{
 if(!currentPlan)return;const url=URL.createObjectURL(new Blob([exportPlan(currentPlan)],{type:'text/plain;charset=utf-8'}));
 const a=document.createElement('a');a.href=url;a.download='marketing-apes-system-plan.txt';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);track('ee_plan_download');
});
document.getElementById('copy-plan').addEventListener('click',async()=>{
 if(!currentPlan)return;
 try{await navigator.clipboard.writeText(exportPlan(currentPlan));status.textContent='Plan copied. You can paste it into an email or document.';track('ee_plan_copy');}
 catch{status.textContent='Clipboard access is unavailable. Use Download plan to save a copy.';}
});
