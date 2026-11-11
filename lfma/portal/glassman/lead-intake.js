/* Captured intake is fetched on demand and kept only in the current view. */
(() => {
'use strict';
const receipt=/^BTLK-[0-9A-F]{10}$/;
const stamp=v=>typeof v==='string'&&!Number.isNaN(Date.parse(v))&&/T.*(?:Z|[+-]\d{2}:\d{2})$/.test(v);
const str=(v,n)=>typeof v==='string'&&v.length<=n;
function jsonValue(v,depth=0){
 if(depth>22)return false;
 if(v===null||typeof v==='boolean'||typeof v==='number'&&Number.isFinite(v))return true;
 if(typeof v==='string')return v.length<=200000;
 if(Array.isArray(v))return v.length<=10000&&v.every(x=>jsonValue(x,depth+1));
 return v&&typeof v==='object'&&Object.keys(v).length<=10000&&Object.entries(v).every(([k,x])=>str(k,1000)&&jsonValue(x,depth+1));
}
function valid(d,r){
 return d&&d.schema==='glassman.lead-intake/v1'&&d.campaign_id==='GLASSMAN-SSDI-002'&&d.receipt_id===r&&stamp(d.generated_at)&&stamp(d.received_at)&&str(d.source,200)&&typeof d.payload_sha256==='string'&&/^[a-fA-F0-9]{64}$/.test(d.payload_sha256)&&
 Array.isArray(d.groups)&&d.groups.length<=30&&d.groups.every(g=>g&&str(g.key,100)&&str(g.label,200)&&jsonValue(g.value))&&
 d.intake&&typeof d.intake==='object'&&!Array.isArray(d.intake)&&d.intake.campaign_id==='GLASSMAN-SSDI-002'&&jsonValue(d.intake)&&JSON.stringify(d.intake).length<=400000&&
 Number.isSafeInteger(d.omitted_fields)&&d.omitted_fields>=0&&str(d.coverage,4000);
}
window.GlassmanLeadIntake=function({request,getSession,getGeneration,canView,lock}){
 const el=id=>document.getElementById(id),node=(tag,text)=>{const n=document.createElement(tag);n.textContent=text;return n;};
 let version=0,selected=null;
 function clear(){version++;selected=null;el('intake-content').replaceChildren();el('intake-title').textContent='';el('intake-status').textContent='';el('lead-intake').hidden=true;}
 function current(v,g,r){return version===v&&g===getGeneration()&&!!getSession()&&canView()&&selected===r;}
 function value(v){return v===null?'Not captured (null)':v===false?'No (false)':v===true?'Yes (true)':v===''?'Empty text':String(v);}
 function fields(v,parent){
  if(v===null||typeof v!=='object'){parent.append(node('p',value(v)));return;}
  const entries=Object.entries(v);if(!entries.length){parent.append(node('p',Array.isArray(v)?'No captured items':'No captured fields'));return;}
  const dl=document.createElement('dl');for(const [k,x] of entries){const dd=document.createElement('dd');dl.append(node('dt',Array.isArray(v)?'Item '+(Number(k)+1):k.replaceAll('_',' ')),dd);fields(x,dd);}parent.append(dl);
 }
 async function open(lead){
  clear();if(!getSession()||!canView()||!receipt.test(lead?.receipt_id))return;
  const r=selected=lead.receipt_id,v=version,g=getGeneration();el('lead-intake').hidden=false;el('intake-title').textContent='Captured intake · '+r;el('intake-title').focus();el('intake-status').textContent='Loading captured intake…';
  try{const d=await request('/lead-intake/'+encodeURIComponent(r),null,getSession());if(!current(v,g,r))return;if(!valid(d,r))throw Error('Invalid intake');
   const content=el('intake-content');content.append(node('p',d.coverage),node('p','Received '+d.received_at+' · Source '+d.source));
   for(const group of d.groups){const section=document.createElement('section');section.append(node('h4',group.label));fields(group.value,section);content.append(section);}
   const raw=document.createElement('details');raw.append(node('summary','All captured fields (sanitized JSON)'),node('pre',JSON.stringify(d.intake,null,2)));content.append(raw,node('p','Original stored payload SHA-256: '+d.payload_sha256),node('p','Omitted fields: '+d.omitted_fields));
   el('intake-status').textContent='Loaded '+d.generated_at+'. The original stored payload hash is before display redaction.';
  }catch(e){if(!current(v,g,r))return;if(e.status===401||e.status===403){clear();lock();return;}el('intake-content').replaceChildren();el('intake-status').textContent=e.status===404?'Captured intake is unavailable for this lead.':'Intake could not be loaded. Close and reopen to retry.';}
 }
 el('intake-close').addEventListener('click',()=>{clear();el('lead-search').focus();});
 return {open,clear,reconcile:leads=>{if(selected&&!leads.some(l=>l.receipt_id===selected))clear();}};
};
})();
